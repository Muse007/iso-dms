import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/** Navigasi yang selesai lebih cepat dari ini tidak memunculkan bar sama sekali. */
const SHOW_DELAY = 120;
/** Jeda bar terlihat penuh sebelum memudar — memberi kesan tuntas, bukan terpotong. */
const DONE_HOLD = 260;

/**
 * Indikator progres navigasi di tepi atas layar.
 *
 * Menggantikan progress bawaan Inertia agar warnanya selaras dengan identitas
 * aplikasi dan gerakannya lebih terbaca pada halaman yang lambat. Progres nyata
 * dipakai saat ada unggahan berkas; selebihnya bar merayap melambat mendekati
 * 90% supaya tidak pernah "penuh" sebelum halaman benar-benar siap.
 */
export function LoadingBar() {
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(0);
    const shown = useRef(false);

    useEffect(() => {
        let showTimer: ReturnType<typeof setTimeout>;
        let hideTimer: ReturnType<typeof setTimeout>;
        let trickle: ReturnType<typeof setInterval>;

        const clearAll = () => {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
            clearInterval(trickle);
        };

        const start = () => {
            clearAll();
            setProgress(0);
            showTimer = setTimeout(() => {
                shown.current = true;
                setVisible(true);
                setProgress(8);
                // Langkah mengecil seiring mendekati 90% — cepat di awal, melambat di akhir.
                trickle = setInterval(() => {
                    setProgress((p) => (p >= 90 ? p : p + Math.max(0.4, (90 - p) * 0.06)));
                }, 120);
            }, SHOW_DELAY);
        };

        const onProgress = (event: { detail?: { progress?: { percentage?: number } } }) => {
            const pct = event.detail?.progress?.percentage;
            if (typeof pct !== 'number') return;
            clearInterval(trickle);           // ada angka sungguhan, hentikan tebakan
            setProgress(Math.min(90, pct));
        };

        const finish = () => {
            clearAll();
            if (!shown.current) {
                setProgress(0);               // selesai sebelum bar sempat muncul
                return;
            }
            setProgress(100);
            hideTimer = setTimeout(() => {
                shown.current = false;
                setVisible(false);
                setProgress(0);
            }, DONE_HOLD);
        };

        const offs = [
            router.on('start', start),
            router.on('progress', onProgress),
            router.on('finish', finish),
        ];

        return () => {
            clearAll();
            offs.forEach((off) => off());
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
            role="progressbar"
            aria-label="Memuat halaman"
        >
            <div
                className="h-full bg-gradient-to-r from-[#b91c1c] via-[#dc2626] to-[#f97316] transition-[width,opacity] duration-200 ease-out"
                style={{
                    width: `${progress}%`,
                    opacity: progress >= 100 ? 0 : 1,
                    boxShadow: '0 0 10px rgba(220,38,38,.75), 0 0 4px rgba(220,38,38,.5)',
                }}
            />
        </div>
    );
}
