import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { Link } from '@inertiajs/react';
import { LogOut } from 'lucide-react';

/**
 * Bagian terakhir halaman profil.
 *
 * Menggantikan blok "Delete account" bawaan starter kit. Pada QMS, akun
 * terikat pada rekam jejak audit, dokumen, dan approval — menghapusnya
 * sendiri lewat halaman profil berisiko memutus jejak audit yang wajib
 * dipertahankan. Penonaktifan akun ditangani administrator lewat modul Users.
 */
export default function LogoutSection() {
    const cleanup = useMobileNavigation();

    return (
        <div className="space-y-6">
            <HeadingSmall title="Keluar" description="Akhiri sesi Anda di perangkat ini" />

            <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-sm text-muted-foreground">
                    Anda akan keluar dari sesi saat ini. Data dan riwayat aktivitas Anda tetap tersimpan.
                </p>

                <Button asChild variant="destructive" className="w-full gap-2 sm:w-auto">
                    <Link method="post" href={route('logout')} as="button" onClick={cleanup}>
                        <LogOut className="size-4" />
                        Logout
                    </Link>
                </Button>
            </div>
        </div>
    );
}
