<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $document->code }} — {{ $document->title }}</title>
    <style>
        @page { margin: 18mm 14mm 18mm 14mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10pt; color: #111; }
        h1, h2, h3 { margin: 0; }

        /* ====== Header banner ====== */
        .doc-header {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 14px;
        }
        .doc-header td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: middle;
        }
        .doc-header .logo-cell {
            width: 22%;
            text-align: center;
            font-weight: 800;
            font-size: 14pt;
            letter-spacing: 1px;
            color: #b91c1c;
        }
        .doc-header .title-cell {
            width: 48%;
            text-align: center;
            font-weight: bold;
            font-size: 12pt;
            text-transform: uppercase;
        }
        .doc-header .meta-cell {
            width: 30%;
            font-size: 8.5pt;
        }
        .meta-cell .meta-row { padding: 2px 0; }
        .meta-cell .meta-row b { display: inline-block; width: 70px; }

        /* ====== Section heading ====== */
        h2.section {
            background: #f3f4f6;
            border: 1px solid #000;
            border-bottom: none;
            padding: 5px 8px;
            font-size: 10.5pt;
            font-weight: bold;
            margin-top: 12px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .section-body {
            border: 1px solid #000;
            padding: 8px 10px;
            background: #fff;
            min-height: 22px;
        }
        .section-body p { margin: 0 0 4px 0; }
        .section-body ul, .section-body ol { margin: 0 0 0 18px; padding: 0; }
        .section-body li { margin: 2px 0; }

        /* ====== Revision history & approval tables ====== */
        table.frame {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        table.frame th, table.frame td {
            border: 1px solid #000;
            padding: 5px 6px;
            font-size: 9pt;
            vertical-align: middle;
        }
        table.frame th {
            background: #e5e7eb;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }
        table.frame .label {
            background: #f3f4f6;
            font-weight: bold;
            width: 18%;
        }

        /* ====== Approval signature block ====== */
        .approval {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .approval th, .approval td {
            border: 1px solid #000;
            padding: 6px 8px;
            font-size: 9pt;
            text-align: center;
            vertical-align: top;
        }
        .approval th {
            background: #e5e7eb;
            font-weight: bold;
            text-transform: uppercase;
        }
        .approval .sig-row td { height: 50px; }
        .approval .name { font-weight: bold; }

        .footer-note { margin-top: 14px; font-size: 8pt; color: #6b7280; text-align: right; }
        .empty { color: #9ca3af; font-style: italic; }
    </style>
</head>
<body>

@php
    $stdLabel = [
        'iso_9001'  => 'ISO 9001 : 2015',
        'iso_14001' => 'ISO 14001 : 2015',
        'iso_45001' => 'ISO 45001 : 2018',
        'iatf'      => 'IATF 16949 : 2016',
        'internal'  => 'Internal Standard',
    ];
    $standards = $document->standards ?: [$document->standard];
    $effective = $document->effective_date?->format('d M Y') ?? '-';

    // Resolve filesystem paths for embedded images (DomPDF requires absolute paths).
    $logoFile = public_path('logo-bti.png');
    $logoSrc  = file_exists($logoFile) ? $logoFile : null;

    $flowchartFile = $document->flowchart_path ? storage_path('app/public/'.$document->flowchart_path) : null;
    $flowchartSrc  = $flowchartFile && file_exists($flowchartFile) ? $flowchartFile : null;

    $resolveImg = function ($path) {
        if (!$path) return null;
        $p = storage_path('app/public/'.$path);
        return file_exists($p) ? $p : null;
    };

    // Signature gating —
    //   "Dibuat Oleh"   : show as soon as draft (creator already signed by drafting).
    //   "Ditinjau Oleh" : show only after reviewer's approval row is approved.
    //   "Disetujui Oleh": show only after approver's approval row is approved.
    $prepSigShown = $resolveImg($document->preparedBy?->signature_path);
    $revSigShown  = $document->reviewed_at ? $resolveImg($document->reviewedBy?->signature_path) : null;
    $revSig2Shown = $document->reviewed_2_at ? $resolveImg($document->reviewedByTwo?->signature_path) : null;
    $appSigShown  = $document->approved_at ? $resolveImg($document->approvedBy?->signature_path) : null;

    $prepName = $document->preparedBy?->name ?: $document->prepared_by_name ?: ($document->owner->name ?? '—');
    $revName  = $document->reviewedBy?->name  ?: $document->reviewed_by_name ?: '—';
    $revName2 = $document->reviewedByTwo?->name ?: $document->reviewed_by_2_name ?: '—';
    $appName  = $document->approvedBy?->name  ?: $document->approved_by_name ?: '—';

    $hasReviewer2 = (bool) $document->reviewed_by_2_user_id;

    // Digital stamp — applied only after Document Control approves and document is "sah".
    $stampShown = $document->doc_control_approved_at
        ? $resolveImg($document->documentControl?->stamp_path)
        : null;
    $isPublished = $document->status === 'published' && $document->doc_control_approved_at;

    // ----- SOP sections D–G: normalize to a nested outline (handles legacy + new shapes) -----
    $toOutline = function ($value) use (&$toOutline) {
        if (!is_array($value)) return [];
        $out = [];
        foreach ($value as $item) {
            if (is_string($item)) { $out[] = ['text' => $item, 'children' => []]; continue; }
            if (is_array($item)) {
                if (array_key_exists('text', $item) || array_key_exists('children', $item)) {
                    $out[] = ['text' => (string) ($item['text'] ?? ''), 'children' => $toOutline($item['children'] ?? [])];
                } else {
                    $parts = [];
                    foreach (['term', 'meaning', 'role', 'duty', 'title', 'detail'] as $k) {
                        if (isset($item[$k]) && trim((string) $item[$k]) !== '') $parts[] = $item[$k];
                    }
                    $out[] = ['text' => implode(' — ', $parts), 'children' => []];
                }
            }
        }
        return $out;
    };

    // Recursively render outline rows; $prefix is the running number (e.g. "D", then "D.1").
    // Each row is a 2-cell table (number | text) so wrapped lines stay aligned under the
    // start of the text — a hanging indent — instead of falling back to the left margin.
    $renderOutline = function ($nodes, $prefix) use (&$renderOutline) {
        if (empty($nodes)) return '';
        $html = '';
        foreach ($nodes as $i => $n) {
            $num  = $prefix . '.' . ($i + 1);
            $pad  = (substr_count($num, '.') - 1) * 16;   // depth-based indentation
            $text = e($n['text'] ?? '');
            if ($text === '' && empty($n['children'])) continue;
            $html .= '<table style="width:100%; border-collapse:collapse; margin:2px 0;"><tr>'
                  . '<td style="width:1%; vertical-align:top; padding-left:' . $pad . 'px; padding-right:6px; font-weight:bold; white-space:nowrap;">' . $num . '</td>'
                  . '<td style="vertical-align:top; text-align:justify;">' . $text . '</td>'
                  . '</tr></table>';
            if (!empty($n['children'])) $html .= $renderOutline($n['children'], $num);
        }
        return $html;
    };

    // Render the image attachments stored for a section (D–G). Returns '' when none.
    $renderSectionImages = function ($sec) use ($document, $resolveImg) {
        $imgs = is_array($document->section_images ?? null) ? ($document->section_images[$sec] ?? []) : [];
        if (!is_array($imgs) || empty($imgs)) return '';
        $html = '<div style="margin-top:10px;">';
        foreach ($imgs as $p) {
            $src = $resolveImg($p);
            if (!$src) continue;
            $html .= '<div style="margin:6px 0; text-align:center;">'
                  . '<img src="' . $src . '" alt="Lampiran" style="max-width:100%; max-height:380px; border:1px solid #d1d5db;">'
                  . '</div>';
        }
        return $html . '</div>';
    };

    // ----- Section C (Acuan): ISO clauses grouped per standard -----
    $isoClauses = is_array($document->iso_clauses) ? $document->iso_clauses : [];
    $cleanClauses = function ($std) use ($isoClauses) {
        $arr = $isoClauses[$std] ?? [];
        return is_array($arr) ? array_values(array_filter(array_map('trim', array_map('strval', $arr)), fn ($x) => $x !== '')) : [];
    };
    $hasClauses = false;
    foreach ($standards as $s) { if (count($cleanClauses($s))) { $hasClauses = true; break; } }
@endphp

{{-- =========== Header banner =========== --}}
<table class="doc-header">
    <tr>
        <td class="logo-cell" rowspan="2">
            @if ($logoSrc)
                <img src="{{ $logoSrc }}" alt="BTI Logo" style="max-height: 56px; max-width: 100%;">
            @else
                PT. BONECOM<br>TRICOM
            @endif
        </td>
        <td class="title-cell" rowspan="2">
            <div style="font-size: 8.5pt; font-weight: bold; letter-spacing: 1.5px; color: #6b7280; margin-bottom: 2px;">
                PROSEDUR KERJA
            </div>
            <div>{{ $document->title }}</div>
        </td>
        <td class="meta-cell">
            <div class="meta-row"><b>No. Dok</b>: {{ $document->code }}</div>
            <div class="meta-row"><b>Revisi</b>: {{ $document->current_revision }}</div>
        </td>
    </tr>
    <tr>
        <td class="meta-cell">
            <div class="meta-row"><b>Tgl Efektif</b>: {{ $effective }}</div>
            <div class="meta-row"><b>Status</b>: {{ $isPublished ? 'SAH (Published)' : strtoupper($document->status) }}</div>
        </td>
    </tr>
</table>

{{-- =========== Revision history =========== --}}
@php
    // Prefer the manually-entered revision history; fall back to the auto file-version list.
    $revRows = is_array($document->revision_history ?? null)
        ? array_values(array_filter($document->revision_history, fn ($r) => is_array($r) && (
            trim((string)($r['revision'] ?? '')) !== '' ||
            trim((string)($r['summary'] ?? '')) !== '' ||
            trim((string)($r['date'] ?? '')) !== ''
        )))
        : [];
@endphp
<h2 class="section">Riwayat Revisi</h2>
<table class="frame">
    <thead>
        <tr>
            <th style="width: 8%">No. Revisi</th>
            <th style="width: 16%">Tanggal</th>
            <th>Ringkasan Perubahan</th>
            <th style="width: 8%">Hal</th>
            <th style="width: 22%">Disetujui Oleh</th>
        </tr>
    </thead>
    <tbody>
        @if (count($revRows))
            @foreach ($revRows as $r)
                <tr>
                    <td style="text-align: center">{{ $r['revision'] ?? '' }}</td>
                    <td style="text-align: center">{{ $r['date'] ?? '' }}</td>
                    <td>{{ trim((string)($r['summary'] ?? '')) !== '' ? $r['summary'] : '—' }}</td>
                    <td style="text-align: center">{{ $r['page'] ?? '' }}</td>
                    <td style="text-align: center">{{ trim((string)($r['mr'] ?? '')) !== '' ? $r['mr'] : $appName }}</td>
                </tr>
            @endforeach
        @else
            @forelse ($document->versions as $v)
                <tr>
                    <td style="text-align: center">{{ $v->revision }}</td>
                    <td style="text-align: center">{{ optional($v->created_at)->format('d M Y') }}</td>
                    <td>{{ $v->change_summary ?: '—' }}</td>
                    <td style="text-align: center">1</td>
                    <td style="text-align: center">{{ $appName }}</td>
                </tr>
            @empty
                <tr>
                    <td style="text-align: center">{{ $document->current_revision }}</td>
                    <td style="text-align: center">{{ $effective }}</td>
                    <td class="empty">Initial issue</td>
                    <td style="text-align: center">1</td>
                    <td style="text-align: center">{{ $appName }}</td>
                </tr>
            @endforelse
        @endif
    </tbody>
</table>

{{-- =========== Approval / signature block =========== --}}
@php
    $sigCols = [
        [
            'title' => 'Dibuat Oleh', 'sig' => $prepSigShown, 'name' => $prepName,
            'date'  => $document->prepared_by_date?->format('d M Y') ?: ($document->created_at?->format('d M Y') ?? '—'),
            'waiting' => false,
        ],
        [
            'title' => $hasReviewer2 ? 'Ditinjau Oleh (1)' : 'Ditinjau Oleh', 'sig' => $revSigShown, 'name' => $revName,
            'date'  => $document->reviewed_at?->format('d M Y') ?: '—',
            'waiting' => ! $document->reviewed_at,
        ],
    ];
    if ($hasReviewer2) {
        $sigCols[] = [
            'title' => 'Ditinjau Oleh (2)', 'sig' => $revSig2Shown, 'name' => $revName2,
            'date'  => $document->reviewed_2_at?->format('d M Y') ?: '—',
            'waiting' => ! $document->reviewed_2_at,
        ];
    }
    $sigCols[] = [
        'title' => 'Disetujui Oleh', 'sig' => $appSigShown, 'name' => $appName,
        'date'  => $document->approved_at?->format('d M Y') ?: '—',
        'waiting' => ! $document->approved_at,
    ];
    $colW = number_format(100 / count($sigCols), 2);
@endphp
<table class="approval">
    <thead>
        <tr>
            @foreach ($sigCols as $c)
                <th style="width: {{ $colW }}%">{{ $c['title'] }}</th>
            @endforeach
        </tr>
    </thead>
    <tbody>
        <tr class="sig-row">
            @foreach ($sigCols as $c)
                <td>
                    @if ($c['sig'])
                        <img src="{{ $c['sig'] }}" alt="signature" style="max-height: 46px; max-width: 90%;">
                    @elseif ($c['waiting'])
                        <span style="font-size: 7.5pt; color: #9ca3af; font-style: italic;">Menunggu approval</span>
                    @endif
                </td>
            @endforeach
        </tr>
        <tr>
            @foreach ($sigCols as $c)
                <td>
                    <div>Nama:</div>
                    <div class="name">{{ $c['name'] }}</div>
                </td>
            @endforeach
        </tr>
        <tr>
            @foreach ($sigCols as $c)
                <td>Tanggal: {{ $c['date'] }}</td>
            @endforeach
        </tr>
    </tbody>
</table>

{{-- =========== A. Tujuan =========== --}}
<h2 class="section">A. Tujuan</h2>
<div class="section-body">
    @if ($document->purpose)
        {!! nl2br(e($document->purpose)) !!}
    @else
        <span class="empty">Belum diisi.</span>
    @endif
</div>

{{-- =========== B. Ruang Lingkup =========== --}}
<h2 class="section">B. Ruang Lingkup</h2>
<div class="section-body">
    @if ($document->scope)
        {!! nl2br(e($document->scope)) !!}
    @else
        <span class="empty">Belum diisi.</span>
    @endif
</div>

{{-- =========== C. Acuan (klausul ISO dikelompokkan per standar) =========== --}}
<h2 class="section">C. Acuan</h2>
<div class="section-body">
    @if ($hasClauses)
        @foreach ($standards as $i => $s)
            @php $cl = $cleanClauses($s); @endphp
            <p style="margin:2px 0;"><b>C.{{ $i + 1 }} {{ $stdLabel[$s] ?? strtoupper($s) }}</b>@if (count($cl)) — Klausul {{ implode(', ', $cl) }}@endif</p>
        @endforeach
    @elseif (!empty($document->references_list))
        <ul>
            @foreach ($document->references_list as $ref)
                <li>{{ $ref }}</li>
            @endforeach
        </ul>
    @else
        <ul>
            @foreach ($standards as $s)
                <li>{{ $stdLabel[$s] ?? strtoupper($s) }}</li>
            @endforeach
        </ul>
    @endif
</div>

{{-- =========== D. Definisi (sub-bab bertingkat) =========== --}}
<h2 class="section">D. Definisi</h2>
<div class="section-body">
    @php $dHtml = $renderOutline($toOutline($document->definitions), 'D'); @endphp
    @if ($dHtml) {!! $dHtml !!} @else <span class="empty">Belum diisi.</span> @endif
    {!! $renderSectionImages('D') !!}
</div>

{{-- =========== E. Penanggung Jawab (sub-bab bertingkat) =========== --}}
<h2 class="section">E. Penanggung Jawab</h2>
<div class="section-body">
    @php $eHtml = $renderOutline($toOutline($document->responsibilities), 'E'); @endphp
    @if ($eHtml) {!! $eHtml !!} @else <span class="empty">Belum diisi.</span> @endif
    {!! $renderSectionImages('E') !!}
</div>

{{-- =========== F. Prosedur (sub-bab bertingkat) =========== --}}
<h2 class="section">F. Prosedur</h2>
<div class="section-body">
    @php
        $fHtml = $renderOutline($toOutline($document->procedure_steps), 'F');
        $fImgs = $renderSectionImages('F');
    @endphp
    @if ($fHtml) {!! $fHtml !!} @else <span class="empty">Belum diisi.</span> @endif

    @if ($flowchartSrc || $fImgs)
        <div style="margin-top: 10px;">
            <div style="font-size: 8.5pt; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.4px; text-align: center;">
                Flow Chart
            </div>
            @if ($flowchartSrc)
                <div style="margin: 6px 0; text-align: center;">
                    <img src="{{ $flowchartSrc }}" alt="Flowchart" style="max-width: 100%; max-height: 380px; border: 1px solid #d1d5db;">
                </div>
            @endif
            {!! $fImgs !!}
        </div>
    @endif
</div>

{{-- =========== G. Dokumen Terkait (sub-bab G.1, G.2 … bertingkat) =========== --}}
<h2 class="section">G. Dokumen Terkait</h2>
<div class="section-body">
    @php $gHtml = $renderOutline($toOutline($document->related_documents), 'G'); @endphp
    @if ($gHtml) {!! $gHtml !!} @else <span class="empty">Belum diisi.</span> @endif
    {!! $renderSectionImages('G') !!}
</div>

@if ($isPublished)
    <div style="margin-top: 14px; border-top: 2px solid #b91c1c; padding-top: 10px; text-align: right;">
        <div style="display: inline-block; vertical-align: middle; text-align: left; padding-right: 12px;">
            <div style="font-size: 11pt; font-weight: bold; color: #b91c1c; letter-spacing: 1px;">DOKUMEN SAH</div>
            <div style="font-size: 8pt; color: #6b7280;">
                Disahkan oleh Document Control<br>
                {{ $document->documentControl?->name ?: '—' }}<br>
                {{ $document->doc_control_approved_at?->format('d M Y H:i') }}
            </div>
        </div>
        @if ($stampShown)
            <div style="display: inline-block; vertical-align: middle;">
                <img src="{{ $stampShown }}" alt="Digital Stamp" style="max-height: 90px; max-width: 130px;">
            </div>
        @else
            <div style="display: inline-block; vertical-align: middle; width: 110px; height: 90px; border: 2px dashed #b91c1c; border-radius: 50%; line-height: 86px; text-align: center; color: #b91c1c; font-size: 8pt; font-weight: bold;">
                STEMPEL<br>DIGITAL
            </div>
        @endif
    </div>
@endif

<div class="footer-note">
    Generated by ISO-DMS · {{ now()->format('d M Y H:i') }} · {{ $document->code }} rev {{ $document->current_revision }}
</div>

</body>
</html>
