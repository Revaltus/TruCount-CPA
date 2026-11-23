import { z } from 'zod'

/**
 * Blog categories (content/categories.json), written by the onboarding app.
 * PURE module — no fs, no next/cache — so it is unit-testable and shared by the
 * cached loader (get-categories.ts) and get-post. Mirrors the onboarding app's
 * `parseCategoriesFile` semantics (version 1).
 */
export type BlogCategory = { id: string; name: string; slug: string; description?: string }

const CategorySchema = z.object({
  id: z.string().regex(/^c-[0-9a-f]{6}$/),
  name: z.string().refine((s) => s.trim().length > 0),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().optional(),
})

/**
 * Parse the text of categories.json. Any invalid or duplicate (id/slug) entry
 * makes the whole file corrupt — a partially-corrupt file is never read as a
 * smaller list. Never throws; returns [] when unusable.
 */
export function parseCategories(text: string): BlogCategory[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return []
  }
  if (!data || typeof data !== 'object') return []
  const list = (data as { categories?: unknown }).categories
  if (!Array.isArray(list)) return []
  const out: BlogCategory[] = []
  const ids = new Set<string>()
  const slugs = new Set<string>()
  for (const item of list) {
    const r = CategorySchema.safeParse(item)
    if (!r.success) return []
    const c = r.data
    if (ids.has(c.id) || slugs.has(c.slug)) return []
    ids.add(c.id)
    slugs.add(c.slug)
    const cat: BlogCategory = { id: c.id, name: c.name, slug: c.slug }
    if (c.description !== undefined) cat.description = c.description
    out.push(cat)
  }
  return out
}

/** Coerce raw frontmatter `categories` (array, single string, or junk) to ids. */
export function coerceCategoryIds(raw: unknown): string[] {
  if (typeof raw === 'string') return raw.trim() ? [raw.trim()] : []
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

/** Keep only ids that exist in `known`, de-duplicated, in the post's order. */
export function resolvePostCategoryIds(raw: unknown, known: BlogCategory[]): string[] {
  const valid = new Set(known.map((c) => c.id))
  return [...new Set(coerceCategoryIds(raw))].filter((id) => valid.has(id))
}
