type Rgb = [number, number, number];

const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));

function toRgb(hex: string): Rgb {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
    ];
}

const toHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;

/**
 * Terangkan (amount > 0) atau gelapkan (amount < 0) sebuah warna.
 * `amount` adalah proporsi jarak menuju putih/hitam, rentang −1…1.
 */
export function shade(hex: string, amount: number): string {
    const rgb = toRgb(hex);
    const target = amount >= 0 ? 255 : 0;
    const t = Math.abs(amount);
    return toHex(rgb.map((c) => c + (target - c) * t) as Rgb);
}

/**
 * Isian gradien untuk satu warna dasar: sedikit lebih terang di awal dan
 * lebih pekat di ujung, sehingga bidang warna tidak terlihat rata/datar.
 */
export function fillGradient(hex: string, angle = 180): string {
    return `linear-gradient(${angle}deg, ${shade(hex, 0.2)} 0%, ${hex} 55%, ${shade(hex, -0.12)} 100%)`;
}

/** Dua ujung gradien untuk dipakai sebagai stop pada <linearGradient> SVG. */
export function gradientStops(hex: string): [string, string] {
    return [shade(hex, 0.22), shade(hex, -0.14)];
}

/**
 * Deret warna yang berpindah mulus dari `from` ke `to`.
 * Dipakai untuk kategori yang punya urutan alami (mis. departemen yang sudah
 * diurutkan menurut jumlah temuan), agar warnanya ikut menyiratkan urutan.
 */
export function ramp(from: string, to: string, steps: number): string[] {
    if (steps <= 1) return [from];
    const a = toRgb(from);
    const b = toRgb(to);
    return Array.from({ length: steps }, (_, i) => {
        const t = i / (steps - 1);
        return toHex(a.map((c, k) => c + (b[k] - c) * t) as Rgb);
    });
}
