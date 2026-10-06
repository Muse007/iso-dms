import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertTriangle, FileText, Image as ImageIcon, Paperclip, Upload, X } from 'lucide-react';
import { DragEvent, useEffect, useId, useRef, useState } from 'react';

interface RejectedFile {
    name: string;
    size: number;
    reason: string;
}

interface Props {
    /** Label di atas kontrol. Kosongkan bila pemanggil sudah menyediakan label sendiri. */
    label?: string;
    /** File yang sedang dipilih (controlled). */
    value: File[];
    onChange: (files: File[]) => void;
    /** Daftar ekstensi untuk atribut accept, mis. '.jpg,.jpeg,.png,.pdf'. */
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    required?: boolean;
    /** Teks bantuan kecil di bawah tombol; default menjelaskan format & batas ukuran. */
    hint?: string;
    /** Batas ukuran per file dalam MB — dipakai untuk hint dan validasi sisi klien. */
    maxSizeMb?: number;
    /**
     * Batas jumlah berkas. Default 8: satu form bisa memuat dua FilePicker
     * (corrective + preventive) sedangkan PHP membatasi `max_file_uploads`
     * pada 20 berkas per request DAN MEMOTONG KELEBIHANNYA TANPA ERROR.
     */
    maxFiles?: number;
    /**
     * Dipanggil setiap kali status "ada berkas yang ditolak" berubah.
     *
     * Pemanggil WAJIB memakainya untuk mengunci tombol submit. Sebelumnya
     * berkas yang ditolak hanya dibuang diam-diam: dari sisi pengguna berkas
     * yang baru dipilih "tiba-tiba hilang" dari daftar, form tetap bisa
     * dikirim, dan temuan tersimpan tanpa bukti sama sekali (mis. temuan
     * #83/#85/#86 audit 31 — submit 6 Agu 2026 tanpa satu pun lampiran).
     */
    onBlockedChange?: (blocked: boolean) => void;
    error?: string;
    className?: string;
}

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const isImage = (name: string) => /\.(jpe?g|png|webp|gif)$/i.test(name);

const fileKey = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;

/**
 * Pemilih berkas dengan tombol "Pilih File" yang jelas + area drag & drop.
 * Menggantikan `<input type="file">` bawaan browser yang nyaris tak terlihat
 * di antara field lain sehingga user kerap tidak sadar bisa melampirkan bukti.
 *
 * Prinsip: berkas yang tidak memenuhi syarat TIDAK PERNAH dibuang diam-diam.
 * Berkas itu tetap tampil dalam daftar bertanda merah beserta alasannya, dan
 * `onBlockedChange` memberi tahu form induk untuk mengunci tombol submit
 * sampai pengguna menyingkirkan atau mengganti berkas tersebut.
 */
