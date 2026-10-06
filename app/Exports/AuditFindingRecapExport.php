<?php

namespace App\Exports;

use App\Models\Audit;
use App\Models\AuditFinding;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

/**
 * Rekapitulasi Temuan Audit Mutu Internal — form FM-BDK-009.
 *
 * Menyusun ulang formulir kertas ke dalam satu worksheet: kop (logo, judul,
 * nomor & revisi form), baris periode berisi rekap jumlah per kategori/status,
 * lalu tabel temuan dengan tanda centang pada kolom kategori dan status.
 */
class AuditFindingRecapExport
{
    public const FORM_NO       = 'FM - BDK - 009';
    public const FORM_REVISION = '00 / 01-02-2013';

    private const CHECK = '✓';

    /** Kolom A…L beserta lebarnya (satuan lebar karakter Excel). */
    private const WIDTHS = [
        'A' => 5,   'B' => 14, 'C' => 13, 'D' => 68, 'E' => 6,  'F' => 7,
        'G' => 7,   'H' => 7,  'I' => 7,  'J' => 20, 'K' => 20, 'L' => 26,
    ];

    private const HEAD_ROW_1 = 5;   // baris header grup (Kategori / Status)
    private const HEAD_ROW_2 = 6;   // baris header sub-kolom
    private const FIRST_DATA = 7;

    /** @param Collection<int,AuditFinding> $findings sudah ter-eager-load: audit.department, owner, auditor */
    public function __construct(
        private Collection $findings,
        private string $periode,
    ) {}

    /**
     * Bangun rekap dari sekumpulan audit — temuan diurutkan per audit lalu
     * mengikuti nomor referensi agar sama dengan urutan pada laporan audit.
     *
     * @param Collection<int,Audit> $audits
     */
    public static function forAudits(Collection $audits): self
    {
        $findings = AuditFinding::query()
            ->whereIn('audit_id', $audits->pluck('id'))
            ->with([
                'audit:id,code,title,department_id,planned_date,period_label,lead_auditor_id,actual_lead_auditor_id',
                'audit.department:id,name',
                'audit.leadAuditor:id,name',
                'audit.actualLeadAuditor:id,name',
                'owner:id,name,department_id',
                'owner.department:id,name',
                'auditor:id,name',
            ])
            ->orderBy('audit_id')
            ->orderBy('reference')
            ->orderBy('id')
            ->get();

        return new self($findings, self::periodeLabel($audits));
    }

    /** Nama file unduhan, mis. "FM-BDK-009 Rekap Temuan Audit - Semester 1 Tahun 2026.xlsx". */
    public function filename(): string
    {
        $periode = preg_replace('/[^A-Za-z0-9 \-]/', '', $this->periode) ?: 'Semua Periode';

        return "FM-BDK-009 Rekap Temuan Audit - {$periode}.xlsx";
    }

    public function build(): Spreadsheet
    {
        $book  = new Spreadsheet();
        $sheet = $book->getActiveSheet();
        $sheet->setTitle('Rekap Temuan');

        $book->getProperties()
            ->setTitle('Rekapitulasi Temuan Audit Mutu Internal')
            ->setSubject(self::FORM_NO)
            ->setCompany('PT Bonecom Tricom');

        $book->getDefaultStyle()->getFont()->setName('Calibri')->setSize(10);

        foreach (self::WIDTHS as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        $this->renderHeader($sheet);
        $this->renderPeriode($sheet);
        $this->renderTableHead($sheet);
        $lastRow = $this->renderRows($sheet);
        $this->renderPageSetup($sheet, $lastRow);

        return $book;
    }

    // ───────────────────────────── bagian-bagian sheet ─────────────────────────────

    private function renderHeader(Worksheet $sheet): void
    {
        $sheet->getRowDimension(1)->setRowHeight(26);
        $sheet->getRowDimension(2)->setRowHeight(26);

        $sheet->mergeCells('A1:C2');
        $sheet->mergeCells('D1:I2');
        $sheet->mergeCells('J1:L1');
        $sheet->mergeCells('J2:L2');

        $sheet->setCellValue('D1', 'REKAPITULASI TEMUAN AUDIT MUTU INTERNAL');
        $sheet->getStyle('D1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('D1')->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);

        $sheet->setCellValue('J1', 'No.      : '.self::FORM_NO);
        $sheet->setCellValue('J2', 'Revisi  : '.self::FORM_REVISION);
        $sheet->getStyle('J1:L2')->getFont()->setSize(9);
        $sheet->getStyle('J1:L2')->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_LEFT)
            ->setVertical(Alignment::VERTICAL_CENTER)
            ->setIndent(1);

        $this->box($sheet, 'A1:L2');

        // Logo perusahaan — dilewati bila berkas tidak ada agar export tetap jalan.
        $logo = public_path('bti_logo_hires.png');
        if (is_file($logo)) {
            $drawing = new Drawing();
            $drawing->setName('Logo');
            $drawing->setDescription('PT Bonecom Tricom');
            $drawing->setPath($logo);
            $drawing->setHeight(52);
            $drawing->setOffsetX(10);
            $drawing->setOffsetY(6);
            $drawing->setCoordinates('A1');
            $drawing->setWorksheet($sheet);
        }
    }

    private function renderPeriode(Worksheet $sheet): void
    {
        $row = 4;
        $sheet->getRowDimension($row)->setRowHeight(20);

        $sheet->mergeCells("A{$row}:D{$row}");
        $sheet->setCellValue("A{$row}", "PERIODE   : {$this->periode}");
        $sheet->getStyle("A{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}")->getAlignment()
            ->setVertical(Alignment::VERTICAL_CENTER)
            ->setIndent(1);

        // Rekap jumlah, sejajar dengan kolom kategori & status di bawahnya.
        $counts = $this->counts();
        foreach (['E' => 'pfi', 'F' => 'minor', 'G' => 'major', 'H' => 'close', 'I' => 'open'] as $col => $key) {
            $sheet->setCellValue("{$col}{$row}", $counts[$key]);
        }
        $sheet->getStyle("E{$row}:I{$row}")->getFont()->setBold(true)->setSize(12);
        $sheet->getStyle("E{$row}:I{$row}")->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);

        $sheet->mergeCells("J{$row}:L{$row}");
        $sheet->setCellValue("J{$row}", 'Total temuan : '.$this->findings->count());
        $sheet->getStyle("J{$row}")->getFont()->setBold(true);
        $sheet->getStyle("J{$row}")->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_RIGHT)
            ->setVertical(Alignment::VERTICAL_CENTER)
            ->setIndent(1);

