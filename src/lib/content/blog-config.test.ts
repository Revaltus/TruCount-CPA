import { describe, expect, it } from 'vitest'
import {
  normalizeBlogPath,
  resolveBlogConfig,
  resolveBlogTarget,
  isReservedPostSlug,
  DEFAULT_BLOG_PATH,
} from './blog-config'

describe('normalizeBlogPath', () => {
  it('defaults when absent, empty, or non-string', () => {
    expect(normalizeBlogPath(undefined)).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath('')).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath('   ')).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath(42)).toBe(DEFAULT_BLOG_PATH)
  })

  it('adds a leading slash and strips a trailing slash', () => {
    expect(normalizeBlogPath('insights')).toBe('/insights')
    expect(normalizeBlogPath('/insights/')).toBe('/insights')
    expect(normalizeBlogPath('  blog  ')).toBe('/blog')
  })

  it('rejects multi-segment, traversal, or unsafe paths (falls back to default)', () => {
    expect(normalizeBlogPath('/a/b')).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath('../etc')).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath('/insights?x=1')).toBe(DEFAULT_BLOG_PATH)
    expect(normalizeBlogPath('/in sights')).toBe(DEFAULT_BLOG_PATH)
  })
})

describe('resolveBlogConfig', () => {
  it('returns Resources defaults for an empty/absent config', () => {
    expect(resolveBlogConfig({})).toEqual({
      path: '/resources',
      label: 'Resources',
      title: 'Resources',
      intro: 'Practical advice and seasonal updates from our team.',
    })
    expect(resolveBlogConfig(null).label).toBe('Resources')
  })

  it('applies overrides and defaults title to label when title omitted', () => {
    const cfg = resolveBlogConfig({ path: '/insights', label: 'Insights', intro: 'Ideas.' })
    expect(cfg.path).toBe('/insights')
    expect(cfg.label).toBe('Insights')
    expect(cfg.title).toBe('Insights')
    expect(cfg.intro).toBe('Ideas.')
  })

  it('keeps an explicit title distinct from the label', () => {
    const cfg = resolveBlogConfig({ label: 'News', title: 'Latest News & Updates' })
    expect(cfg.label).toBe('News')
    expect(cfg.title).toBe('Latest News & Updates')
  })
})

describe('resolveBlogTarget (custom-path catch-all)', () => {
  it('is null at the default path (the /resources routes own the blog)', () => {
    expect(resolveBlogTarget(['resources'], DEFAULT_BLOG_PATH)).toBeNull()
    expect(resolveBlogTarget(['resources', 'category', 'construction'], DEFAULT_BLOG_PATH)).toBeNull()
  })

  it('resolves the index and posts under the custom path', () => {
    expect(resolveBlogTarget(['insights'], '/insights')).toEqual({ kind: 'index' })
    expect(resolveBlogTarget(['insights', 'tax-tips'], '/insights')).toEqual({ kind: 'post', slug: 'tax-tips' })
  })

  it('resolves /insights/category/construction to the category page, before post matching', () => {
    expect(resolveBlogTarget(['insights', 'category', 'construction'], '/insights')).toEqual({
      kind: 'category',
      slug: 'construction',
    })
  })

  it('does not treat a bare /insights/category as a post (falls through to 404)', () => {
    expect(resolveBlogTarget(['insights', 'category'], '/insights')).toBeNull()
  })

  it('ignores paths outside the blog and deeper nesting', () => {
    expect(resolveBlogTarget(['services'], '/insights')).toBeNull()
    expect(resolveBlogTarget(['insights', 'a', 'b'], '/insights')).toBeNull()
    expect(resolveBlogTarget(['insights', 'category', 'a', 'b'], '/insights')).toBeNull()
  })

  it('marks "category" as a reserved post slug', () => {
    expect(isReservedPostSlug('category')).toBe(true)
    expect(isReservedPostSlug('categories')).toBe(false)
  })
})
