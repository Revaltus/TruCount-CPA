import { beforeEach, describe, expect, it, vi } from 'vitest'

// The sitemap's loaders use 'use cache' + cacheLife (Next compilation only), so
// mock them; the unit under test is which URLs the sitemap emits.
const state = vi.hoisted(() => ({
  blogPath: '/resources',
  categories: [] as { id: string; name: string; slug: string; description?: string }[],
  posts: [] as { slug: string; frontmatter: { title: string; date?: string }; categories: string[] }[],
}))

vi.mock('next/cache', () => ({ cacheLife: () => {} }))
vi.mock('@/lib/content/get-page', () => ({ listPageSlugs: async () => ['about'] }))
vi.mock('@/lib/content/get-post', () => ({ listPostsMeta: async () => state.posts }))
vi.mock('@/lib/content/get-blog-config', () => ({
  getBlogConfig: async () => ({ path: state.blogPath, label: 'Resources', title: 'Resources', intro: '' }),
}))
vi.mock('@/lib/content/get-categories', () => ({ getCategories: async () => state.categories }))
vi.mock('../../site.config', () => ({ siteConfig: { siteUrl: 'https://example.com/' } }))

import sitemap from './sitemap'

const CATS = [
  { id: 'c-aaaaaa', name: 'Construction', slug: 'construction' },
  { id: 'c-bbbbbb', name: 'Retail', slug: 'retail' },
]

async function urls(): Promise<string[]> {
  return (await sitemap()).map((e) => e.url)
}

describe('sitemap category pages', () => {
  beforeEach(() => {
    state.blogPath = '/resources'
    state.categories = CATS
    state.posts = [
      { slug: 'post-a', frontmatter: { title: 'A', date: '2026-01-01' }, categories: ['c-aaaaaa'] },
      { slug: 'post-b', frontmatter: { title: 'B' }, categories: [] },
    ]
  })

  it('includes category pages that have at least one post', async () => {
    const out = await urls()
    expect(out).toContain('https://example.com/resources/category/construction')
    expect(out).not.toContain('https://example.com/resources/category/retail')
  })

  it('uses the custom blog path', async () => {
    state.blogPath = '/insights'
    const out = await urls()
    expect(out).toContain('https://example.com/insights/category/construction')
    expect(out.some((u) => u.includes('/resources/category/'))).toBe(false)
  })

  it('emits no category pages when the site has no categories', async () => {
    state.categories = []
    expect((await urls()).some((u) => u.includes('/category/'))).toBe(false)
  })

  it('leaves out a post whose slug is the reserved "category" segment', async () => {
    state.posts = [...state.posts, { slug: 'category', frontmatter: { title: 'C' }, categories: [] }]
    expect(await urls()).not.toContain('https://example.com/resources/category')
  })
})
