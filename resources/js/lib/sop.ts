// Shared types & helpers for the SOP digital procedure (sections A–G).
//
// Sections D–G use a recursive outline model so each row can have nested
// sub-chapters (D.1 → D.1.1 → D.1.1.1 …). Older documents stored these as
// flat typed arrays ({term,meaning} / {role,duty} / {title,detail} / string),
// so the normalizers below accept both shapes and converge on OutlineNode[].

export type OutlineNode = { text: string; children: OutlineNode[] };

/** Clauses grouped per ISO standard, e.g. { iso_9001: ['7.5.3', '8.5.1'] }. */
export type IsoClauses = Record<string, string[]>;

export const STD_LABEL: Record<string, string> = {
    iso_9001: 'ISO 9001 : 2015',
    iso_14001: 'ISO 14001 : 2015',
    iso_45001: 'ISO 45001 : 2018',
    iatf: 'IATF 16949 : 2016',
    internal: 'Internal Standard',
};

export const emptyNode = (): OutlineNode => ({ text: '', children: [] });

function normalizeNode(item: unknown, joiner: string): OutlineNode | null {
    if (item == null) return null;
    if (typeof item === 'string') return { text: item, children: [] };
    if (typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        // Already the new outline shape.
        if (typeof obj.text === 'string' || Array.isArray(obj.children)) {
            return { text: String(obj.text ?? ''), children: toOutline(obj.children, joiner) };
        }
        // Legacy typed shapes (definitions / responsibilities / procedure_steps).
        const parts: string[] = [];
        for (const key of ['term', 'meaning', 'role', 'duty', 'title', 'detail']) {
            const v = obj[key];
            if (v != null && String(v).trim() !== '') parts.push(String(v));
        }
        return { text: parts.join(joiner), children: [] };
    }
    return null;
}

/** Convert an unknown stored value into a clean OutlineNode[] (handles legacy shapes). */
export function toOutline(value: unknown, joiner = ' — '): OutlineNode[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => normalizeNode(item, joiner))
        .filter((n): n is OutlineNode => n !== null);
}

/** Drop fully-empty nodes (no text and no meaningful descendants) before saving. */
export function pruneOutline(nodes: OutlineNode[]): OutlineNode[] {
    return nodes
        .map((n) => ({ text: n.text, children: pruneOutline(n.children) }))
        .filter((n) => n.text.trim() !== '' || n.children.length > 0);
}

export function normalizeIsoClauses(value: unknown): IsoClauses {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: IsoClauses = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (Array.isArray(v)) out[k] = v.map((x) => String(x));
    }
    return out;
}

export function hasAnyClause(clauses: IsoClauses): boolean {
    return Object.values(clauses).some((arr) => arr.some((c) => c.trim() !== ''));
}

// ---- Immutable tree operations addressed by a path of indices ----

export function setTextAt(nodes: OutlineNode[], path: number[], text: string): OutlineNode[] {
    const [i, ...rest] = path;
    return nodes.map((n, idx) =>
        idx !== i ? n : rest.length === 0 ? { ...n, text } : { ...n, children: setTextAt(n.children, rest, text) },
    );
}

export function removeAt(nodes: OutlineNode[], path: number[]): OutlineNode[] {
    const [i, ...rest] = path;
    if (rest.length === 0) return nodes.filter((_, idx) => idx !== i);
    return nodes.map((n, idx) => (idx !== i ? n : { ...n, children: removeAt(n.children, rest) }));
}

export function addChildAt(nodes: OutlineNode[], path: number[]): OutlineNode[] {
    const [i, ...rest] = path;
    return nodes.map((n, idx) =>
        idx !== i
            ? n
            : rest.length === 0
              ? { ...n, children: [...n.children, emptyNode()] }
              : { ...n, children: addChildAt(n.children, rest) },
    );
}

export function addSiblingAt(nodes: OutlineNode[], path: number[]): OutlineNode[] {
    const [i, ...rest] = path;
    if (rest.length === 0) {
        const copy = nodes.slice();
        copy.splice(i + 1, 0, emptyNode());
        return copy;
    }
    return nodes.map((n, idx) => (idx !== i ? n : { ...n, children: addSiblingAt(n.children, rest) }));
}
