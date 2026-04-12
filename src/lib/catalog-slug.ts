/** URL-safe catalog slug: lowercase, hyphens, no leading/trailing hyphen. */
export function slugifyCatalogTitle(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return s || 'untitled';
}

export function withNumericSuffix(base: string, n: number): string {
  const suffix = `-${n}`;
  const max = 120 - suffix.length;
  return `${base.slice(0, Math.max(1, max))}${suffix}`;
}
