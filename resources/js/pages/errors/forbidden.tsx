import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Lock } from 'lucide-react';

interface Props {
    message?: string;
}

/**
 * Halaman yang berada di luar hak akses user. Sengaja tampil di dalam layout
 * aplikasi sebagai pemberitahuan, bukan halaman error — user tetap bisa
 * melanjutkan kerja tanpa merasa aplikasinya rusak.
 */
export default function Forbidden({ message }: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Akses Ditolak', href: '#' }]}>
            <Head title="Akses Ditolak" />

            <div className="flex flex-1 items-center justify-center p-4 md:p-6">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center p-8 text-center">
                        <div className="flex size-14 items-center justify-center rounded-full bg-amber-100">
                            <Lock className="size-7 text-amber-700" />
                        </div>
                        <h1 className="mt-4 text-lg font-bold tracking-tight">Halaman Terkunci</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {message || 'Halaman ini tidak termasuk dalam hak akses akun Anda.'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Bila Anda memang memerlukan akses ini, hubungi Document Control atau Administrator.
                        </p>
                        <Button asChild variant="outline" className="mt-5">
                            <Link href="/dashboard">
                                <ArrowLeft className="size-4" /> Kembali ke Dashboard
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
