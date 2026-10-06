import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import LogoutSection from '@/components/logout-section';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Upload } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: '/settings/profile',
    },
];

export default function Profile({
    mustVerifyEmail,
    status,
    signatureUrl,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    signatureUrl: string | null;
}) {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, post, transform, errors, processing, recentlySuccessful } = useForm<{
        name: string;
        email: string;
        signature: File | null;
    }>({
        name: auth.user.name,
        email: auth.user.email,
        signature: null,
    });

    transform((d) => ({ ...d, _method: 'patch' }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('profile.update'), { forceFormData: true, preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Profile information" description="Update your name, email, and digital signature" />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Full name"
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Email address"
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        {/* Digital signature */}
                        <div className="grid gap-2">
                            <Label htmlFor="signature">Digital signature (PNG/JPG)</Label>
                            <p className="text-xs text-muted-foreground">
                                Tanda tangan scan/transparan untuk dipakai di kolom approval Prosedur.
                            </p>

                            <div className="flex items-start gap-4">
                                <div className="flex h-24 w-44 items-center justify-center rounded-md border bg-muted/40">
                                    {data.signature ? (
                                        <img
                                            src={URL.createObjectURL(data.signature)}
                                            alt="New signature preview"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    ) : signatureUrl ? (
                                        <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-xs italic text-muted-foreground">No signature uploaded</span>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <label
                                        htmlFor="signature"
                                        className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm hover:bg-muted/50"
                                    >
                                        <Upload className="size-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">
                                            {data.signature ? data.signature.name : 'Choose image…'}
                                        </span>
                                    </label>
                                    <Input
                                        id="signature"
                                        type="file"
                                        accept=".png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={(e) => setData('signature', e.target.files?.[0] ?? null)}
                                    />
                                    {data.signature && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setData('signature', null)}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <InputError className="mt-2" message={errors.signature} />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="mt-2 text-sm text-neutral-800">
                                    Your email address is unverified.
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="rounded-md text-sm text-neutral-600 underline hover:text-neutral-900 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                                    >
                                        Click here to re-send the verification email.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        A new verification link has been sent to your email address.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <LogoutSection />
            </SettingsLayout>
        </AppLayout>
    );
}
