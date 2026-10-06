import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useState } from 'react';

const BASE = ['00', '01', '02', '03'];

/** "Rev. 00" for plain numeric values; legacy values (e.g. "1.0") shown as-is. */
const fmt = (v: string) => (/^\d+$/.test(v) ? `Rev. ${v}` : v);

interface Props {
    value: string;
    onChange: (v: string) => void;
}

/** Revision picker: checklist of Rev. 00–03 + "Rev" to add the next revision. */
export function RevisionSelect({ value, onChange }: Props) {
    const [extra, setExtra] = useState<string[]>([]);

    const options = Array.from(new Set([...BASE, ...extra, value].filter(Boolean)));
    options.sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
    });

    const addRev = () => {
        const nums = options.map((o) => parseInt(o, 10)).filter((n) => !isNaN(n));
        const next = nums.length ? Math.max(...nums) + 1 : 0;
        const val = String(next).padStart(2, '0');
        setExtra((e) => [...e, val]);
        onChange(val);
    };

    return (
        <div className="flex items-center gap-2">
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih revisi" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((o) => (
                        <SelectItem key={o} value={o}>{fmt(o)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={addRev} title="Tambah revisi berikutnya">
                <Plus className="size-3.5" /> Rev
            </Button>
        </div>
    );
}
