/** Values for `public.tracks.provenance_type` (catalog). */
export type ProvenanceType = 'genesis' | 'hybrid' | 'echo';

export const PROVENANCE_META: Record<
  ProvenanceType,
  { label: string; chain: string }
> = {
  genesis: {
    label: 'GENESIS',
    chain:
      'Genesis: pure human master — Logic Pro & Fender Quantum; no synthetic arrangement.',
  },
  hybrid: {
    label: 'HYBRID',
    chain:
      'Hybrid: human-led — AI arrangements or Gemini-assisted lyrics with your performance.',
  },
  echo: {
    label: 'ECHO',
    chain:
      'Echo: AI-generated live version or cover derived from your originals.',
  },
};

export function isProvenanceType(v: string | null | undefined): v is ProvenanceType {
  return v === 'genesis' || v === 'hybrid' || v === 'echo';
}
