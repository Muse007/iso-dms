import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    addChildAt,
    addSiblingAt,
    emptyNode,
    OutlineNode,
    removeAt,
    setTextAt,
} from '@/lib/sop';
import { CornerDownRight, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Props {
    label: string;
    /** Section letter used for auto numbering, e.g. "D" → D.1, D.1.1 … */
    prefix: string;
    nodes: OutlineNode[];
    onChange: (nodes: OutlineNode[]) => void;
    placeholder?: string;
}

export function OutlineEditor({ label, prefix, nodes, onChange, placeholder }: Props) {
    // Path (as a "0.1.2" string) of the input that should grab focus after the next render.
    // Set whenever we add a row so the cursor follows the user, like a normal list editor.
    const focusPath = useRef<string | null>(null);

    const onText = (path: number[], text: string) => onChange(setTextAt(nodes, path, text));
    const onAddChild = (path: number[]) => {
        onChange(addChildAt(nodes, path));
        // New child is appended as the last element under `path`.
        focusPath.current = [...path, childCount(nodes, path)].join('.');
    };
    const onAddSibling = (path: number[]) => {
        onChange(addSiblingAt(nodes, path));
        // New sibling is inserted right after `path`.
        const np = [...path];
        np[np.length - 1] += 1;
        focusPath.current = np.join('.');
    };
    const onRemove = (path: number[]) => onChange(removeAt(nodes, path));
    const onAddRoot = () => {
        onChange([...nodes, emptyNode()]);
        focusPath.current = String(nodes.length);
    };

    return (
        <div className="grid gap-2 rounded-md border bg-background p-3">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{label}</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={onAddRoot}>
                    <Plus className="size-3.5" /> Tambah
                </Button>
            </div>

            {nodes.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">Belum ada item.</p>
            ) : (
                <div className="grid gap-1.5">
                    {nodes.map((n, i) => (
                        <OutlineRow
                            key={i}
                            node={n}
                            path={[i]}
                            number={`${prefix}.${i + 1}`}
                            depth={0}
                            placeholder={placeholder}
                            focusPath={focusPath}
                            onText={onText}
                            onAddChild={onAddChild}
                            onAddSibling={onAddSibling}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            )}
            <p className="text-[11px] text-muted-foreground">
                Tekan <kbd className="rounded border px-1">Enter</kbd> untuk baris setingkat ·{' '}
                <kbd className="rounded border px-1">Tab</kbd> atau tombol <b>Sub</b> untuk sub-bab.
            </p>
        </div>
    );
}

/** Number of direct children at the node addressed by `path`. */
function childCount(nodes: OutlineNode[], path: number[]): number {
    let cur: OutlineNode[] | undefined = nodes;
    let node: OutlineNode | undefined;
    for (const i of path) {
        node = cur?.[i];
        cur = node?.children;
    }
    return node?.children.length ?? 0;
}

interface RowProps {
    node: OutlineNode;
    path: number[];
    number: string;
    depth: number;
    placeholder?: string;
    focusPath: React.MutableRefObject<string | null>;
    onText: (path: number[], text: string) => void;
    onAddChild: (path: number[]) => void;
    onAddSibling: (path: number[]) => void;
    onRemove: (path: number[]) => void;
}

function OutlineRow({
    node,
    path,
    number,
    depth,
    placeholder,
    focusPath,
    onText,
    onAddChild,
    onAddSibling,
    onRemove,
}: RowProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const pathKey = path.join('.');

    // Grab focus when this row is the one we just created.
    useEffect(() => {
        if (focusPath.current === pathKey) {
            inputRef.current?.focus();
            focusPath.current = null;
        }
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            // Default Enter = new row at the SAME level (never auto-nests).
            e.preventDefault();
            onAddSibling(path);
        } else if (e.key === 'Tab' && !e.shiftKey) {
            // Tab = demote into a sub-bab under this row.
            e.preventDefault();
            onAddChild(path);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 20 }}>
                <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground">{number}</span>
                <Input
                    ref={inputRef}
                    className="h-8 flex-1"
                    value={node.text}
                    placeholder={placeholder}
                    onChange={(e) => onText(path, e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 px-2 text-[11px]"
                    title="Tambah sub-bab di bawah baris ini (Tab)"
                    onClick={() => onAddChild(path)}
                >
                    <CornerDownRight className="size-3.5" /> Sub
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 px-2 text-[11px]"
                    title="Tambah baris setingkat (Enter)"
                    onClick={() => onAddSibling(path)}
                >
                    <Plus className="size-3.5" /> Tambah
                </Button>
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                    title="Hapus baris"
                    onClick={() => onRemove(path)}
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>

            {node.children.length > 0 && (
                <div className="mt-1.5 grid gap-1.5">
                    {node.children.map((c, ci) => (
                        <OutlineRow
                            key={ci}
                            node={c}
                            path={[...path, ci]}
                            number={`${number}.${ci + 1}`}
                            depth={depth + 1}
                            placeholder={placeholder}
                            focusPath={focusPath}
                            onText={onText}
                            onAddChild={onAddChild}
                            onAddSibling={onAddSibling}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
