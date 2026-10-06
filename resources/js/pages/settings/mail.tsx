import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Loader2, Mail, Send } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface MailCfg {
    mailer: string;
    host: string | null;
    port: number | string | null;
    username: string | null;
    encryption: string;
    from_address: string | null;
    from_name: string | null;
    password_set: boolean;
}

interface Props {
    mail: MailCfg;
    isDbConfigured: boolean;
    envMailer: string;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Email (SMTP) settings', href: '/settings/mail' }];

export default function MailSettings({ mail, isDbConfigured, envMailer }: Props) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        mailer: mail.mailer ?? 'smtp',
        host: mail.host ?? '',
        port: mail.port != null ? String(mail.port) : '',
        username: mail.username ?? '',
        password: '',
        encryption: mail.encryption ?? 'none',
        from_address: mail.from_address ?? '',
        from_name: mail.from_name ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('mail.update'), { preserveScroll: true });
    };

    const isSmtp = data.mailer === 'smtp';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Email settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Konfigurasi Email (SMTP)"
                        description="Atur server email untuk mengirim notifikasi (approval, jadwal audit, dll)."
                    />

                    {/* Status banner */}
                    <div
                        className={`rounded-md border p-3 text-sm ${
                            envMailer === 'log'
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        }`}
                    >
                        {envMailer === 'log' ? (
                            <>
                                <b>Email belum aktif.</b> Mailer aktif saat ini: <code>log</code> — email hanya
                                ditulis ke log, tidak benar-benar dikirim. Isi konfigurasi SMTP di bawah lalu kirim
                                email test.
                            </>
                        ) : (
                            <>
                                <b>Email aktif.</b> Mailer: <code>{envMailer}</code>
                                {isDbConfigured ? ' (dari konfigurasi ini).' : ' (dari file .env).'}
                            </>
                        )}
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid gap-2">
                            <Label>Mailer</Label>
                            <Select value={data.mailer} onValueChange={(v) => setData('mailer', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="smtp">SMTP (kirim email sungguhan)</SelectItem>
                                    <SelectItem value="log">Log (hanya tulis ke log, untuk testing)</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.mailer} />
                        </div>

                        {isSmtp && (
                            <>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="host">SMTP Host</Label>
                                        <Input id="host" value={data.host} onChange={(e) => setData('host', e.target.value)} placeholder="smtp.gmail.com" />
                                        <InputError message={errors.host} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="port">SMTP Port</Label>
                                        <Input id="port" value={data.port} onChange={(e) => setData('port', e.target.value)} placeholder="587" inputMode="numeric" />
                                        <InputError message={errors.port} />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="username">Username</Label>
                                        <Input id="username" value={data.username} onChange={(e) => setData('username', e.target.value)} placeholder="you@company.com" autoComplete="off" />
                                        <InputError message={errors.username} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">Password {mail.password_set && <span className="text-xs text-muted-foreground">(tersimpan — kosongkan jika tidak diubah)</span>}</Label>
                                        <Input id="password" type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} placeholder={mail.password_set ? '••••••••' : 'App password / SMTP password'} autoComplete="new-password" />
                                        <InputError message={errors.password} />
                                    </div>
                                </div>

                                <div className="grid gap-2 sm:max-w-xs">
                                    <Label>Encryption</Label>
                                    <Select value={data.encryption} onValueChange={(v) => setData('encryption', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tls">TLS (port 587)</SelectItem>
                                            <SelectItem value="ssl">SSL (port 465)</SelectItem>
                                            <SelectItem value="none">None</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.encryption} />
                                </div>
                            </>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="from_address">From Address</Label>
                                <Input id="from_address" value={data.from_address} onChange={(e) => setData('from_address', e.target.value)} placeholder="no-reply@company.com" />
                                <InputError message={errors.from_address} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="from_name">From Name</Label>
                                <Input id="from_name" value={data.from_name} onChange={(e) => setData('from_name', e.target.value)} placeholder="ISO-DMS" />
                                <InputError message={errors.from_name} />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing} className="gap-1.5">
                                {processing && <Loader2 className="size-4 animate-spin" />} Simpan konfigurasi
                            </Button>
                            <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                                <p className="text-sm text-emerald-600">Tersimpan</p>
                            </Transition>
                        </div>
                    </form>

                    <TestEmail />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

function TestEmail() {
    const [email, setEmail] = useState('');
    const { post, processing, setData, errors } = useForm({ test_email: '' });

    const send: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('mail.test'), { preserveScroll: true });
    };

    return (
        <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Mail className="size-4" /> Kirim Email Test
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
                Simpan konfigurasi dulu, lalu kirim email percobaan untuk memastikan pengiriman berhasil.
            </p>
            <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row">
                <Input
                    type="email"
                    placeholder="email-tujuan@company.com"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        setData('test_email', e.target.value);
                    }}
                    required
                    className="sm:max-w-xs"
                />
                <Button type="submit" variant="outline" disabled={processing || !email} className="gap-1.5">
                    {processing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Kirim test
                </Button>
            </form>
            <InputError message={errors.test_email} />
        </div>
    );
}
