<?php

namespace App\Http\Controllers;

use App\Models\Approval;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\User;
use App\Workflow\ApprovalService;
use App\Workflow\Events\ApprovalRequested;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    public function __construct(private ApprovalService $approvals) {}

    public function index(Request $request): Response
    {
        $documents = Document::query()
            ->with(['department:id,name', 'owner:id,name'])
            ->when($request->q, fn ($q, $s) => $q->where(fn ($qq) => $qq
                ->where('code', 'like', "%{$s}%")
                ->orWhere('title', 'like', "%{$s}%")))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->department, fn ($q, $d) => $q->where('department_id', $d))
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('documents/index', [
            'documents'   => $documents,
            'filters'     => $request->only(['q', 'type', 'status', 'department']),
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'users'       => $this->approverList(),
        ]);
    }

    public function show(Document $document): Response
    {
        $document->load([
            'department', 'owner', 'versions.author', 'approvals.approver',
            'preparedBy', 'reviewedBy', 'reviewedByTwo', 'approvedBy', 'documentControl',
        ]);

        return Inertia::render('documents/show', [
            'document'    => $document,
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'users'       => $this->approverList(),
        ]);
    }

    private function approverList()
    {
        return User::select('id', 'name', 'email', 'position', 'signature_path', 'stamp_path')
            ->with('roles:id,name')
            ->where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => [
                'id'            => $u->id,
                'name'          => $u->name,
                'email'         => $u->email,
                'position'      => $u->position,
                'signature_url' => $u->signature_path ? Storage::url($u->signature_path) : null,
                'stamp_url'     => $u->stamp_path     ? Storage::url($u->stamp_path)     : null,
                'roles'         => $u->roles->pluck('name')->values(),
            ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateData($request);

        $doc = DB::transaction(function () use ($data, $request) {
            $payload = collect($data)->except(['file', 'flowchart', 'new_images'])->toArray();
            $payload['owner_id']         = $request->user()->id;
            $payload['status']           = Document::STATUS_DRAFT;
            $payload['current_revision'] = $data['current_revision'] ?? '1.0';

            if ($request->hasFile('flowchart')) {
                $payload['flowchart_path'] = $request->file('flowchart')->store('flowcharts', 'public');
            }

            $payload['section_images'] = $this->processSectionImages($request, $data['section_images'] ?? []);

            $doc = Document::create($payload);

            if ($request->hasFile('file')) {
                $this->storeVersion($doc, $request->file('file'), $doc->current_revision, $request->user()->id, 'Initial upload');
            }

            return $doc;
        });

        return redirect()->route('documents.show', $doc)
            ->with('flash.success', "Document {$doc->code} created.");
    }

    /**
     * Upload an already-approved archived document directly — no approval workflow.
     * Restricted to Document Control and Administrator (super_admin).
     */
    public function archiveStore(Request $request): RedirectResponse
    {
        abort_unless(
            $request->user()->hasAnyRole(['document_control', 'super_admin']),
            403,
            'Hanya Document Control & Administrator yang boleh mengunggah arsip dokumen.',
        );

        $allowedStandards = ['iso_9001', 'iso_14001', 'iso_45001', 'iatf', 'internal'];

        $revision = (string) ($request->input('current_revision') ?: '00');

        $data = $request->validate([
            'code'             => ['required', 'string', 'max:64',
                Rule::unique('documents', 'code')->where(fn ($q) => $q->where('current_revision', $revision))],
            'title'            => ['required', 'string', 'max:255'],
            'type'             => ['required', 'in:policy,manual,sop,work_instruction,form,record,other,anti_bribery'],
            'standards'        => ['required', 'array', 'min:1'],
            'standards.*'      => ['in:'.implode(',', $allowedStandards)],
            'department_id'    => ['nullable', 'exists:departments,id'],
            'description'      => ['nullable', 'string', 'max:5000'],
            'effective_date'   => ['nullable', 'date'],
            'next_review_date' => ['nullable', 'date', 'after_or_equal:effective_date'],
            'current_revision' => ['required', 'string', 'max:16'],
            'file'             => ['required', 'file', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg', 'max:20480'],
        ], [
            'code.unique' => 'Kombinasi Kode Dokumen + Revisi ini sudah ada. Gunakan revisi yang berbeda.',
        ]);

        $doc = DB::transaction(function () use ($data, $request) {
            $user = $request->user();
            $isDocControl = $user->hasRole('document_control');

            $doc = Document::create([
                ...collect($data)->except(['file'])->toArray(),
                'standard'                => $data['standards'][0],
                'owner_id'                => $user->id,
                'status'                  => Document::STATUS_PUBLISHED,
                'current_revision'        => $data['current_revision'] ?? '1.0',
                // Mark as already-controlled so it renders as a valid (sah) archived document.
                'document_control_user_id'=> $isDocControl ? $user->id : null,
                'doc_control_approved_at' => now(),
            ]);

            $this->storeVersion($doc, $request->file('file'), $doc->current_revision, $user->id, 'Arsip dokumen (upload langsung)');

            return $doc;
        });

        return redirect()->route('documents.show', $doc)
            ->with('flash.success', "Arsip dokumen {$doc->code} berhasil diunggah (tanpa approval).");
    }

    public function update(Request $request, Document $document): RedirectResponse
    {
        $data = $this->validateData($request, $document->id);

        DB::transaction(function () use ($data, $document, $request) {
            $payload = collect($data)->except(['file', 'flowchart', 'new_images'])->toArray();

            if ($request->hasFile('flowchart')) {
                if ($document->flowchart_path) {
                    Storage::disk('public')->delete($document->flowchart_path);
                }
                $payload['flowchart_path'] = $request->file('flowchart')->store('flowcharts', 'public');
            }

            // Merge kept + newly uploaded section images, then prune files dropped by the user.
            $newImages = $this->processSectionImages($request, $data['section_images'] ?? []);
            $oldPaths  = collect($document->section_images ?? [])->flatten()->filter()->all();
            $keptPaths = collect($newImages)->flatten()->filter()->all();
            foreach (array_diff($oldPaths, $keptPaths) as $removed) {
                Storage::disk('public')->delete($removed);
            }
            $payload['section_images'] = $newImages;

            $document->update($payload);

            if ($request->hasFile('file')) {
                $newRev = $this->nextRevision($document->current_revision);
                $this->storeVersion($document, $request->file('file'), $newRev, $request->user()->id, $data['change_summary'] ?? null);
                $document->update(['current_revision' => $newRev]);
            }
        });

        return back()->with('flash.success', "Document {$document->code} updated.");
    }

    public function destroy(Document $document): RedirectResponse
    {
        $document->delete();    // soft delete

        return redirect()->route('documents.index')
            ->with('flash.success', "Document {$document->code} deleted.");
    }

    public function submit(Request $request, Document $document): RedirectResponse
    {
        if (!$document->reviewed_by_user_id || !$document->approved_by_user_id || !$document->document_control_user_id) {
            return back()->with('flash.error', 'Lengkapi Peninjau, Penyetuju, dan Document Control sebelum submit.');
        }

        DB::transaction(function () use ($document) {
            $document->approvals()->delete();

            // Build levels: reviewer (+ optional 2nd reviewer) → approver → document control.
            $levels = [
                ['role' => 'reviewer', 'user_id' => $document->reviewed_by_user_id],
            ];
            if ($document->reviewed_by_2_user_id) {
                $levels[] = ['role' => 'reviewer_2', 'user_id' => $document->reviewed_by_2_user_id];
            }
            $levels[] = ['role' => 'approver',         'user_id' => $document->approved_by_user_id];
            $levels[] = ['role' => 'document_control', 'user_id' => $document->document_control_user_id];

            foreach ($levels as $i => $lvl) {
                Approval::create([
                    'approvable_type' => $document->getMorphClass(),
                    'approvable_id'   => $document->id,
                    'level'           => $i + 1,
                    'role_required'   => $lvl['role'],
                    'approver_id'     => $lvl['user_id'],
                    'status'          => Approval::STATUS_PENDING,
                ]);
            }

            $document->forceFill([
                'status'                  => Document::STATUS_IN_REVIEW,
                'reviewed_at'             => null,
                'reviewed_2_at'           => null,
                'approved_at'             => null,
                'doc_control_approved_at' => null,
            ])->save();

            if ($first = $document->currentApproval()) {
                event(new ApprovalRequested($first));
            }
        });

        return back()->with('flash.success', 'Document submitted — Peninjau, Penyetuju, dan Document Control akan menerima notifikasi.');
    }

    public function previewPdf(Request $request, Document $document): HttpResponse
    {
        $document->load([
            'department', 'owner', 'versions.author', 'approvals.approver',
            'preparedBy', 'reviewedBy', 'reviewedByTwo', 'approvedBy', 'documentControl',
        ]);

        $pdf = Pdf::loadView('documents.procedure-pdf', [
            'document' => $document,
        ])->setPaper('a4')->setOption('isRemoteEnabled', true);

        // Render page numbers as a post-render canvas overlay (X / Y on every page).
        $dompdf = $pdf->getDomPDF();
        $dompdf->render();
        $canvas = $dompdf->getCanvas();
        $canvas->page_text(
            $canvas->get_width() - 60,
            $canvas->get_height() - 25,
            'Hal: {PAGE_NUM}/{PAGE_COUNT}',
            null,
            9,
            [0, 0, 0]
        );

        $inline = $request->boolean('download') ? 'attachment' : 'inline';
        return $pdf->stream("{$document->code}.pdf", ['Attachment' => $inline === 'attachment']);
    }

    private function validateData(Request $request, ?int $ignoreId = null): array
    {
        $allowedStandards = ['iso_9001', 'iso_14001', 'iso_45001', 'iatf', 'internal'];

        $revision = (string) ($request->input('current_revision') ?: '00');

        $data = $request->validate([
            // Same code is allowed as long as the revision differs (unique per code+revision).
            'code'             => ['required', 'string', 'max:64',
                Rule::unique('documents', 'code')
                    ->where(fn ($q) => $q->where('current_revision', $revision))
                    ->ignore($ignoreId)],
            'title'            => ['required', 'string', 'max:255'],
            'type'             => ['required', 'in:policy,manual,sop,work_instruction,form,record,other,anti_bribery'],
            'standards'        => ['required', 'array', 'min:1'],
            'standards.*'      => ['in:'.implode(',', $allowedStandards)],
            'department_id'    => ['nullable', 'exists:departments,id'],
            'description'      => ['nullable', 'string', 'max:5000'],
            'effective_date'   => ['nullable', 'date'],
            'next_review_date' => ['nullable', 'date', 'after_or_equal:effective_date'],
            'current_revision' => ['required', 'string', 'max:16'],
            'change_summary'   => ['nullable', 'string', 'max:1000'],
            'file'             => ['nullable', 'file', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg', 'max:20480'],

            // SOP body
            'purpose'                => ['nullable', 'string', 'max:5000'],
            'scope'                  => ['nullable', 'string', 'max:5000'],
            'references_list'        => ['nullable', 'array'],
            'references_list.*'      => ['string', 'max:500'],
            // ISO clauses grouped per standard: { iso_9001: ['7.5.3', ...] }
            'iso_clauses'            => ['nullable', 'array'],
            'iso_clauses.*'          => ['array'],
            'iso_clauses.*.*'        => ['nullable', 'string', 'max:100'],
            // Sections D–G are recursive outline trees ({ text, children: [...] }).
            // Depth is arbitrary, so we validate the top-level shape only.
            'definitions'            => ['nullable', 'array'],
            'responsibilities'       => ['nullable', 'array'],
            'procedure_steps'        => ['nullable', 'array'],
            'related_documents'      => ['nullable', 'array'],

            // Per-section image attachments (sections D–G). `section_images` holds the
            // existing paths the user kept; `new_images` carries freshly uploaded files.
            'section_images'         => ['nullable', 'array'],
            'section_images.*'       => ['nullable', 'array'],
            'section_images.*.*'     => ['nullable', 'string', 'max:255'],
            'new_images'             => ['nullable', 'array'],
            'new_images.*'           => ['nullable', 'array'],
            'new_images.*.*'         => ['image', 'mimes:png,jpg,jpeg', 'max:5120'],

            // Manual revision history (rendered on page 1 of the procedure PDF).
            'revision_history'           => ['nullable', 'array'],
            'revision_history.*.revision'=> ['nullable', 'string', 'max:32'],
            'revision_history.*.date'    => ['nullable', 'string', 'max:64'],
            'revision_history.*.summary' => ['nullable', 'string', 'max:1000'],
            'revision_history.*.page'    => ['nullable', 'string', 'max:16'],
            'revision_history.*.mr'      => ['nullable', 'string', 'max:120'],

            // Signature block — names kept as override / fallback; user_id is the canonical link.
            'prepared_by_user_id' => ['nullable', 'exists:users,id'],
            'prepared_by_name'    => ['nullable', 'string', 'max:120'],
            'prepared_by_date'    => ['nullable', 'date'],
            'reviewed_by_user_id' => ['nullable', 'exists:users,id'],
            'reviewed_by_name'    => ['nullable', 'string', 'max:120'],
            'reviewed_by_date'    => ['nullable', 'date'],
            'reviewed_by_2_user_id' => ['nullable', 'exists:users,id', 'different:reviewed_by_user_id'],
            'reviewed_by_2_name'    => ['nullable', 'string', 'max:120'],
            'reviewed_by_2_date'    => ['nullable', 'date'],
            'approved_by_user_id' => ['nullable', 'exists:users,id'],
            'approved_by_name'    => ['nullable', 'string', 'max:120'],
            'approved_by_date'    => ['nullable', 'date'],
            'document_control_user_id' => ['nullable', 'exists:users,id'],

            // Flowchart image
            'flowchart' => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:5120'],
        ], [
            'code.unique' => 'Kombinasi Kode Dokumen + Revisi ini sudah ada. Gunakan revisi yang berbeda.',
        ]);

        // Primary `standard` enum mirrors the first selected ISO (legacy column).
        $data['standard'] = $data['standards'][0];

        return $data;
    }

    private function storeVersion(Document $doc, UploadedFile $file, string $revision, int $userId, ?string $summary): void
    {
        // Mark previous current as not-current
        $doc->versions()->update(['is_current' => false]);

        $path = $file->store("documents/{$doc->id}", 'public');

        DocumentVersion::create([
            'document_id'    => $doc->id,
            'revision'       => $revision,
            'file_path'      => $path,
            'file_name'      => $file->getClientOriginalName(),
            'file_size'      => $file->getSize(),
            'mime_type'      => $file->getMimeType(),
            'checksum'       => hash_file('sha256', $file->getRealPath()),
            'change_summary' => $summary,
            'created_by'     => $userId,
            'is_current'     => true,
        ]);
    }

    /**
     * Build the final section_images map by combining the existing paths the user
     * kept ($kept) with any newly uploaded files (request field `new_images[<sec>][]`).
     * Only sections D–G carry images.
     *
     * @param  array<string, array<int, string>>  $kept
     * @return array<string, array<int, string>>
     */
    private function processSectionImages(Request $request, array $kept): array
    {
        $result = [];
        foreach (['D', 'E', 'F', 'G'] as $s) {
            $paths = array_values(array_filter(
                $kept[$s] ?? [],
                fn ($p) => is_string($p) && $p !== '',
            ));

            foreach ((array) $request->file("new_images.$s", []) as $file) {
                if ($file) {
                    $paths[] = $file->store('documents/section-images', 'public');
                }
            }

            if (! empty($paths)) {
                $result[$s] = $paths;
            }
        }

        return $result;
    }

    private function nextRevision(string $current): string
    {
        if (! str_contains($current, '.')) {
            return $current.'.1';
        }
        [$major, $minor] = explode('.', $current, 2);
        return $major.'.'.((int) $minor + 1);
    }
}
