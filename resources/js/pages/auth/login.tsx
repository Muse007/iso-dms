import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="auth-iso">
            <Head title="Masuk" />

            {/* ===== Background animasi (CSS murni, bertema ISO digital) ===== */}
            <div className="bg" aria-hidden="true" />
            <div className="orbs" aria-hidden="true">
                <span className="orb o1" />
                <span className="orb o2" />
                <span className="orb o3" />
            </div>
            <div className="bg-pattern" aria-hidden="true" />

            <div className="shell">
                {/* ===== KIRI: brand / konsep digital ISO ===== */}
                <aside className="brand">
                    <div className="brand-top">
                        <div className="brand-logo">
                            <img src="/logo-bti.png" alt="Bonecom Tricom" />
                        </div>
                    </div>

                    <div className="hero">
                        <div className="brand-eyebrow">ISO DMS · Integrated Quality Management System</div>
                        <h1>
                            Kelola Dokumen Mutu
                            <br />
                            <span className="accent">secara digital &amp; terkendali.</span>
                        </h1>
                        <p>
                            Satu platform terpusat untuk Document Control, Audit Internal, NCR/CAPA, dan Manajemen Risiko sesuai standar ISO
                            9001:2015.
                        </p>

                        <div className="features">
                            <div className="feature">
                                <span className="ic">
                                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <path d="M14 2v6h6" />
                                        <path d="M9 13h6M9 17h4" />
                                    </svg>
                                </span>
                                <span>Document Control</span>
                            </div>
                            <div className="feature">
                                <span className="ic">
                                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 11l3 3L22 4" />
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                    </svg>
                                </span>
                                <span>Audit Internal</span>
                            </div>
                            <div className="feature">
                                <span className="ic">
                                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                        <path d="M12 9v4M12 17h.01" />
                                    </svg>
                                </span>
                                <span>NCR / CAPA</span>
                            </div>
                            <div className="feature">
                                <span className="ic">
                                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                </span>
                                <span>Manajemen Risiko</span>
                            </div>
                        </div>
                    </div>

                    <div className="brand-foot">
                        <span className="iso-badge">
                            <span className="dot" /> ISO 9001 : 2015
                        </span>
                        <small>© 2026 PT Bone Com Tricom</small>
                    </div>
                </aside>

                {/* ===== KANAN: form login ===== */}
                <main className="panel">
                    <div className="panel-head">
                        <span className="eyebrow">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Portal Login
                        </span>
                        <h2>Selamat datang kembali</h2>
                        <p>Masuk ke akun Anda untuk melanjutkan ke ISO DMS.</p>
                    </div>

                    {status && <div className="status">{status}</div>}

                    <form onSubmit={submit}>
                        <div className="field">
                            <label htmlFor="email">Alamat Email</label>
                            <div className="input-wrap">
                                <span className="lead">
                                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <path d="m22 7-10 6L2 7" />
                                    </svg>
                                </span>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="nama@bonecomtricom.com"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        <div className="field">
                            <div className="row-between">
                                <label htmlFor="password">Kata Sandi</label>
                                {canResetPassword && (
                                    <a href={route('password.request')} className="link" tabIndex={5}>
                                        Lupa sandi?
                                    </a>
                                )}
                            </div>
                            <div className="input-wrap">
                                <span className="lead">
                                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </span>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Masukkan kata sandi"
                                />
                                <button
                                    type="button"
                                    className="toggle"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                            <path d="m2 2 20 20" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <InputError message={errors.password} />
                        </div>

                        <div className="row-between">
                            <label className="check">
                                <input
                                    type="checkbox"
                                    tabIndex={3}
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                />
                                <span>Ingat saya</span>
                            </label>
                        </div>

                        <button className="btn" type="submit" tabIndex={4} disabled={processing}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            Masuk
                            {!processing && (
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            )}
                        </button>

                        <div className="divider">atau</div>

                        <p className="signup">
                            Belum punya akun? <a href="mailto:it@bonecomtricom.com">Hubungi Administrator</a>
                        </p>
                    </form>

                    <div className="secure-note">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="m9 12 2 2 4-4" />
                        </svg>
                        Koneksi aman &amp; terenkripsi · Akses sesuai hak peran
                    </div>
                </main>
            </div>

            <style>{styles}</style>
        </div>
    );
}

