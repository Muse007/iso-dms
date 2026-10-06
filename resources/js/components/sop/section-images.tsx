import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePlus, X } from 'lucide-react';
import { useId } from 'react';

interface Props {
    /** Section letter (D–G) — used only for the input id / label. */
    section: string;
    label?: string;
    /** Existing stored paths the user is keeping. */
    existing: string[];
    /** Newly picked files (not yet uploaded). */
    newFiles: File[];
    onExistingChange: (paths: string[]) => void;
    onNewChange: (files: File[]) => void;
    error?: string;
}

/** Multi-image attachment picker for an SOP section (keeps existing + adds new). */
export function SectionImages({
    section,
    label = 'Lampiran Gambar',
    existing,
    newFiles,
    onExistingChange,
    onNewChange,
    error,
}: Props) {
    const inputId = useId();

    const removeExisting = (i: number) => onExistingChange(existing.filter((_, idx) => idx !== i));
    const removeNew = (i: number) => onNewChange(newFiles.filter((_, idx) => idx !== i));
    const addFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        onNewChange([...newFiles, ...Array.from(files)]);
    };

    const total = existing.length + newFiles.length;

    return (
        <div className="mt-2 grid gap-2 rounded-md border border-dashed bg-muted/20 p-2.5">
            <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                    {label} {total > 0 && <span className="font-normal">({total})</span>}
                </Label>
                <label
                    htmlFor={inputId}
                    className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-transparent px-2 text-[11px] hover:bg-muted/50"
                >
                    <ImagePlus className="size-3.5 text-muted-foreground" /> Tambah gambar
                </label>
                <Input
                    id={inputId}
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = ''; // allow re-picking the same file
                    }}
                />
            </div>

            {total === 0 ? (
                <p className="text-[11px] italic text-muted-foreground">Belum ada gambar untuk bab {section}.</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {existing.map((path, i) => (
                        <Thumb key={`e-${i}`} src={`/storage/${path}`} onRemove={() => removeExisting(i)} />
                    ))}
                    {newFiles.map((file, i) => (
                        <Thumb key={`n-${i}`} src={URL.createObjectURL(file)} badge="baru" onRemove={() => removeNew(i)} />
                    ))}
                </div>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

function Thumb({ src, badge, onRemove }: { src: string; badge?: string; onRemove: () => void }) {
    return (
        <div className="relative size-20 overflow-hidden rounded-md border bg-white">
            <img src={src} alt="lampiran" className="size-full object-contain" />
            {badge && (
                <span className="absolute bottom-0 left-0 bg-emerald-600/90 px-1 text-[9px] font-semibold text-white">
                    {badge}
                </span>
            )}
            <button
                type="button"
                onClick={onRemove}
                className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-red-600/90 text-white hover:bg-red-700"
                title="Hapus gambar"
            >
                <X className="size-3" />
            </button>
        </div>
    );
}
