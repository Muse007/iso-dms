<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $schedule->code }} — Schedule Audit Internal</title>
    <style>
        @page { margin: 10mm 8mm 12mm 8mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 8pt; color: #111; }
        table { border-collapse: collapse; width: 100%; }

        .doc-header td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
        .logo-cell { width: 18%; text-align: center; font-weight: 800; font-size: 13pt; color: #b91c1c; }
        .title-cell { text-align: center; font-weight: bold; font-size: 12pt; }
        .title-cell .sub { font-size: 8pt; font-weight: normal; }
        .meta-cell { width: 22%; font-size: 7.5pt; }
        .meta-cell .row { padding: 1px 0; }
        .meta-cell b { display: inline-block; width: 46px; }

        .period { text-align: center; font-weight: bold; font-size: 9pt; margin: 8px 0 6px; }

        table.grid th, table.grid td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
        table.grid th { background: #e5e7eb; font-size: 7.5pt; text-align: center; }
        table.grid td.center { text-align: center; }
        table.nested { width: 100%; }
        table.nested td { border: none; border-bottom: 1px solid #d1d5db; padding: 2px 0; }
        table.nested tr:last-child td { border-bottom: none; }

        .sign { margin-top: 16px; width: 100%; }
        .sign td { vertical-align: top; font-size: 8pt; }
    </style>
</head>
<body>
@php
    $stdLabel = [
        'iso_9001'=>'ISO 9001:2015','iso_14001'=>'ISO 14001:2015','iso_45001'=>'ISO 45001:2018',
        'iatf'=>'IATF 16949:2016','internal'=>'Internal',
    ];
    $standards = $schedule->standards ?: [$schedule->standard];
    $audits = $schedule->audits;
    $dates  = $audits->pluck('planned_date')->filter();
    $min    = $dates->min(); $max = $dates->max();
    $fmt    = fn ($d) => $d ? \Illuminate\Support\Carbon::parse($d)->format('d-m-Y') : '';

    // Opening & closing schedule — fall back to first/last audit date when not filled.
    $openDate  = $schedule->opening_at ? $schedule->opening_at->format('d-m-Y') : $fmt($min);
    $openTime  = $schedule->opening_at ? $schedule->opening_at->format('H:i')   : '—';
    $closeDate = $schedule->closing_at ? $schedule->closing_at->format('d-m-Y') : $fmt($max);
    $closeTime = $schedule->closing_at ? $schedule->closing_at->format('H:i')   : '—';
    $openLoc   = $schedule->opening_location ?: '—';
    $closeLoc  = $schedule->closing_location ?: '—';

    // Audit categories chosen by DC (fallback to all three) → PDF subtitle "( SISTEM, PROSES, & PRODUK )".
    $catLabel = ['sistem' => 'SISTEM', 'proses' => 'PROSES', 'produk' => 'PRODUK'];
    $cats = collect($schedule->audit_categories ?: ['sistem', 'proses', 'produk'])
        ->map(fn ($c) => $catLabel[$c] ?? strtoupper($c))->values();
    $catText = $cats->count() > 2
        ? $cats->slice(0, -1)->implode(', ').', &amp; '.$cats->last()
        : $cats->implode(' &amp; ');

    $mrSig = ($schedule->mr && $schedule->mr->signature_path)
        ? storage_path('app/public/'.$schedule->mr->signature_path) : null;
    $mrSig = ($mrSig && file_exists($mrSig)) ? $mrSig : null;

    // Company logo (embedded as base64 so dompdf renders it reliably on any host).
    $logoPath = public_path('bti_logo_hires.png');
    $logoSrc  = file_exists($logoPath)
        ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath))
        : null;
@endphp

<table class="doc-header">
    <tr>
        <td class="logo-cell" rowspan="3">
            @if ($logoSrc)
                <img src="{{ $logoSrc }}" alt="Bonecom Tricom" style="width: 100%; max-width: 130px; height: auto;">
            @else
                PT. BONECOM<br>TRICOM
            @endif
        </td>
        <td class="title-cell" rowspan="3">
            SCHEDULE AUDIT INTERNAL
            <div class="sub">( {!! $catText !!} )</div>
        </td>
        <td class="meta-cell"><div class="row"><b>Nomor</b>: FM-BDK-07</div></td>
    </tr>
    <tr><td class="meta-cell"><div class="row"><b>Revisi</b>: 01</div></td></tr>
    <tr><td class="meta-cell"><div class="row"><b>Efektif</b>: 1 November 2023</div></td></tr>
</table>

<div class="period">
    PERIODE : {{ $schedule->period_label ?: '—' }}
    &nbsp;·&nbsp; Standar: {{ collect($standards)->map(fn ($s) => $stdLabel[$s] ?? strtoupper($s))->implode(', ') }}
</div>

<table class="grid">
    <thead>
        <tr>
            <th style="width:3%">No</th>
            <th style="width:13%">Bagian dan Auditee</th>
            <th style="width:18%">Proses</th>
            <th style="width:25%">Related Document</th>
            <th style="width:9%">Tanggal</th>
            <th style="width:9%">Jam Pelaksanaan</th>
            <th style="width:10%">Lokasi Audit</th>
            <th style="width:13%">Nama Auditor</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="center">0</td>
            <td>All Team</td>
            <td>Opening</td>
            <td></td>
            <td class="center">{{ $openDate }}</td>
            <td class="center">{{ $openTime }}</td>
            <td class="center">{{ $openLoc }}</td>
            <td class="center">All</td>
        </tr>

        @foreach ($audits as $i => $a)
            @php
                $procs = is_array($a->processes) ? $a->processes : [];
                $auditorNames = collect($a->team ?? [])->map(fn ($id) => $names[$id] ?? null)->filter()->values();
            @endphp
            <tr>
                <td class="center">{{ $i + 1 }}</td>
                <td>{{ $a->department->name ?? $a->title }}</td>
                <td>
                    @if (count($procs))
                        <table class="nested">
                            @foreach ($procs as $p)
                                <tr><td>{{ $p['proses'] ?? '' }}</td></tr>
                            @endforeach
                        </table>
                    @else — @endif
                </td>
                <td>
                    @if (count($procs))
                        <table class="nested">
                            @foreach ($procs as $p)
                                @php
                                    $rd = $p['related_documents'] ?? [];
                                    $rd = is_array($rd) ? $rd : preg_split('/\r\n|\r|\n/', (string) $rd);
                                    $rd = array_values(array_filter(array_map('trim', $rd), fn ($x) => $x !== ''));
                                @endphp
                                <tr><td>
                                    @forelse ($rd as $doc)
                                        {{ $doc }}@if (!$loop->last)<br>@endif
                                    @empty —
                                    @endforelse
                                </td></tr>
                            @endforeach
                        </table>
                    @else — @endif
                </td>
                <td class="center">{{ $fmt($a->planned_date) }}</td>
                <td class="center">{{ $a->jam_pelaksanaan ?: '—' }}</td>
                <td class="center">{{ $a->location ?: '—' }}</td>
                <td>
                    @forelse ($auditorNames as $n)
                        {{ $loop->iteration }}. {{ $n }}<br>
                    @empty — @endforelse
                </td>
            </tr>
        @endforeach

        <tr>
            <td class="center">{{ $audits->count() + 1 }}</td>
            <td>All Team</td>
            <td>Closing</td>
            <td></td>
            <td class="center">{{ $closeDate }}</td>
            <td class="center">{{ $closeTime }}</td>
            <td class="center">{{ $closeLoc }}</td>
            <td class="center">All</td>
        </tr>
    </tbody>
</table>

<table class="sign">
    <tr>
        <td style="width:33%">
            {{ now()->format('d F Y') }}<br><br>
            @if ($mrSig)
                <img src="{{ $mrSig }}" alt="ttd" style="max-height:48px; max-width:140px;"><br>
            @else
                <br><br>
            @endif
            <b>{{ $schedule->mr->name ?? '________________' }}</b><br>
            Management Representative
            @if ($schedule->mr_signed_at)
                <div style="font-size:7pt; color:#6b7280;">Disetujui {{ $schedule->mr_signed_at->format('d M Y H:i') }}</div>
            @endif
        </td>
        <td style="width:34%"></td>
        <td style="width:33%"></td>
    </tr>
</table>

</body>
</html>
