<?php

namespace App\Http\Controllers;

use App\Models\CorrectiveAction;
use App\Models\Department;
use App\Models\User;
use App\Workflow\ApprovalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class NcrController extends Controller
{
    public function __construct(private ApprovalService $approvals) {}

    /** SLA days per severity (flowchart §7) */
    private const SLA = ['low' => 14, 'medium' => 7, 'high' => 3, 'critical' => 1];

    public function index(Request $request): Response
    {
        $items = CorrectiveAction::query()
            ->with(['owner:id,name', 'department:id,name'])
            ->when($request->kind, fn ($q, $k) => $q->where('kind', $k))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->severity, fn ($q, $sv) => $q->where('severity', $sv))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        $board = [
            'open'         => CorrectiveAction::with('owner:id,name')->whereIn('status', ['open', 'assigned'])->limit(20)->get(),
            'in_progress'  => CorrectiveAction::with('owner:id,name')->where('status', 'in_progress')->limit(20)->get(),
            'verification' => CorrectiveAction::with('owner:id,name')->where('status', 'verification')->limit(20)->get(),
            'closed'       => CorrectiveAction::with('owner:id,name')->whereIn('status', ['closed_effective', 'closed_ineffective'])->limit(20)->get(),
        ];

        return Inertia::render('ncr/index', [
            'items'       => $items,
            'board'       => $board,
            'filters'     => $request->only(['kind', 'status', 'severity']),
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'users'       => User::select('id', 'name', 'department_id')->where('status', 'active')->orderBy('name')->get(),
        ]);
    }

    public function show(CorrectiveAction $ncr): Response
    {
        $ncr->load(['department', 'owner', 'raisedBy', 'approvals.approver']);

        return Inertia::render('ncr/show', [
            'item'        => $ncr,
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'users'       => User::select('id', 'name', 'department_id')->where('status', 'active')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateData($request);

        $data['code']         = $this->nextCode($data['kind']);
        $data['raised_by_id'] = $request->user()->id;
        $data['status']       = $data['immediate_action'] ? 'assigned' : 'open';
        $data['due_date']   ??= Carbon::today()->addDays(self::SLA[$data['severity']])->toDateString();

        $ncr = CorrectiveAction::create($data);

        return redirect()->route('ncr.show', $ncr)->with('flash.success', "{$ncr->code} created.");
    }

    public function update(Request $request, CorrectiveAction $ncr): RedirectResponse
    {
        $data = $this->validateData($request, $ncr->id);
        $ncr->update($data);

        return back()->with('flash.success', "{$ncr->code} updated.");
    }

    public function destroy(CorrectiveAction $ncr): RedirectResponse
    {
        $ncr->delete();

        return redirect()->route('ncr.index')->with('flash.success', "{$ncr->code} deleted.");
    }

    public function submit(Request $request, CorrectiveAction $ncr): RedirectResponse
    {
        $this->approvals->submit($ncr);

        return back()->with('flash.success', "{$ncr->code} submitted for approval.");
    }

    /**
     * Move the NCR along the 8D workflow.
     *   open|assigned → in_progress → verification → closed_effective|closed_ineffective
     */
    public function transition(Request $request, CorrectiveAction $ncr): RedirectResponse
    {
        $data = $request->validate([
            'to'      => ['required', 'in:in_progress,verification,closed_effective,closed_ineffective,rejected'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $allowed = [
            'open'                => ['in_progress', 'rejected'],
            'assigned'            => ['in_progress', 'rejected'],
            'in_progress'         => ['verification', 'rejected'],
            'verification'        => ['closed_effective', 'closed_ineffective', 'in_progress'],
            'closed_ineffective'  => ['in_progress'],
        ];

        abort_unless(
            in_array($data['to'], $allowed[$ncr->status] ?? [], true),
            422,
            "Cannot transition from {$ncr->status} to {$data['to']}."
        );

        DB::transaction(function () use ($ncr, $data) {
            $patch = ['status' => $data['to']];
            if (str_starts_with($data['to'], 'closed_')) {
                $patch['closed_at'] = now();
            }
            if ($data['comment']) {
                $patch['verification_result'] = trim(($ncr->verification_result ?? '')."\n[".now()->toDateTimeString()."] {$data['comment']}");
            }
            $ncr->update($patch);
        });

        return back()->with('flash.success', "Status moved to {$data['to']}.");
    }

    private function validateData(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'kind'                => ['required', 'in:ncr,car,capa'],
            'source'              => ['required', 'in:internal_audit,external_audit,customer_complaint,kpi_miss,inspection,employee_report,other'],
            'title'               => ['required', 'string', 'max:255'],
            'problem_statement'   => ['required', 'string', 'max:5000'],
            'immediate_action'    => ['nullable', 'string', 'max:5000'],
            'root_cause'          => ['nullable', 'string', 'max:5000'],
            'corrective_action'   => ['nullable', 'string', 'max:5000'],
            'preventive_action'   => ['nullable', 'string', 'max:5000'],
            'severity'            => ['required', 'in:low,medium,high,critical'],
            'department_id'       => ['nullable', 'exists:departments,id'],
            'owner_id'            => ['required', 'exists:users,id'],
            'due_date'            => ['nullable', 'date'],
        ]);
    }

    private function nextCode(string $kind): string
    {
        $prefix = strtoupper($kind);
        $year   = now()->format('Y');
        $count  = CorrectiveAction::where('kind', $kind)->whereYear('created_at', $year)->count() + 1;
        return sprintf('%s-%s-%03d', $prefix, $year, $count);
    }
}