export function FilePicker({
    label,
    value,
    onChange,
    accept = '.jpg,.jpeg,.png,.pdf',
    multiple = true,
    disabled = false,
    required = false,
    hint,
    maxSizeMb = 20,
    maxFiles = 8,
    onBlockedChange,
    error,
    className = '',
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useId();
    const [dragging, setDragging] = useState(false);
    const [rejected, setRejected] = useState<RejectedFile[]>([]);

    // Disimpan di ref supaya callback inline dari pemanggil tidak memicu
    // effect berjalan ulang setiap render.
    const blockedCb = useRef(onBlockedChange);
    blockedCb.current = onBlockedChange;

    const blocked = rejected.length > 0;
    useEffect(() => {
        blockedCb.current?.(blocked);
    }, [blocked]);

    const accepted = accept
        .split(',')
        .map((a) => a.trim().replace(/^\./, '').toLowerCase())
        .filter(Boolean);

    const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

    const merge = (incoming: File[]) => {
        const fit: File[] = [];
        const bad: RejectedFile[] = [];
        // Kuota sisa dihitung dari berkas yang sudah diterima, bukan dari
        // jumlah incoming — supaya menambah lewat beberapa kali pilih tetap
        // terkunci pada batas yang sama.
        let slots = (multiple ? maxFiles : 1) - value.length;

        for (const f of incoming) {
            if (accepted.length && !accepted.includes(extOf(f.name))) {
                bad.push({ name: f.name, size: f.size, reason: `format .${extOf(f.name) || '?'} tidak didukung` });
            } else if (f.size > maxSizeMb * 1024 * 1024) {
                bad.push({ name: f.name, size: f.size, reason: `melebihi ${maxSizeMb} MB` });
            } else if (slots <= 0) {
                bad.push({ name: f.name, size: f.size, reason: `melebihi batas ${multiple ? maxFiles : 1} berkas` });
            } else {
                fit.push(f);
                slots--;
            }
        }

        if (bad.length) {
            // Cegah duplikat bila berkas yang sama dipilih ulang.
            setRejected((prev) => {
                const seen = new Set(prev.map((r) => `${r.name}|${r.size}`));
                return [...prev, ...bad.filter((r) => !seen.has(`${r.name}|${r.size}`))];
            });
        }

        if (!fit.length) return;
        if (!multiple) {
            onChange([fit[0]]);
            return;
        }
        // Cegah duplikat saat user memilih ulang / menambah lewat drag & drop.
        const seen = new Set(value.map(fileKey));
        onChange([...value, ...fit.filter((f) => !seen.has(fileKey(f)))]);
    };

    const pick = (list: FileList | null) => {
        merge(Array.from(list ?? []));
        // Reset agar memilih file yang sama dua kali tetap memicu onChange.
        if (inputRef.current) inputRef.current.value = '';
    };

    const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
    const dismissRejected = (index: number) => setRejected((prev) => prev.filter((_, i) => i !== index));

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        pick(e.dataTransfer.files);
    };

    return (
        <div className={className}>
            {label && (
                <Label htmlFor={inputId} className="text-xs">
                    {label} {required && <span className="text-red-600">*</span>}
                </Label>
            )}

            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!disabled) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={[
                    'mt-1 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors',
                    disabled
                        ? 'cursor-not-allowed border-muted bg-muted/30 opacity-60'
                        : dragging
                          ? 'border-[#b91c1c] bg-red-50'
                          : 'border-input bg-muted/20 hover:border-[#b91c1c]/50 hover:bg-muted/40',
                ].join(' ')}
            >
                <Upload className={`size-5 ${dragging ? 'text-[#b91c1c]' : 'text-muted-foreground'}`} />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                    className="gap-1.5 border-[#b91c1c]/40 font-semibold text-[#b91c1c] hover:bg-red-50 hover:text-[#7f1d1d]"
                >
                    <Paperclip className="size-3.5" />
                    {multiple ? 'Pilih File / Browse' : 'Pilih File'}
                </Button>
                <p className="text-[11px] leading-tight text-muted-foreground">
                    {hint ?? (
                        <>
                            Klik tombol di atas atau seret berkas ke sini
                            <br />
                            {accepted.map((a) => a.toUpperCase()).join(' · ')} — maks {maxSizeMb} MB per file
                            {multiple && `, hingga ${maxFiles} berkas`}
                        </>
                    )}
                </p>
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    className="sr-only"
                    accept={accept}
                    multiple={multiple}
                    disabled={disabled}
                    onChange={(e) => pick(e.target.files)}
                />
            </div>

            {(value.length > 0 || rejected.length > 0) && (
                <ul className="mt-2 space-y-1">
                    {value.map((f, i) => (
                        <li
                            key={`ok-${f.name}-${f.size}-${i}`}
                            className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-xs"
                        >
                            {isImage(f.name) ? (
                                <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span className="min-w-0 flex-1 truncate" title={f.name}>
                                {f.name}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{formatSize(f.size)}</span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => remove(i)}
                                    title={`Hapus ${f.name}`}
                                    aria-label={`Hapus ${f.name}`}
                                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </li>
                    ))}

                    {/* Berkas yang ditolak tetap terlihat — pengguna harus sadar
                        berkasnya TIDAK ikut terkirim, bukan menemukannya lenyap. */}
                    {rejected.map((r, i) => (
                        <li
                            key={`bad-${r.name}-${r.size}-${i}`}
                            className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-2 py-1.5 text-xs text-red-800"
                        >
                            <AlertTriangle className="size-3.5 shrink-0" />
                            <span className="min-w-0 flex-1 truncate" title={r.name}>
                                <span className="line-through">{r.name}</span>{' '}
                                <span className="font-medium">— {r.reason}, tidak dilampirkan</span>
                            </span>
                            <span className="shrink-0 text-[11px]">{formatSize(r.size)}</span>
                            <button
                                type="button"
                                onClick={() => dismissRejected(i)}
                                title={`Singkirkan ${r.name}`}
                                aria-label={`Singkirkan ${r.name}`}
                                className="shrink-0 rounded p-0.5 hover:bg-red-100"
                            >
                                <X className="size-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {blocked && (
                <p role="alert" className="mt-1 text-xs font-medium text-red-700">
                    Ada berkas yang tidak bisa dilampirkan. Singkirkan atau ganti berkas tersebut sebelum menyimpan —
                    berkas bertanda merah tidak akan terkirim.
                </p>
            )}

            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
