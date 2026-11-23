import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { listPageSlugs } from '@/lib/content/get-page'
import { listPostSlugs } from '@/lib/content/get-post'
import { pageSlugToSegments } from '@/lib/content/page-slug'
import { getBlogConfig } from '@/lib/content/get-blog-config'
import { DEFAULT_BLOG_PATH, isReservedPostSlug, resolveBlogTarget, type BlogTarget } from '@/lib/content/blog-config'
import { CATEGORY_SEGMENT } from '@/lib/content/category-path'
import {
  BlogIndex,
  BlogPost,
  CategoryIndex,
  blogIndexMetadata,
  blogPostMetadata,
  categoriesWithPosts,
  categoryIndexMetadata,
} from '@/lib/content/blog-views'
import {
  renderGeneratedPage,
  generatedPageMetadata,
} from '@/components/assembly/GeneratedMarkdownPage'

type Props = {
  params: Promise<{ slug: string[] }>
}

function slugToUrl(slug: string[]): string {
  return '/' + slug.join('/')
}

// Cache Components requires generateStaticParams to return at least one
// entry. Use a placeholder when the content directory only has home.md
// (the fresh-clone state, before any deliverable is unpacked); the page
// handler maps it to a 404 below.
const EMPTY_PLACEHOLDER = '__no_pages__'

export async function generateStaticParams() {
  const slugs = await listPageSlugs()
  // Each slug like "services" or "services--virtual-cfo" — convert to slug[]
  // form. We use double-dash as URL segment separator in filenames, but the
  // Next.js dynamic [...slug] expects an array of single-segment strings.
  // pageSlugToSegments returns null for a malformed filename (empty segment);
  // skip it so one bad content file can't fail the whole build — see its doc.
  const params: { slug: string[] }[] = []
  for (const filename of slugs) {
    const segments = pageSlugToSegments(filename)
    if (!segments) {
      console.warn(
        `[content] Skipping malformed page file "${filename}.md" — it produces an empty route segment and would break the build.`
      )
      continue
    }
    params.push({ slug: segments })
  }
  // When the blog lives at a custom path (e.g. /insights), this catch-all — not
  // the physical /resources route — serves the index + posts, so prerender them.
  const blog = await getBlogConfig()
  if (blog.path !== DEFAULT_BLOG_PATH) {
    const base = blog.path.replace(/^\//, '')
    params.push({ slug: [base] })
    for (const post of await listPostSlugs()) {
      if (post.trim() !== '' && !isReservedPostSlug(post)) params.push({ slug: [base, post] })
    }
    for (const category of await categoriesWithPosts()) {
      params.push({ slug: [base, CATEGORY_SEGMENT, category.slug] })
    }
  }
  // Cache Components requires generateStaticParams to return at least one entry
  // (see EMPTY_PLACEHOLDER) — hold to that even if every file was malformed.
  return params.length > 0 ? params : [{ slug: [EMPTY_PLACEHOLDER] }]
}

// What a requested slug[] means for a custom-path blog (index, category page,
// post), or null at the default path / outside the blog. See resolveBlogTarget.
async function blogTarget(slug: string[]): Promise<BlogTarget | null> {
  const blog = await getBlogConfig()
  return resolveBlogTarget(slug, blog.path)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (slug[0] === EMPTY_PLACEHOLDER) return { title: 'Not found' }
  const target = await blogTarget(slug)
  if (target?.kind === 'index') return blogIndexMetadata()
  if (target?.kind === 'category') {
    const meta = await categoryIndexMetadata(target.slug)
    if (meta) return meta
  }
  if (target?.kind === 'post') {
    const meta = await blogPostMetadata(target.slug)
    if (meta) return meta
  }
  const meta = await generatedPageMetadata(slugToUrl(slug), slug.join('/'))
  return meta ?? { title: 'Not found' }
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params
  if (slug[0] === EMPTY_PLACEHOLDER) notFound()

  // Custom-path blog: this catch-all serves the index, category pages and
  // posts (the physical /resources routes yield to a page when a custom path is
  // set). Category pages are resolved before posts.
  const target = await blogTarget(slug)
  if (target?.kind === 'index') return <BlogIndex />
  if (target?.kind === 'category') {
    const page = await CategoryIndex({ slug: target.slug })
    if (page) return page
    // Unknown/empty category — fall through to normal page handling (→ 404).
  }
  if (target?.kind === 'post') {
    const post = await BlogPost({ slug: target.slug })
    if (post) return post
    // Not a post under the blog path — fall through to normal page handling.
  }

  // Missing/malformed page → null → clean notFound(). Must NOT be a thrown
  // error: see getPageMarkdown's docstring for why a throw across the
  // 'use cache' boundary turns unknown-URL 404s into 500s.
  const rendered = await renderGeneratedPage(slugToUrl(slug))
  if (!rendered) notFound()
  return rendered
}
