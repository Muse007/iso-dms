import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { type BreadcrumbItem } from '@/types';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: { children: React.ReactNode; breadcrumbs?: BreadcrumbItem[] }) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
                {/* Ruang agar konten terakhir tidak tertutup bottom nav (mobile saja).
                    Tombol Audit menonjol ~12px di atas bar, jadi jarak aman dihitung
                    dari puncak tombol, bukan dari tinggi bar. */}
                <div aria-hidden className="h-[calc(84px+env(safe-area-inset-bottom))] md:hidden" />
            </AppContent>
            <MobileBottomNav />
        </AppShell>
    );
}
