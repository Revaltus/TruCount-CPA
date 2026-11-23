import { promises as fs } from 'node:fs'
import path from 'node:path'
import { CATEGORY_SEGMENT } from './category-path'

/**
 * Per-client blog/insights section config (content/blog.json). Lets a firm name
 * the section (Resources / Insights / Blog / News) and choose its public path.
 *
 * This module is intentionally PURE — no `next/cache`, no framework imports — so
 * it can be imported from BOTH the app runtime (via the cached `get-blog-config`
 * wrapper) AND `next.config.ts`, which builds the path rewrite/redirect at config
 * load time and cannot safely pull in `'use cache'` code.
 *
 * `/resources` stays the internal canonical route; a custom `path` is remapped
 * to it by a rewrite in next.config. When blog.json is absent (every site today)
 * all fields fall back to the historical Resources defaults, so nothing changes.
 */

/** The canonical, internal blog route. A custom path rewrites to this. */
export const DEFAULT_BLOG_PATH = '/resources'
const DEFAULT_LABEL = 'Resources'
const DEFAULT_INTRO = 'Practical advice and seasonal updates from our team.'

export type BlogConfig = {
  /** Public base path, single clean segment with leading slash (e.g. /insights). */
  path: string
  /** Nav label + short name. */
  label: string
  /** Index-page H1. */
  title: string
  /** Index-page intro paragraph. */
  intro: string
}

/**
 * Coerce a raw path to a single-segment, root-relative path. Anything that isn't
 * a clean `/segment` ([A-Za-z0-9-]) — multi-segment, empty, traversal, etc. —
 * falls back to the canonical default so the rewrite/redirect can never target a
 * malformed or unsafe destination.
 */
export function normalizeBlogPath(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_BLOG_PATH
  const trimmed = raw.trim()
  if (!trimmed) return DEFAULT_BLOG_PATH
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const noTrailing = withSlash.replace(/\/+$/, '')
  if (!/^\/[A-Za-z0-9-]+$/.test(noTrailing)) return DEFAULT_BLOG_PATH
  return noTrailing
}

function cleanString(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  return t.length > 0 ? t : undefined
}

/** Resolve a parsed blog.json object (or anything) into a complete BlogConfig. */
export function resolveBlogConfig(raw: unknown): BlogConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const pathValue = normalizeBlogPath(obj.path)
  const label = cleanString(obj.label) ?? DEFAULT_LABEL
  const title = cleanString(obj.title) ?? label
  const intro = cleanString(obj.intro) ?? DEFAULT_INTRO
  return { path: pathValue, label, title, intro }
}

/**
 * Read content/blog.json from disk and resolve it. Never throws: a missing file
 * or malformed JSON yields the defaults (canonical /resources). Not cached here —
 * the app runtime uses the `getBlogConfig` wrapper, next.config calls this once.
 */
export async function readBlogConfigFile(cwd: string): Promise<BlogConfig> {
  const filePath = path.join(cwd, 'content', 'blog.json')
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return resolveBlogConfig(JSON.parse(raw))
  } catch {
    return resolveBlogConfig({})
  }
}

/**
 * `category` (the fixed category-page segment, `{blogPath}/category/{slug}`) is
 * a reserved post slug: the category route wins, and a post literally named
 * `category` is never routed (the onboarding app never generates that slug).
 */
export function isReservedPostSlug(slug: string): boolean {
  return slug === CATEGORY_SEGMENT
}

export type BlogTarget =
  | { kind: 'index' }
  | { kind: 'category'; slug: string }
  | { kind: 'post'; slug: string }

/**
 * What a catch-all `[...slug]` request means when the blog lives at a CUSTOM
 * path. Null at the default path (the physical /resources routes own the blog)
 * and for anything that isn't the blog. Category pages are matched before
 * posts; a bare `{blogPath}/category` is not a post and falls through.
 */
export function resolveBlogTarget(segments: string[], blogPath: string): BlogTarget | null {
  if (blogPath === DEFAULT_BLOG_PATH) return null
  const base = blogPath.replace(/^\//, '')
  if (segments[0] !== base) return null
  if (segments.length === 1) return { kind: 'index' }
  if (segments[1] === CATEGORY_SEGMENT) {
    return segments.length === 3 ? { kind: 'category', slug: segments[2] } : null
  }
  if (segments.length === 2) return { kind: 'post', slug: segments[1] }
  return null
}
