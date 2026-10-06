import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertOctagon,
    BookOpen,
    Building2,
    CheckCircle2,
    ClipboardList,
    FileText,
    Gauge,
    GraduationCap,
    Handshake,
    KeyRound,
    LayoutDashboard,
    LineChart,
    Mail,
    Radio,
    SearchCheck,
    TriangleAlert,
    Users,
} from 'lucide-react';

/**
 * `roles` mencerminkan penjagaan rute di routes/web.php. Menu yang rutenya
 * dibatasi role tertentu disembunyikan, supaya user tidak diarahkan ke halaman
 * yang pasti ditolak.
 */
type Item = { title: string; url: string; icon: typeof LayoutDashboard; badge?: string; roles?: string[] };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
    {
        label: 'Main',
        items: [
            { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, badge: 'LIVE' },
            { title: 'Approval Queue', url: '/approvals', icon: CheckCircle2 },
        ],
    },
    {
        label: 'Compliance',
        items: [
            { title: 'Document Control', url: '/documents', icon: FileText },
            { title: 'Prosedur / Work Instr.', url: '/documents?type=sop', icon: BookOpen },
            { title: 'Audits', url: '/audits', icon: SearchCheck },
        ],
    },
    {
        label: 'Quality & Risk',
        items: [
            { title: 'NCR / CAR / CAPA', url: '/ncr', icon: AlertOctagon },
            { title: 'Risk Register', url: '/risks', icon: TriangleAlert },
            { title: 'KPI Monitoring', url: '/kpis', icon: Activity },
        ],
    },
    {
        label: 'Operations',
        items: [
            { title: 'Suppliers', url: '/suppliers', icon: Handshake },
            { title: 'Trainings', url: '/trainings', icon: GraduationCap },
            { title: 'Asset Calibration', url: '/assets', icon: Gauge },
        ],
    },
    {
        label: 'Administration',
        items: [
            { title: 'Departments', url: '/departments', icon: Building2, roles: ['super_admin', 'qmr', 'director'] },
            { title: 'Users', url: '/users', icon: Users, roles: ['super_admin', 'qmr'] },
            { title: 'Roles & Permissions', url: '/roles', icon: KeyRound, roles: ['super_admin', 'qmr'] },
            { title: 'Email (SMTP)', url: '/settings/mail', icon: Mail, roles: ['super_admin', 'qmr'] },
            { title: 'Report Center', url: '/dashboard', icon: LineChart },
        ],
    },
];

export function AppSidebar() {
    const page = usePage<SharedData>();
    const roles = page.props.auth?.roles ?? [];
    const allowed = (item: Item) => !item.roles || item.roles.some((r) => roles.includes(r));
    // Grup yang seluruh menunya tersembunyi tidak perlu menyisakan judul kosong.
    const visibleGroups = groups
        .map((g) => ({ ...g, items: g.items.filter(allowed) }))
        .filter((g) => g.items.length > 0);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <div className="flex aspect-square size-9 items-center justify-center rounded-xl border bg-white p-1 shadow-sm">
                                    <img
                                        src="/bti_logo_hires.png"
                                        alt="Bonecom Tricom"
                                        className="size-full object-contain"
                                    />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-bold tracking-tight">ISO DMS</span>
                                    <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                                        Bonecom Tricom
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {visibleGroups.map((g) => (
                    <SidebarGroup key={g.label} className="px-2 py-0">
                        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                            {g.label}
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {g.items.map((item) => {
                                const Icon = item.icon;
                                const active =
                                    page.url === item.url ||
                                    (item.url !== '/dashboard' && page.url.startsWith(item.url.split('?')[0]));
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={active}>
                                            <Link href={item.url} prefetch>
                                                <Icon />
                                                <span>{item.title}</span>
                                                {item.badge && (
                                                    <span className="ml-auto rounded bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
                <SidebarGroup className="px-2 py-0">
                    <div className="mt-2 rounded-xl bg-gradient-to-br from-[#b91c1c] via-[#dc2626] to-[#f97316] p-3 text-white shadow-md">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                            <Radio className="size-3.5" />
                            Audit Mode 2026
                        </div>
                        <p className="mt-1 text-[11px] leading-snug opacity-90">
                            External surveillance audit in 18 days. Compliance score on target.
                        </p>
                    </div>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
