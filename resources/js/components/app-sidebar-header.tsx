import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationBell } from '@/components/notification-bell';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Search } from 'lucide-react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    return (
        <header className="sticky top-0 z-20 border-b border-sidebar-border/50 bg-background/85 backdrop-blur-md transition-[width,height] ease-linear">
            {/* Brand gradient line — matches mockup */}
            <div
                className="h-[2px] w-full"
                style={{
                    backgroundImage:
                        'linear-gradient(90deg,#b91c1c,#f97316,#10b981,#0ea5e9,#b91c1c)',
                    backgroundSize: '300% 100%',
                }}
            />

            <div className="flex h-16 shrink-0 items-center gap-2 px-4 group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 md:px-6">
                <SidebarTrigger className="-ml-1" />
                <div className="hidden md:block">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>

                {/* Search trigger (visual only — wires up to /documents?q=...) */}
                {/* Disembunyikan penuh di bawah sm: tanpa ini wrapper tetap
                    mengambil w-full meski tombolnya hidden, sehingga header
                    meluber melewati viewport dan halaman bisa digeser
                    horizontal — membuat bottom nav terasa ikut bergeser. */}
                <div className="ml-auto hidden w-full min-w-0 max-w-md items-center sm:flex">
                    <button
                        type="button"
                        className="hidden h-9 w-full items-center gap-3 rounded-lg bg-muted/60 px-3 text-sm text-muted-foreground transition hover:bg-muted sm:flex"
                        onClick={() => {
                            const q = window.prompt('Search documents, NCR, audits…');
                            if (q) window.location.href = `/documents?q=${encodeURIComponent(q)}`;
                        }}
                    >
                        <Search className="size-4" />
                        <span>Search documents, audits, NCR…</span>
                        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] md:inline">
                            ⌘K
                        </kbd>
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <AppearanceToggleDropdown />

                    <NotificationBell />
                </div>
            </div>
        </header>
    );
}
