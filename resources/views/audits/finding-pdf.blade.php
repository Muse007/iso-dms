@php
    \Illuminate\Support\Carbon::setLocale('id');
    $fmt = fn ($d) => $d ? \Illuminate\Support\Carbon::parse($d)->translatedFormat('d F Y') : '-';

    $isPfi    = $finding->category === \App\Models\AuditFinding::CAT_PFI;
    $catLabel = ['opportunity' => 'PFI', 'minor_nc' => 'MINOR NC', 'major_nc' => 'MAJOR NC'][$finding->category] ?? $finding->category;
    $subtitle = $isPfi ? '(Potential for Improvement)' : '(Minor / Major Non-Conformity)';
    $docNo    = $isPfi ? 'FM - BDK - 011' : 'FM - BDK - 010';

    $logoPath = public_path('bti_logo_hires.png');
    $logoSrc  = file_exists($logoPath) ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath)) : null;

    $sig = function ($user) {
        if ($user && $user->signature_path) {
            $p = storage_path('app/public/'.$user->signature_path);
            if (file_exists($p)) {
                $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION)) ?: 'png';
                return 'data:image/'.($ext === 'jpg' ? 'jpeg' : $ext).';base64,'.base64_encode(file_get_contents($p));
            }
        }
        return null;
    };

    $auditor = $finding->auditor;                                     // AUDITOR — pembuat temuan
    $leader  = $audit->actualLeadAuditor ?: $audit->leadAuditor;      // LEAD AUDITOR — pelaksana bila diganti
    $auditee = $finding->owner;                                       // AUDITEE — PIC temuan
    $sigA = $sig($auditor);
    $sigL = $sig($leader);

    // Kolom tanda tangan auditee: seluruh PIC bagian, dengan PIC temuan dipastikan ikut.
    $auditeeSigners = $audit->auditeeUsers();
    if ($auditee && ! $auditeeSigners->contains('id', $auditee->id)) {
        $auditeeSigners = $auditeeSigners->push($auditee);
    }
    $auditeeSigners = $auditeeSigners->values();
    if ($auditeeSigners->isEmpty()) {
        $auditeeSigners = collect([null]);   // tetap sediakan satu kolom kosong untuk tanda tangan basah
    }

    // Kolom terakhir grup AUDITEE: atasan auditee, yaitu manager bagian yang diaudit.
    // Kolomnya selalu disediakan meski manager belum diisi, agar slot tanda tangan
    // basah tetap ada saat form dicetak.
    $auditeeSigners = $auditeeSigners->push($audit->department?->manager);
    // Lebar tumbuh mengikuti jumlah penanda tangan, dibatasi agar tidak melewati lebar cetak.
    $signWidth = min(620, max(350, ($auditeeSigners->count() + 2) * 112));
    $rootCauses = is_array($finding->root_causes) ? array_values(array_filter($finding->root_causes)) : [];
