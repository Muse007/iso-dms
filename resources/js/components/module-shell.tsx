import { Card, CardContent } from '@/components/ui/card';
import { ReactNode } from 'react';

export function ModuleShell({
    title,
    subtitle,
    actions,
    children,
}: {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            <Card>
                <CardContent className="overflow-x-auto p-0">{children}</CardContent>
            </Card>
        </div>
    );
}

export function EmptyRow({ cols, label }: { cols: number; label: string }) {
    return (
        <tr>
            <td colSpan={cols} className="px-4 py-12 text-center text-sm text-muted-foreground">
                {label}
            </td>
        </tr>
    );
}