        $this->box($sheet, "A{$row}:L{$row}");
    }

    private function renderTableHead(Worksheet $sheet): void
    {
        $r1 = self::HEAD_ROW_1;
        $r2 = self::HEAD_ROW_2;

        $sheet->getRowDimension($r1)->setRowHeight(18);
        $sheet->getRowDimension($r2)->setRowHeight(18);

        foreach (['A' => 'No', 'B' => 'Bagian', 'C' => 'Klausul', 'D' => 'Non Conformance',
                  'J' => 'Auditee', 'K' => 'Auditor', 'L' => 'Keterangan'] as $col => $title) {
            $sheet->mergeCells("{$col}{$r1}:{$col}{$r2}");
            $sheet->setCellValue("{$col}{$r1}", $title);
        }

        $sheet->mergeCells("E{$r1}:G{$r1}");
        $sheet->setCellValue("E{$r1}", 'Kategori');
        $sheet->mergeCells("H{$r1}:I{$r1}");
        $sheet->setCellValue("H{$r1}", 'Status');

        foreach (['E' => 'PFI', 'F' => 'Minor', 'G' => 'Major', 'H' => 'Close', 'I' => 'Open'] as $col => $title) {
            $sheet->setCellValue("{$col}{$r2}", $title);
        }

        $head = "A{$r1}:L{$r2}";
        $sheet->getStyle($head)->getFont()->setBold(true)->setSize(10);
        $sheet->getStyle($head)->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER)
            ->setWrapText(true);
        $sheet->getStyle($head)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFDCE6F1');
        $this->box($sheet, $head);
    }

    /** @return int nomor baris terakhir yang terisi data */
    private function renderRows(Worksheet $sheet): int
    {
        $row = self::FIRST_DATA;
        $no  = 1;

        foreach ($this->findings as $f) {
            $isClosed = $f->status === AuditFinding::STATUS_CLOSED;

            $sheet->setCellValue("A{$row}", $no);
            $sheet->setCellValue("B{$row}", $this->bagian($f));
            // Klausul ditulis sebagai teks: "8.5.1.5" akan dianggap tanggal/angka bila tidak dipaksa.
            $sheet->setCellValueExplicit("C{$row}", (string) ($f->clause ?? '—'), DataType::TYPE_STRING);
            $sheet->setCellValue("D{$row}", trim((string) $f->description));

            $sheet->setCellValue("E{$row}", $f->category === AuditFinding::CAT_PFI   ? self::CHECK : '');
            $sheet->setCellValue("F{$row}", $f->category === AuditFinding::CAT_MINOR ? self::CHECK : '');
            $sheet->setCellValue("G{$row}", $f->category === AuditFinding::CAT_MAJOR ? self::CHECK : '');
            $sheet->setCellValue("H{$row}", $isClosed ? self::CHECK : '');
            $sheet->setCellValue("I{$row}", $isClosed ? '' : self::CHECK);

            $sheet->setCellValue("J{$row}", $f->owner?->name ?? '—');
            $sheet->setCellValue("K{$row}", $this->auditor($f));
            $sheet->setCellValue("L{$row}", $this->keterangan($f));

            $row++;
            $no++;
        }

        // Tetap sediakan satu baris kosong bila belum ada temuan, agar tabel tidak "menggantung".
        $last = max($row - 1, self::FIRST_DATA);

        $body = 'A'.self::FIRST_DATA.":L{$last}";
        $sheet->getStyle($body)->getAlignment()
            ->setVertical(Alignment::VERTICAL_CENTER)
            ->setWrapText(true);
        $sheet->getStyle('A'.self::FIRST_DATA.":A{$last}")
            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('C'.self::FIRST_DATA.":C{$last}")
            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('E'.self::FIRST_DATA.":I{$last}")
            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('E'.self::FIRST_DATA.":I{$last}")->getFont()->setBold(true);
        $sheet->getStyle('D'.self::FIRST_DATA.":D{$last}")
            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_JUSTIFY);
        $sheet->getStyle($body)->getFont()->setSize(9);
        $this->box($sheet, $body);

        return $last;
    }

    private function renderPageSetup(Worksheet $sheet, int $lastRow): void
    {
        $setup = $sheet->getPageSetup();
        $setup->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $setup->setPaperSize(PageSetup::PAPERSIZE_A4);
        $setup->setFitToWidth(1);
        $setup->setFitToHeight(0);
        $setup->setRowsToRepeatAtTopByStartAndEnd(self::HEAD_ROW_1, self::HEAD_ROW_2);
        $setup->setPrintArea("A1:L{$lastRow}");

        $sheet->getPageMargins()->setTop(0.4)->setBottom(0.4)->setLeft(0.3)->setRight(0.3);
        $sheet->freezePane('A'.self::FIRST_DATA);
        $sheet->setSelectedCell('A1');
    }

    // ───────────────────────────── penolong ─────────────────────────────

    /** @return array{pfi:int,minor:int,major:int,close:int,open:int} */
    private function counts(): array
    {
        return [
            'pfi'   => $this->findings->where('category', AuditFinding::CAT_PFI)->count(),
            'minor' => $this->findings->where('category', AuditFinding::CAT_MINOR)->count(),
            'major' => $this->findings->where('category', AuditFinding::CAT_MAJOR)->count(),
            'close' => $this->findings->where('status', AuditFinding::STATUS_CLOSED)->count(),
            'open'  => $this->findings->where('status', '!=', AuditFinding::STATUS_CLOSED)->count(),
        ];
    }

    /** Bagian = departemen yang diaudit; mundur ke departemen PIC bila audit tidak terikat departemen. */
    private function bagian(AuditFinding $f): string
    {
        return $f->audit?->department?->name
            ?? $f->owner?->department?->name
            ?? '—';
    }

    /** Auditor pembuat temuan; bila kosong, pakai lead auditor pelaksana audit tsb. */
    private function auditor(AuditFinding $f): string
    {
        return $f->auditor?->name
            ?? $f->audit?->actualLeadAuditor?->name
            ?? $f->audit?->leadAuditor?->name
            ?? '—';
    }

    /**
     * Keterangan ringkas: tanggal penutupan untuk temuan closed, atau status
     * jatuh tempo untuk temuan yang masih berjalan (overdue bila due date lewat).
     */
    private function keterangan(AuditFinding $f): string
    {
        if ($f->status === AuditFinding::STATUS_CLOSED) {
            return $f->closed_at ? 'Closed '.$f->closed_at->format('d-m-Y') : 'Closed';
        }

        if ($f->status === AuditFinding::STATUS_REJECTED) {
            return 'Ditolak';
        }

        if (! $f->due_date) {
            return '';
        }

        $due = $f->due_date->format('d-m-Y');

        return $f->isOverdue() ? "OVERDUE (due {$due})" : "Due {$due}";
    }

    /**
     * Label periode: pakai period_label bila seluruh audit terpilih seperiode,
     * selain itu rentang tanggal rencana audit.
     *
     * @param Collection<int,Audit> $audits
     */
    private static function periodeLabel(Collection $audits): string
    {
        $labels = $audits->pluck('period_label')->filter()->unique();
        if ($labels->count() === 1) {
            return (string) $labels->first();
        }

        $dates = $audits->pluck('planned_date')->filter()->sort()->values();
        if ($dates->isEmpty()) {
            return $labels->isNotEmpty() ? $labels->implode(', ') : 'Semua Periode';
        }

        $from = $dates->first()->format('d-m-Y');
        $to   = $dates->last()->format('d-m-Y');

        return $from === $to ? $from : "{$from} s/d {$to}";
    }

    /** Garis tepi tipis hitam pada seluruh sel dalam rentang. */
    private function box(Worksheet $sheet, string $range): void
    {
        $sheet->getStyle($range)->getBorders()->getAllBorders()
            ->setBorderStyle(Border::BORDER_THIN)
            ->getColor()->setARGB('FF000000');
    }
}