const styles = `
.auth-iso {
    --brand-red: #c1272d;
    --brand-maroon: #7a1418;
    --brand-maroon-deep: #4a0c0f;
    --ink: #1c1718;
    --ink-soft: #5b5054;
    --muted: #9a8f92;
    --line: #ece6e7;
    --white: #ffffff;
    --ring: rgba(193, 39, 45, 0.18);
    --shadow-lg: 0 40px 90px -30px rgba(74, 12, 15, 0.55);
    position: fixed; inset: 0;
    display: grid; place-items: center;
    padding: 28px;
    color: var(--ink);
    overflow: auto;
    -webkit-font-smoothing: antialiased;
}
.auth-iso * { box-sizing: border-box; }

/* ===== BACKGROUND ANIMASI ===== */
.auth-iso .bg {
    position: fixed; inset: 0; z-index: -3;
    background: linear-gradient(135deg, #3a0809 0%, #7a1418 48%, #c1272d 100%);
    background-size: 240% 240%;
    animation: isoGradient 18s ease-in-out infinite;
}
@keyframes isoGradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
.auth-iso .orbs { position: fixed; inset: 0; z-index: -2; overflow: hidden; }
.auth-iso .orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .5; mix-blend-mode: screen; }
.auth-iso .orb.o1 { width: 460px; height: 460px; top: -120px; left: -80px; background: radial-gradient(circle, #ff5a5f, transparent 70%); animation: isoFloat1 20s ease-in-out infinite; }
.auth-iso .orb.o2 { width: 520px; height: 520px; bottom: -160px; right: -120px; background: radial-gradient(circle, #e23b42, transparent 70%); animation: isoFloat2 24s ease-in-out infinite; }
.auth-iso .orb.o3 { width: 320px; height: 320px; top: 40%; left: 55%; background: radial-gradient(circle, #ff8a5c, transparent 70%); animation: isoFloat3 28s ease-in-out infinite; }
@keyframes isoFloat1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(120px,80px) scale(1.15); } }
@keyframes isoFloat2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-100px,-70px) scale(1.1); } }
@keyframes isoFloat3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-80px,60px) scale(1.2); } }
.auth-iso .bg-pattern {
    position: fixed; inset: -40px; z-index: -1; opacity: .45;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.12' stroke-width='1'%3E%3Cpath d='M20 20h40v40H20z'/%3E%3Cpath d='M80 80h40v40H80z'/%3E%3Ccircle cx='40' cy='40' r='3'/%3E%3Ccircle cx='100' cy='100' r='3'/%3E%3Cpath d='M40 60v20h60'/%3E%3Cpath d='M60 40h40v40'/%3E%3C/g%3E%3C/svg%3E");
    animation: isoDrift 40s linear infinite;
}
@keyframes isoDrift { from { background-position: 0 0; } to { background-position: 280px 280px; } }
@media (prefers-reduced-motion: reduce) { .auth-iso .bg, .auth-iso .orb, .auth-iso .bg-pattern { animation: none; } }

/* ===== CARD ===== */
.auth-iso .shell {
    width: 100%; max-width: 1040px;
    background: var(--white); border-radius: 26px;
    box-shadow: var(--shadow-lg);
    display: grid; grid-template-columns: 1.02fr 0.98fr;
    overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.55);
}

/* ===== KIRI ===== */
.auth-iso .brand {
    position: relative; padding: 46px 44px 38px; color: #fbeaea;
    background: radial-gradient(620px 360px at 90% -10%, rgba(226, 59, 66, 0.55) 0%, transparent 60%),
        linear-gradient(160deg, var(--brand-maroon) 0%, var(--brand-maroon-deep) 60%, #2e0708 100%);
    display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
}
.auth-iso .brand::before {
    content: ""; position: absolute; inset: 0;
    background-image: radial-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1.4px);
    background-size: 22px 22px;
    mask-image: linear-gradient(180deg, transparent, #000 28%, #000 76%, transparent);
    opacity: 0.45;
}
.auth-iso .brand > * { position: relative; z-index: 1; }
.auth-iso .brand-top { display: flex; align-items: center; gap: 16px; }
.auth-iso .brand-logo { height: 44px; display: inline-flex; align-items: center; }
.auth-iso .brand-logo img { height: 100%; width: auto; display: block; filter: drop-shadow(0 0 4px rgba(255,255,255,.9)) drop-shadow(0 0 2px rgba(255,255,255,.95)); }
.auth-iso .hero { margin-top: 6px; }
.auth-iso .brand-eyebrow { font-size: 11.5px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: #f0b9bb; margin-bottom: 12px; }
.auth-iso .hero h1 { font-size: 29px; line-height: 1.2; font-weight: 800; letter-spacing: -0.4px; margin-bottom: 13px; }
.auth-iso .hero h1 .accent { background: linear-gradient(90deg, #ffd0d0, #ff9a9e); -webkit-background-clip: text; background-clip: text; color: transparent; }
.auth-iso .hero p { font-size: 13.5px; line-height: 1.6; color: #f0cccc; max-width: 360px; }
.auth-iso .features { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-top: 24px; max-width: 400px; }
.auth-iso .feature { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 13px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.14); backdrop-filter: blur(8px); transition: transform .25s ease, background .25s ease; }
.auth-iso .feature:hover { transform: translateY(-3px); background: rgba(255, 255, 255, 0.14); }
.auth-iso .feature .ic { width: 34px; height: 34px; border-radius: 9px; flex: none; display: grid; place-items: center; background: linear-gradient(135deg, rgba(255,154,158,.3), rgba(193,39,45,.35)); border: 1px solid rgba(255,255,255,.2); }
.auth-iso .feature .ic svg { width: 17px; height: 17px; stroke: #ffe3e3; }
.auth-iso .feature span { font-size: 12.5px; font-weight: 600; color: #fdeaea; line-height: 1.3; }
.auth-iso .brand-foot { display: flex; align-items: center; gap: 16px; margin-top: 6px; flex-wrap: wrap; }
.auth-iso .iso-badge { display: inline-flex; align-items: center; gap: 9px; padding: 8px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.22); font-size: 12px; font-weight: 700; letter-spacing: .3px; }
.auth-iso .iso-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: #ff9a9e; box-shadow: 0 0 0 4px rgba(255,154,158,.25); }
.auth-iso .brand-foot small { font-size: 11.5px; color: #d8a5a5; }

/* ===== KANAN ===== */
.auth-iso .panel { padding: 50px 54px; display: flex; flex-direction: column; justify-content: center; }
.auth-iso .panel-head { margin-bottom: 28px; }
.auth-iso .eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: var(--brand-red); background: #fcebec; padding: 6px 12px; border-radius: 999px; margin-bottom: 18px; }
.auth-iso .panel-head h2 { font-size: 26px; font-weight: 800; letter-spacing: -0.4px; }
.auth-iso .panel-head p { font-size: 14px; color: var(--ink-soft); margin-top: 7px; }
.auth-iso .status { margin-bottom: 18px; padding: 10px 14px; border-radius: 10px; background: #ecfdf3; border: 1px solid #abefc6; color: #067647; font-size: 13px; font-weight: 600; }
.auth-iso form { display: flex; flex-direction: column; gap: 18px; }
.auth-iso .field { display: flex; flex-direction: column; gap: 8px; }
.auth-iso .field label { font-size: 13px; font-weight: 600; color: var(--ink); }
.auth-iso .input-wrap { position: relative; display: flex; align-items: center; }
.auth-iso .input-wrap .lead { position: absolute; left: 14px; display: grid; place-items: center; pointer-events: none; }
.auth-iso .input-wrap .lead svg { width: 18px; height: 18px; stroke: var(--muted); }
.auth-iso .input-wrap input { width: 100%; height: 48px; padding: 0 44px; border: 1.5px solid var(--line); border-radius: 12px; font-size: 14px; font-family: inherit; color: var(--ink); background: #fdfbfb; transition: border-color .2s, box-shadow .2s, background .2s; }
.auth-iso .input-wrap input::placeholder { color: var(--muted); }
.auth-iso .input-wrap input:focus { outline: none; border-color: var(--brand-red); background: var(--white); box-shadow: 0 0 0 4px var(--ring); }
.auth-iso .input-wrap .toggle { position: absolute; right: 12px; background: none; border: none; cursor: pointer; display: grid; place-items: center; padding: 6px; border-radius: 8px; }
.auth-iso .input-wrap .toggle svg { width: 18px; height: 18px; stroke: var(--muted); }
.auth-iso .input-wrap .toggle:hover svg { stroke: var(--ink-soft); }
.auth-iso .row-between { display: flex; align-items: center; justify-content: space-between; }
.auth-iso .check { display: flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; }
.auth-iso .check input { width: 17px; height: 17px; accent-color: var(--brand-red); cursor: pointer; }
.auth-iso .check span { font-size: 13px; color: var(--ink-soft); }
.auth-iso .link { font-size: 13px; font-weight: 600; color: var(--brand-red); text-decoration: none; }
.auth-iso .link:hover { text-decoration: underline; }
.auth-iso .btn { height: 50px; border: none; border-radius: 12px; cursor: pointer; font-family: inherit; font-size: 14.5px; font-weight: 700; color: #fff; background: linear-gradient(120deg, var(--brand-red), var(--brand-maroon) 140%); display: flex; align-items: center; justify-content: center; gap: 9px; box-shadow: 0 12px 26px -10px rgba(193, 39, 45, .65); transition: transform .15s ease, box-shadow .2s ease, filter .2s; margin-top: 4px; }
.auth-iso .btn:hover { transform: translateY(-1px); box-shadow: 0 18px 32px -10px rgba(193, 39, 45, .75); filter: brightness(1.05); }
.auth-iso .btn:active { transform: translateY(0); }
.auth-iso .btn:disabled { opacity: .75; cursor: not-allowed; }
.auth-iso .btn svg { width: 18px; height: 18px; stroke: #fff; }
.auth-iso .divider { display: flex; align-items: center; gap: 14px; color: var(--muted); font-size: 12px; margin: 2px 0; }
.auth-iso .divider::before, .auth-iso .divider::after { content: ""; flex: 1; height: 1px; background: var(--line); }
.auth-iso .signup { text-align: center; font-size: 13.5px; color: var(--ink-soft); }
.auth-iso .signup a { color: var(--brand-red); font-weight: 700; text-decoration: none; }
.auth-iso .signup a:hover { text-decoration: underline; }
.auth-iso .secure-note { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 24px; font-size: 11.5px; color: var(--muted); }
.auth-iso .secure-note svg { width: 14px; height: 14px; stroke: var(--brand-red); }

@media (max-width: 880px) {
    .auth-iso .shell { grid-template-columns: 1fr; max-width: 460px; }
    .auth-iso .brand { display: none; }
    .auth-iso .panel { padding: 40px 32px; }
}
`;