@endphp
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 12mm 12mm 12mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: "DejaVu Sans", sans-serif; font-size: 9pt; color: #1b1b1b; line-height: 1.35; }
    table { border-collapse: collapse; width: 100%; }
    .form td, .form th { border: 1px solid #000; padding: 4px 7px; vertical-align: top; }
    .hdr td { padding: 0; }
    .logo-cell { width: 165px; text-align: center; vertical-align: middle; padding: 6px !important; }
    .logo-cell img { max-width: 130px; height: auto; }
    .title-cell { text-align: center; vertical-align: middle; }
    .title-cell .t1 { font-weight: bold; font-size: 14pt; letter-spacing: 1px; }
    .title-cell .t2 { font-weight: bold; font-size: 10pt; padding-top: 3px; }
    .meta-cell { width: 178px; font-size: 8.5pt; vertical-align: middle; padding: 6px 8px !important; }
    .info { margin-top: 8px; }
    .info .lab { width: 138px; }
    .sec-h { margin-top: 8px; background: #f0f0ee; border: 1px solid #000; border-bottom: none; padding: 4px 8px; font-weight: bold; font-size: 8.5pt; text-transform: uppercase; }
    .sec-b { border: 1px solid #000; padding: 7px 9px; }
    .cat-pill { font-weight: bold; font-size: 8.5pt; padding: 1px 8px; border: 1px solid; }
    .cat-minor { background: #fde68a; color: #7c4a03; border-color: #d9a520; }
    .cat-major { background: #fecaca; color: #8a1216; border-color: #d9534f; }
    ol.rc, ol.findings { margin: 0; padding-left: 18px; }
    ol.rc li, ol.findings li { padding: 2px 0; }
    .sign th, .sign td { border: 1px solid #000; text-align: center; font-size: 8pt; padding: 3px 8px; }
    .sign th { font-weight: normal; background: #f0f0ee; }
    .sign .sig { height: 46px; vertical-align: middle; }
    .sign .sig img { max-height: 42px; max-width: 120px; }
    .sign .nm { font-weight: bold; }
    .sign .ro { font-size: 7.5pt; color: #444; }
    .dateline { font-size: 9pt; padding-bottom: 6px; }
    .verif .who { font-weight: bold; }
    .verif .dt { color: #444; font-size: 8pt; padding-top: 2px; }
    .ok { background: #dcfce7; border: 1px solid #86c9a0; padding: 1px 6px; font-size: 7.5pt; font-weight: bold; color: #14532d; }
</style>
</head>
<body>

    {{-- Header --}}
    <table class="form hdr">
        <tr>
            <td class="logo-cell">
                @if ($logoSrc)<img src="{{ $logoSrc }}" alt="Bonecom Tricom">@else<b style="color:#b5121b">BONECOM TRICOM</b>@endif
            </td>
            <td class="title-cell">
                <div class="t1">AUDIT FINDING</div>
                <div class="t2">{{ $subtitle }}</div>
            </td>
            <td class="meta-cell">
                No. &nbsp;&nbsp;: {{ $docNo }}<br>
                Revisi : 00 / 01-02-2013
            </td>
        </tr>
    </table>

    {{-- Info block --}}
    <table class="form info">
        <tr><td class="lab">NAMA BAGIAN</td><td>: {{ $audit->department->name ?? '-' }}</td></tr>
        <tr><td class="lab">TANGGAL AUDIT</td><td>: {{ $fmt($audit->planned_date) }}</td></tr>
        <tr><td class="lab">AUDIT NO. / REF</td><td>: {{ $finding->reference ?: $audit->code }}</td></tr>
        @unless ($isPfi)
        <tr><td class="lab">KATEGORI / KLAUSUL</td><td>: <span class="cat-pill {{ $finding->category === 'major_nc' ? 'cat-major' : 'cat-minor' }}">{{ $catLabel }}</span> &nbsp; Klausul {{ $finding->clause ?: '-' }}</td></tr>
        @endunless
        <tr><td class="lab">AUDITOR</td><td>: {{ $auditor->name ?? '-' }}</td></tr>
        <tr><td class="lab">AUDITEE</td><td>: {{ $auditee->name ?? '-' }}</td></tr>
    </table>

    @if ($isPfi)
        {{-- PFI: temuan bernomor pada area luas --}}
        <div class="sec-b" style="margin-top: 8px;">
            <ol class="findings"><li>{{ $finding->description }}</li></ol>
            <div style="height: 300px;"></div>
        </div>
    @else
        {{-- Minor / Major: workflow lengkap --}}
        <div class="sec-h">1. Uraian Ketidaksesuaian (Temuan)</div>
        <div class="sec-b">{{ $finding->description }}</div>

        <div class="sec-h">2. Analisa Akar Masalah (Root Cause)</div>
        <div class="sec-b">
            @if (count($rootCauses))
                <ol class="rc">@foreach ($rootCauses as $rc)<li>{{ $rc }}</li>@endforeach</ol>
            @else <span style="color:#777">&mdash;</span> @endif
        </div>

        <div class="sec-h">3. Tindakan Perbaikan (Corrective Action)</div>
        <div class="sec-b">{!! nl2br(e($finding->corrective_action ?: '—')) !!}</div>

        <div class="sec-h">4. Tindakan Pencegahan (Preventive Action)</div>
        <div class="sec-b">{!! nl2br(e($finding->preventive_action ?: '—')) !!}</div>

        <div class="sec-h">5. Verifikasi &amp; Penutupan</div>
        <table class="form verif">
            <tr>
                <td style="width: 50%;">
                    <div class="who">Verifikasi Auditor — {{ $finding->auditor->name ?? '-' }}</div>
                    <div>{{ $finding->auditor_verification_note ?: '—' }}</div>
                    <div class="dt">{{ $fmt($finding->auditor_verified_at) }}</div>
                </td>
                <td>
                    <div class="who">Verifikasi Lead Auditor — {{ $finding->verifier->name ?? '-' }}</div>
                    <div>{{ $finding->verification_note ?: '—' }} &nbsp;<span class="ok">CLOSED</span></div>
                    <div class="dt">{{ $fmt($finding->verified_at) }}</div>
                </td>
            </tr>
        </table>
    @endif

    {{-- Footer: date line + signature grid --}}
    <table style="margin-top: 10px;">
        <tr>
            <td style="vertical-align: bottom; border: none;">
                <div class="dateline"><b>Date Line :</b> {{ $fmt($finding->due_date) }}</div>
            </td>
            <td style="width: {{ $signWidth }}px; border: none;">
                <table class="sign">
                    <tr>
                        <th colspan="{{ $auditeeSigners->count() }}">AUDITEE</th>
                        <th>AUDITOR</th>
                        <th>LEAD AUDITOR</th>
                    </tr>
                    <tr>
                        @foreach ($auditeeSigners as $u)
                            @php ($sigU = $sig($u))
                            <td class="sig">@if ($sigU)<img src="{{ $sigU }}">@endif</td>
                        @endforeach
                        <td class="sig">@if ($sigA)<img src="{{ $sigA }}">@endif</td>
                        <td class="sig">@if ($sigL)<img src="{{ $sigL }}">@endif</td>
                    </tr>
                    <tr>
                        @foreach ($auditeeSigners as $u)
                            <td class="nm">{{ $u->name ?? '-' }}</td>
                        @endforeach
                        <td class="nm">{{ $auditor->name ?? '-' }}</td>
                        <td class="nm">{{ $leader->name ?? '-' }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

</body>
</html>
