<?php

namespace App\Http\Controllers;

use App\Models\Audit;
use App\Models\AuditFinding;
use App\Models\Department;
use App\Models\User;
use App\Notifications\Audit\FindingApprovalRequestedNotification;
use App\Support\Notify;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AuditFindingController extends Controller
{
    public function show(Audit $audit, AuditFinding $finding): Response
    {
        abort_unless($finding->audit_id === $audit->id, 404);
        $finding->load(['owner.department', 'owner:id,name,department_id,phone', 'auditor:id,name,phone', 'approver:id,name,phone', 'verifier:id,name,phone', 'audit:id,code,title,department_id,lead_auditor_id,actual_lead_auditor_id', 'audit.department:id,name', 'audit.leadAuditor:id,name,phone', 'audit.actualLeadAuditor:id,name,phone', 'events.user:id,name']);

        $user = auth()->user();

        return Inertia::render('audits/finding-show', [
            'audit'   => $audit,
            'finding' => $finding,
            'users'   => User::select('id', 'name', 'department_id')->where('status', 'active')->orderBy('name')->get(),
            // Gate di bawah memakai helper yang sama persis dengan aksi POST-nya,
            // supaya tombol yang tampil tidak pernah berbeda dari yang diizinkan server.
            'canApprove'        => $this->isApprover($user, $finding),
            // Verifikasi tahap auditor: pembuat temuan (atau lead auditor sebagai fallback).
            'canAuditorVerify'  => $this->isVerifyingAuditor($user, $finding, $audit),
            'canLeadVerify'     => $this->isLeadAuditor($user, $audit),
            // Hanya auditee (PIC temuan) yang boleh mengisi & submit tindakan perbaikan.
            'canSubmitAction'   => $this->isAuditee(auth()->user(), $finding),
            // Tombol "Ingatkan via WhatsApp" (wa.me) — target PIC sesuai giliran status.
            'waReminder'        => $this->buildWaReminder($finding),
            // Auditor boleh edit/hapus temuan selama auditee belum submit tindakan perbaikan.
            'canEditFinding'    => $this->isAuditor(auth()->user(), $audit) && ! $finding->submitted_at,
        ]);
    }

    /**
     * Simpan berkas bukti dengan mempertahankan nama asli yang diunggah, supaya label
     * di halaman temuan sama dengan nama file di komputer pengunggah. Sebelumnya dipakai
     * store() yang memberi nama hash acak sehingga bukti sulit dikenali.
     *
     * Nama dibersihkan lewat Str::slug (buang spasi/karakter tak aman yang bisa merusak
     * URL /storage) dan diberi akhiran acak pendek bila namanya sudah terpakai di folder
     * yang sama, agar unggahan berbeda tidak saling menimpa.
     */
    private function storeEvidence(\Illuminate\Http\UploadedFile $file, string $dir): string
    {
        $ext  = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $base = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safe = Str::limit(Str::slug($base), 80, '') ?: 'bukti';

        $name = $ext ? "{$safe}.{$ext}" : $safe;

        if (Storage::disk('public')->exists("{$dir}/{$name}")) {
            $suffix = Str::lower(Str::random(6));
            $name   = $ext ? "{$safe}-{$suffix}.{$ext}" : "{$safe}-{$suffix}";
        }

        return $file->storeAs($dir, $name, 'public');
    }

    /**
     * Susun data reminder WhatsApp (wa.me) untuk PIC yang gilirannya sesuai status temuan.
     * Mengembalikan null bila tidak ada aksi tertunda (mis. sudah closed).
     */
    private function buildWaReminder(AuditFinding $finding): ?array
    {
        $audit = $finding->audit;

        $map = match ($finding->status) {
            AuditFinding::STATUS_OPEN,
            AuditFinding::STATUS_IN_PROGRESS,
            AuditFinding::STATUS_REJECTED               => [$finding->owner,         'Auditee (PIC)',   'mengisi & submit tindakan perbaikan'],
            AuditFinding::STATUS_WAITING_APPROVAL       => [$finding->approver,      'Atasan Auditee',  'meninjau & menyetujui tindakan perbaikan'],
            AuditFinding::STATUS_WAITING_AUDITOR_VERIFICATION => [$finding->auditor, 'Auditor',         'memverifikasi tindakan perbaikan'],
            AuditFinding::STATUS_WAITING_VERIFICATION   => [$audit->effectiveLeadAuditor(), 'Lead Auditor', 'melakukan verifikasi final & menutup temuan'],
            default                                     => null,
        };

        if (! $map) {
            return null;
        }
        [$user, $role, $action] = $map;

        if (! $user) {
            return ['role' => $role, 'targetName' => null, 'url' => null, 'reason' => 'user_missing'];
        }

        $phone = \App\Notifications\Channels\FonnteChannel::normalize($user->phone ?? null);
        if (! $phone) {
            return ['role' => $role, 'targetName' => $user->name, 'url' => null, 'reason' => 'no_phone'];
        }

        $cat  = ['opportunity' => 'PFI', 'minor_nc' => 'Minor NC', 'major_nc' => 'Major NC'][$finding->category] ?? $finding->category;
        $link = route('audits.findings.show', [$audit, $finding]);

        $msg = "Halo *{$user->name}*,\n\n"
            ."Mohon tindak lanjut temuan audit berikut sebagai *{$role}*:\n\n"
            ."🔖 Ref: *{$finding->reference}*\n"
            ."🏷️ Kategori: {$cat}".($finding->clause ? " · Klausul {$finding->clause}" : '')."\n"
            ."📋 ".\Illuminate\Support\Str::limit($finding->description, 130)."\n\n"
            ."🎯 Mohon {$action}.\n\n"
            ."Buka: {$link}\n\n"
            ."_Pesan dari QMS BONECOM TRICOM_";

        return [
            'role'       => $role,
            'targetName' => $user->name,
            'reason'     => null,
            'url'        => 'https://wa.me/'.$phone.'?text='.rawurlencode($msg),
        ];
    }

    /**
     * Auditor untuk sebuah audit = Lead Auditor atau anggota tim audit, memakai
     * auditor PELAKSANA (aktual bila sudah dicatat, selain itu rencana). Dengan
     * begitu auditor pengganti langsung berwenang menginput temuan sementara
     * auditor yang digantikan tidak lagi — sama seperti gate `canAddFinding`
     * di AuditController::show. (super_admin selalu boleh)
     */
    private function isAuditor(?User $user, Audit $audit): bool
    {
        if (! $user) {
            return false;
        }

        return in_array($user->id, $audit->effectiveAuditorIds(), true)
            || $user->hasRole('super_admin');
    }

    /**
     * Atasan yang berwenang approve/reject tindakan perbaikan = approver yang
     * ditetapkan saat temuan dibuat, atau manajer departemen auditee saat ini
     * (dipakai sebagai fallback bila manajer berganti setelah temuan dibuat).
     */
    private function isApprover(?User $user, AuditFinding $finding): bool
    {
        if (! $user) {
            return false;
        }

        return in_array($user->id, array_filter([
            $finding->approver_id,
            $finding->owner?->department?->manager_id,
        ]), true) || $user->hasRole('super_admin');
    }

    /** Verifikasi tahap auditor = auditor pembuat temuan, fallback Lead Auditor pelaksana. */
    private function isVerifyingAuditor(?User $user, AuditFinding $finding, Audit $audit): bool
    {
        if (! $user) {
            return false;
        }

        return in_array($user->id, array_filter([
            $finding->auditor_id,
            $audit->effectiveLeadAuditorId(),
        ]), true) || $user->hasRole('super_admin');
    }

    /** Verifikasi final & penutupan temuan = Lead Auditor PELAKSANA saja. */
    private function isLeadAuditor(?User $user, Audit $audit): bool
    {
        if (! $user) {
            return false;
        }

        $leadId = $audit->effectiveLeadAuditorId();

        return ($leadId !== null && $user->id === $leadId) || $user->hasRole('super_admin');
    }

    /** Auditee untuk sebuah temuan = PIC temuan / finding owner (super_admin selalu boleh). */
    private function isAuditee(?User $user, AuditFinding $finding): bool
    {
        if (! $user) {
            return false;
        }

        return $user->id === $finding->finding_owner_id
            || $user->hasRole('super_admin');
    }

    public function store(Request $request, Audit $audit): RedirectResponse
    {
        // Hanya auditor (Lead Auditor atau anggota tim audit) yang boleh menambah temuan.
        abort_unless($this->isAuditor($request->user(), $audit), 403, 'Hanya auditor (Lead Auditor atau tim audit) yang dapat menambah temuan.');

        $data = $request->validate([
            'category'         => ['required', 'in:major_nc,minor_nc,opportunity'],
            'clause'           => ['required', 'string', 'max:32'],
            'description'      => ['required', 'string', 'max:5000'],
            'evidence'         => ['nullable', 'string', 'max:5000'],
            'finding_owner_id' => ['required', 'exists:users,id'],
            'due_date'         => ['required', 'date'],
            'evidence_files'   => ['nullable', 'array'],
            'evidence_files.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:20480'],
        ]);

        $files = collect($request->file('evidence_files') ?? [])
            ->map(fn ($f) => $this->storeEvidence($f, "audit-findings/{$audit->id}/evidence"))
            ->all();

        $owner   = User::find($data['finding_owner_id']);
        $manager = $owner?->department?->manager_id;

        $isPfi = $data['category'] === AuditFinding::CAT_PFI;

        $finding = $audit->findings()->create([
            'category'          => $data['category'],
            'clause'            => $data['clause'] ?? null,
            'description'       => $data['description'],
            'evidence'          => $data['evidence'] ?? null,
            'evidence_files'    => $files ?: null,
            'finding_owner_id'  => $data['finding_owner_id'],
            // Auditor = pembuat temuan (dipakai untuk tahap verifikasi auditor).
            'auditor_id'        => auth()->id(),
            // PFI tidak perlu approval atasan; Minor/Major approver = manajer auditee.
            'approver_id'       => $isPfi ? null : $manager,
            // Verifikator final = Lead Auditor pelaksana (aktual bila ada).
            'verifier_id'       => $audit->effectiveLeadAuditorId(),
            'due_date'          => $data['due_date'] ?? null,
            'reference'         => sprintf('%s/F-%03d', $audit->code, $audit->findings()->count() + 1),
            'status'            => AuditFinding::STATUS_OPEN,
        ]);

        $finding->recordEvent('created', null, 'auditor');

        Notify::to(
            User::find($finding->finding_owner_id),
            'Temuan audit baru untuk Anda',
            "{$finding->reference}: ".Str::limit($finding->description, 90),
            route('audits.findings.show', [$audit, $finding], false),
            'action'
        );

        return redirect()->route('audits.findings.show', [$audit, $finding])
            ->with('flash.success', "Finding {$finding->reference} created.");
    }

    public function update(Request $request, Audit $audit, AuditFinding $finding): RedirectResponse
    {
        abort_unless($finding->audit_id === $audit->id, 404);
        // Auditor boleh mengubah temuan selama auditee BELUM submit tindakan perbaikan.
        abort_unless(
            $this->isAuditor($request->user(), $audit) && ! $finding->submitted_at,
            403,
            'Temuan hanya dapat diubah oleh auditor selama auditee belum submit tindakan perbaikan.'
        );

        $data = $request->validate([
            'category'         => ['required', 'in:major_nc,minor_nc,opportunity'],
            'clause'           => ['required', 'string', 'max:32'],
            'description'      => ['required', 'string', 'max:5000'],
            'evidence'         => ['nullable', 'string', 'max:5000'],
            'finding_owner_id' => ['required', 'exists:users,id'],
            'due_date'         => ['required', 'date'],
            'evidence_files'   => ['nullable', 'array'],
            'evidence_files.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:20480'],
        ]);

        // Approver (atasan) mengikuti manajer departemen auditee terpilih.
        $manager = User::find($data['finding_owner_id'])?->department?->manager_id;

        // Tambahkan evidence baru ke yang sudah ada (tidak menghapus yang lama).
        $files = collect($finding->evidence_files ?? [])->all();
        foreach ($request->file('evidence_files') ?? [] as $f) {
            $files[] = $this->storeEvidence($f, "audit-findings/{$audit->id}/evidence");
        }

        $finding->update([
            'category'         => $data['category'],
            'clause'           => $data['clause'],
            'description'      => $data['description'],
            'evidence'         => $data['evidence'] ?? null,
            'finding_owner_id' => $data['finding_owner_id'],
            'due_date'         => $data['due_date'],
            'approver_id'      => $data['category'] === AuditFinding::CAT_PFI ? null : $manager,
            'evidence_files'   => $files ?: null,
        ]);

        return back()->with('flash.success', "Temuan {$finding->reference} diperbarui.");
    }

    /**
     * Auditee submits corrective (+ preventive) action.
     *  - PFI       : tanpa root cause / preventive → langsung ke verifikasi auditor (skip approval atasan).
     *  - Minor/Major: wajib root cause (3–5) + corrective + preventive → menunggu approval atasan.
     */
    public function submitAction(Request $request, Audit $audit, AuditFinding $finding): RedirectResponse
    {
        abort_unless($finding->audit_id === $audit->id, 404);

        // Hanya auditee (PIC temuan) yang boleh mengisi & submit tindakan perbaikan.
        abort_unless($this->isAuditee($request->user(), $finding), 403, 'Hanya auditee (PIC temuan) yang dapat mengisi & submit tindakan perbaikan.');

        $requiresApproval = $finding->requiresApproval(); // minor/major

        // Due date TIDAK diterima dari auditee — mengikuti due date yang ditetapkan auditor.
        $rules = [
            'corrective_action'                  => ['required', 'string', 'max:5000'],
            'action_evidence_files'              => ['nullable', 'array'],
            'action_evidence_files.*'            => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:20480'],
        ];

        if ($requiresApproval) {
            // Root cause: minimal 3 wajib diisi, maksimal 5 (baris ke-4 & ke-5 opsional).
            $rules['root_causes']    = ['required', 'array', 'max:5'];
            $rules['root_causes.*']  = ['nullable', 'string', 'max:2000'];
            $rules['preventive_action'] = ['required', 'string', 'max:5000'];
            $rules['preventive_action_evidence_files']   = ['nullable', 'array'];
            $rules['preventive_action_evidence_files.*'] = ['file', 'mimes:jpg,jpeg,png,pdf', 'max:20480'];
        }

        $data = $request->validate($rules);

        // Minimal 3 akar masalah non-kosong (baris 1–3 wajib).
        if ($requiresApproval) {
            $rcFilled = array_values(array_filter(array_map('trim', $data['root_causes'] ?? []), fn ($x) => $x !== ''));
            if (count($rcFilled) < 3) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'root_causes' => 'Minimal 3 akar masalah (Root Cause) wajib diisi.',
                ]);
            }
        }

        // Merge new corrective-evidence files with any already stored.
        $caFiles = collect($finding->action_evidence_files ?? [])->all();
        foreach ($request->file('action_evidence_files') ?? [] as $file) {
            $caFiles[] = $this->storeEvidence($file, "audit-findings/{$audit->id}/actions");
        }

        // Preventive-action evidence (minor/major only). Sengaja TETAP opsional:
        // bukti pencegahan kerap baru ada beberapa waktu setelah tindakan
        // dijalankan. Mewajibkannya hanya akan memancing lampiran asal-asalan;
        // auditor tetap bisa meminta revisi bila menilai buktinya kurang.
        $paFiles = collect($finding->preventive_action_evidence_files ?? [])->all();
        foreach ($request->file('preventive_action_evidence_files') ?? [] as $file) {
            $paFiles[] = $this->storeEvidence($file, "audit-findings/{$audit->id}/preventive");
        }

        // Bukti corrective action WAJIB — dan diperiksa SETELAH merge, bukan
        // lewat rule `required`, supaya submit ulang pasca-revisi tetap sah
        // dengan bukti yang sudah tersimpan (auditee tidak dipaksa unggah ulang).
        //
        // Tanpa penjaga ini submit tanpa lampiran lolos diam-diam dan temuan
        // maju ke tahap approval tanpa bukti apa pun — persis yang terjadi pada
        // temuan #83/#85/#86 audit 31 (submit 6 Agu 2026, tiga kolom bukti NULL).
        // Ini satu-satunya lapis yang tidak bisa dilewati dari sisi browser.
        if (empty($caFiles)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'action_evidence_files' => 'Minimal 1 bukti corrective action wajib dilampirkan (JPG/PNG/PDF, maks 20 MB per berkas).',
            ]);
        }

        DB::transaction(function () use ($finding, $data, $caFiles, $paFiles, $requiresApproval) {
            $patch = [
                'corrective_action'     => $data['corrective_action'],
                'action_evidence_files' => $caFiles ?: null,
                // due_date tetap = yang ditetapkan auditor (tidak diubah auditee).
                'submitted_at'          => now(),
                // Minor/Major → approval atasan; PFI → langsung verifikasi auditor.
                'status'                => $requiresApproval
                    ? AuditFinding::STATUS_WAITING_APPROVAL
                    : AuditFinding::STATUS_WAITING_AUDITOR_VERIFICATION,
            ];

            if ($requiresApproval) {
                $patch['root_causes']       = array_values(array_filter(
                    array_map('trim', $data['root_causes']),
                    fn ($x) => $x !== '',
                ));
                $patch['preventive_action'] = $data['preventive_action'];
                $patch['preventive_action_evidence_files'] = $paFiles ?: null;
            }

            $finding->update($patch);
        });

        // Jejak jumlah bukti yang BENAR-BENAR diterima server pada submit ini —
        // bukan yang diklaim terkirim oleh browser.
        $finding->recordEvent('submitted', null, 'auditee', [
            'action_evidence_count'     => count($caFiles),
            'preventive_evidence_count' => count($paFiles),
            'files_received'            => count($request->file('action_evidence_files') ?? [])
                + count($request->file('preventive_action_evidence_files') ?? []),
        ]);

        $findingUrl = route('audits.findings.show', [$audit, $finding], false);
        if ($requiresApproval) {
            Notify::to(User::find($finding->approver_id), 'Perlu persetujuan Anda',
                "{$finding->reference}: tindakan perbaikan disubmit auditee, menunggu approval atasan.", $findingUrl, 'action');
        } else {
            Notify::to(User::find($finding->auditor_id), 'Perlu verifikasi Anda',
                "{$finding->reference}: PFI disubmit auditee, menunggu verifikasi auditor.", $findingUrl, 'action');
        }

        if ($requiresApproval && $finding->approver) {
            try {
                Notification::send([$finding->approver], new FindingApprovalRequestedNotification($finding));
                FindingApprovalRequestedNotification::log($finding, [$finding->approver->email]);
            } catch (\Throwable $e) {
                // logged via AuditNotification.error path in production refinement
            }
        }

        return back()->with('flash.success', 'Tindakan perbaikan dikirim.');
    }

    /** Atasan approve / reject / minta revisi */
    public function approve(Request $request, Audit $audit, AuditFinding $finding): RedirectResponse
    {
        abort_unless($finding->audit_id === $audit->id, 404);
        abort_unless($finding->status === AuditFinding::STATUS_WAITING_APPROVAL, 422, 'Bukan dalam status waiting_approval.');
        // Hanya atasan auditee yang boleh menyetujui tindakan perbaikan.
        abort_unless($this->isApprover($request->user(), $finding), 403, 'Hanya atasan auditee yang dapat menyetujui tindakan perbaikan.');

        $note = $request->validate(['note' => ['nullable', 'string', 'max:2000']])['note'] ?? null;

        $finding->update([
            'status'        => AuditFinding::STATUS_WAITING_AUDITOR_VERIFICATION,
            'approved_at'   => now(),
            'approver_id'   => auth()->id(),
            'approval_note' => $note,
        ]);

        $finding->recordEvent('approved', $note, 'atasan');

        Notify::to(
            User::find($finding->auditor_id ?: $audit->effectiveLeadAuditorId()),
            'Perlu verifikasi Anda',
            "{$finding->reference}: disetujui atasan, menunggu verifikasi auditor.",
            route('audits.findings.show', [$audit, $finding], false),
            'action'
        );

        return back()->with('flash.success', 'Approval diberikan. Menunggu verifikasi Auditor.');
    }

    public function reject(Request $request, Audit $audit, AuditFinding $finding): RedirectResponse
    {
        abort_unless($finding->audit_id === $audit->id, 404);
        abort_unless(in_array($finding->status, [
            AuditFinding::STATUS_WAITING_APPROVAL,
            AuditFinding::STATUS_WAITING_AUDITOR_VERIFICATION,
            AuditFinding::STATUS_WAITING_VERIFICATION,
        ], true), 422);

        // Wewenang menolak / meminta revisi mengikuti pemilik tahap yang sedang berjalan.
        abort_unless(match ($finding->status) {
            AuditFinding::STATUS_WAITING_APPROVAL             => $this->isApprover($request->user(), $finding),
            AuditFinding::STATUS_WAITING_AUDITOR_VERIFICATION => $this->isVerifyingAuditor($request->user(), $finding, $audit),
            AuditFinding::STATUS_WAITING_VERIFICATION         => $this->isLeadAuditor($request->user(), $audit),
            default                                           => false,
        }, 403, 'Anda tidak berwenang menolak atau meminta revisi pada tahap ini.');

        $data = $request->validate([
            'note' => ['required', 'string', 'max:2000'],
            'kind' => ['nullable', 'in:reject,revise'],
        ]);

        $from = $finding->status;
        $finding->update([
            'status'            => $data['kind'] === 'reject' ? AuditFinding::STATUS_REJECTED : AuditFinding::STATUS_IN_PROGRESS,
            'approval_note'           => $from === AuditFinding::STATUS_WAITING_APPROVAL ? $data['note'] : $finding->approval_note,
            'auditor_verification_note' => $from === AuditFinding::STATUS_WAITING_AUDITOR_VERIFICATION ? $data['note'] : $finding->auditor_verification_note,
            'verification_note'       => $from === AuditFinding::STATUS_WAITING_VERIFICATION ? $data['note'] : $finding->verification_note,
        ]);

        $stage = match ($from) {
            AuditFinding::STATUS_WAITING_APPROVAL             => 'atasan',
            AuditFinding::STATUS_WAITING_AUDITOR_VERIFICATION => 'auditor',
            AuditFinding::STATUS_WAITING_VERIFICATION         => 'lead',
            default                                           => null,
        };
        $finding->recordEvent($data['kind'] === 'reject' ? 'rejected' : 'revision_requested', $data['note'], $stage);

        $isReject = $data['kind'] === 'reject';
        Notify::to(
            User::find($finding->finding_owner_id),
            $isReject ? 'Temuan ditolak' : 'Tindakan perbaikan diminta revisi',
            "{$finding->reference}: ".$data['note'],
            route('audits.findings.show', [$audit, $finding], false),
            'warning'
        );

        return back()->with('flash.success', $data['kind'] === 'reject' ? 'Temuan ditolak.' : 'Dikembalikan untuk revisi.');
    }

    /** Auditor (pembuat temuan) verify → waiting_verification (Lead Auditor) */
    public function auditorVerify(Request $request, Audit $audit, AuditFinding $finding): RedirectResponse
    {
        abort_unless($finding->audit_id === $audit->id, 404);
        abort_unless($finding->status === AuditFinding::STATUS_WAITING_AUDITOR_VERIFICATION, 422, 'Bukan dalam status menunggu verifikasi auditor.');
        // Hanya auditor pembuat temuan (fallback: lead auditor) yang boleh verifikasi tahap ini.
        abort_unless(
            $this->isVerifyingAuditor($request->user(), $finding, $audit),
            403,
            'Hanya auditor pembuat temuan yang dapat memverifikasi tahap ini.',
        );

        $note = $request->validate(['note' => ['nullable', 'string', 'max:2000']])['note'] ?? null;

        $finding->update([
            'status'                    => AuditFinding::STATUS_WAITING_VERIFICATION,
            'auditor_verified_at'       => now(),
            'auditor_verification_note' => $note,
        ]);

        $finding->recordEvent('auditor_verified', $note, 'auditor');

        Notify::to(
            User::find($audit->effectiveLeadAuditorId()),
            'Perlu verifikasi final (Lead Auditor)',
            "{$finding->reference}: diverifikasi auditor, menunggu verifikasi Lead Auditor.",
            route('audits.findings.show', [$audit, $finding], false),
            'action'
        );

        return back()->with('flash.success', 'Verifikasi auditor selesai. Menunggu verifikasi Lead Auditor.');
    }

    /** Lead auditor verify → closed */
    public function verify(Request $request, Audit $audit, AuditFinding $finding): RedirectResponse
    {
        abort_unless($finding->audit_id === $audit->id, 404);
        abort_unless($finding->status === AuditFinding::STATUS_WAITING_VERIFICATION, 422);
        // Penutupan temuan adalah wewenang Lead Auditor pelaksana.
        abort_unless($this->isLeadAuditor($request->user(), $audit), 403, 'Hanya Lead Auditor yang dapat melakukan verifikasi final & menutup temuan.');

        $note = $request->validate(['note' => ['nullable', 'string', 'max:2000']])['note'] ?? null;

        $finding->update([
            'status'            => AuditFinding::STATUS_CLOSED,
            'verified_at'       => now(),
            'verifier_id'       => auth()->id(),
            'verification_note' => $note,
            'closed_at'         => now(),
        ]);

        $finding->recordEvent('lead_verified', $note, 'lead');

        Notify::many(
            User::whereIn('id', array_unique(array_filter([$finding->finding_owner_id, $finding->auditor_id])))->get(),
            'Temuan selesai (Closed)',
            "{$finding->reference}: telah diverifikasi Lead Auditor & ditutup. Report PDF kini tersedia.",
            route('audits.findings.show', [$audit, $finding], false),
            'success'
        );

        return back()->with('flash.success', 'Temuan diverifikasi & closed.');
    }

    /**
     * Report PDF FM-BDK-011 — hanya tersedia setelah temuan CLOSED.
     * PFI (opportunity) memakai layout ringkas; Minor/Major memakai layout lengkap.
     */
    public function reportPdf(Audit $audit, AuditFinding $finding): HttpResponse
    {
        abort_unless($finding->audit_id === $audit->id, 404);
        abort_unless($finding->status === AuditFinding::STATUS_CLOSED, 403, 'Report hanya tersedia setelah temuan closed.');

        $finding->load([
            'owner:id,name,signature_path',
            'auditor:id,name,signature_path',
            'approver:id,name,signature_path',
            'verifier:id,name,signature_path',
            'audit:id,code,title,department_id,lead_auditor_id,actual_lead_auditor_id,auditees,planned_date',
            'audit.department:id,name,manager_id',
            'audit.department.manager:id,name,signature_path',
            'audit.leadAuditor:id,name,signature_path',
            'audit.actualLeadAuditor:id,name,signature_path',
        ]);

        $filename = str_replace(['/', ' '], ['-', '_'], $finding->reference ?: "finding-{$finding->id}");

        return Pdf::loadView('audits.finding-pdf', ['finding' => $finding, 'audit' => $finding->audit])
            ->setPaper('a4', 'portrait')
            ->setOption('isRemoteEnabled', true)
            ->stream("{$filename}.pdf", ['Attachment' => false]);
    }

    public function destroy(Request $request, Audit $audit, AuditFinding $finding): RedirectResponse
    {
        abort_unless($finding->audit_id === $audit->id, 404);
        // Auditor boleh menghapus temuan selama auditee BELUM submit tindakan perbaikan.
        abort_unless(
            $this->isAuditor($request->user(), $audit) && ! $finding->submitted_at,
            403,
            'Temuan hanya dapat dihapus oleh auditor selama auditee belum submit tindakan perbaikan.'
        );

        $ref = $finding->reference;

        foreach ((array) ($finding->evidence_files ?? []) as $path) {
            Storage::disk('public')->delete($path);
        }
        foreach ((array) ($finding->action_evidence_files ?? []) as $path) {
            Storage::disk('public')->delete($path);
        }

        $finding->events()->delete();
        $finding->delete();

        return redirect()->route('audits.show', $audit)->with('flash.success', "Temuan {$ref} dihapus.");
    }
}
