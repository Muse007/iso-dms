<?php

namespace App\Http\Controllers;

use App\Models\Risk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RiskController extends Controller
{
    public function index(Request $request): Response
    {
        $risks = Risk::with(['department:id,name', 'owner:id,name'])
            ->orderByDesc('score')
            ->paginate(20);

        $matrix = collect(range(1, 5))
            ->mapWithKeys(fn ($s) => [$s => array_fill(1, 5, 0)])
            ->toArray();

        Risk::select('severity', 'likelihood', DB::raw('COUNT(*) as c'))
            ->groupBy('severity', 'likelihood')
            ->get()
            ->each(fn ($r) => $matrix[$r->severity][$r->likelihood] = (int) $r->c);

        return Inertia::render('risks/index', [
            'risks'  => $risks,
            'matrix' => $matrix,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'          => ['required', 'string', 'max:32', 'unique:risks,code'],
            'title'         => ['required', 'string', 'max:255'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'owner_id'      => ['required', 'exists:users,id'],
            'category'      => ['required', 'in:operational,compliance,safety,environment,quality,financial,reputation,strategic'],
            'severity'      => ['required', 'integer', 'min:1', 'max:5'],
            'likelihood'    => ['required', 'integer', 'min:1', 'max:5'],
            'context'       => ['nullable', 'string'],
            'cause'         => ['nullable', 'string'],
            'impact'        => ['nullable', 'string'],
        ]);

        $data['score'] = $data['severity'] * $data['likelihood'];
        $data['level'] = Risk::levelFromScore($data['score']);

        Risk::create($data);

        return back()->with('flash.success', 'Risk created.');
    }
}
