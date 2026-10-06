import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type NotificationItem, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Bell, CheckCircle2, CircleDot, Info } from 'lucide-react';

const typeIcon: Record<string, typeof Info> = {
    action: CircleDot,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
};
const typeColor: Record<string, string> = {
    action: 'text-[#b91c1c]',
    warning: 'text-amber-600',
    success: 'text-emerald-600',
    info: 'text-sky-600',
};

export function NotificationBell() {
    const { notifications } = usePage<SharedData>().props;
    const items: NotificationItem[] = notifications?.items ?? [];
    const unread = notifications?.unread ?? 0;

    const readAll = () =>
        router.post('/notifications/read-all', {}, { preserveScroll: true, preserveState: true });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-md">
                    <Bell className="size-4" />
                    {unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-background">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                    <span className="sr-only">Notifikasi</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
                <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm font-semibold">Notifikasi</span>
                    {unread > 0 && (
                        <button onClick={readAll} className="text-[11px] font-medium text-[#b91c1c] hover:underline">
                            Tandai semua dibaca
                        </button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-0" />

                <div className="max-h-[22rem] overflow-y-auto">
                    {items.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</div>
                    )}
                    {items.map((n) => {
                        const Icon = typeIcon[n.type] ?? Info;
                        const body = (
                            <div className={`flex items-start gap-3 px-3 py-2.5 ${!n.read ? 'bg-[#b91c1c]/[0.04]' : ''}`}>
                                <Icon className={`mt-0.5 size-4 shrink-0 ${typeColor[n.type] ?? 'text-sky-600'}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-semibold text-foreground">{n.title}</span>
                                        {!n.read && <span className="size-2 shrink-0 rounded-full bg-[#dc2626]" />}
                                    </div>
                                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>
                                    <div className="mt-1 text-[10px] text-muted-foreground/80">{n.ago}</div>
                                </div>
                            </div>
                        );
                        return n.url ? (
                            <Link key={n.id} href={`/notifications/${n.id}/go`} className="block hover:bg-muted/60">
                                {body}
                            </Link>
                        ) : (
                            <div key={n.id} className="hover:bg-muted/60">{body}</div>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
