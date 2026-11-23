import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { listPageSlugs } from '@/lib/content/get-page'
import { getBlogConfig } from '@/lib/content/get-blog-config'
import { DEFAULT_BLOG_PATH } from '@/lib/content/blog-config'
import { CategoryIndex, categoriesWithPosts, categoryIndexMetadata } from '@/lib/content/blog-views'
import { renderGeneratedPage, generatedPageMetadata } from '@/components/assembly/GeneratedMarkdownPage'

type Props = {
  params: Promise<{ slug: string }>
}

const EMPTY_PLACEHOLDER = '__no_categories__'
const PAGE_PREFIX = 'resources--category--'

// Category pages at the default blog path: /resources/category/<slug>. Like its
// sibling /resources routes, it yields when the blog moves to a custom path —
// the catch-all then serves {blogPath}/category/<slug>, and this URL is a
// normal page (content/pages/resources--category--<slug>.md) or a 404.

// Cache Components requires generateStaticParams to return at least one entry.
export async function generateStaticParams() {
  const blog = await getBlogConfig()
  if (blog.path === DEFAULT_BLOG_PATH) {
    const categories = await categoriesWithPosts()
    return categories.length === 0 ? [{ slug: EMPTY_PLACEHOLDER }] : categories.map((c) => ({ slug: c.slug }))
  }
  const pages = (await listPageSlugs())
    .filter((name) => name.startsWith(PAGE_PREFIX) && name.split('--').length === 3)
    .map((name) => ({ slug: name.slice(PAGE_PREFIX.length) }))
  return pages.length === 0 ? [{ slug: EMPTY_PLACEHOLDER }] : pages
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (slug === EMPTY_PLACEHOLDER) return { title: 'Not found' }
  const url = `/resources/category/${slug}`
  const blog = await getBlogConfig()
  if (blog.path === DEFAULT_BLOG_PATH) {
    const meta = await categoryIndexMetadata(slug)
    if (meta) return meta
  }
  const pageMeta = await generatedPageMetadata(url, `resources/category/${slug}`)
  return pageMeta ?? { title: 'Not found' }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  if (slug === EMPTY_PLACEHOLDER) notFound()
  const blog = await getBlogConfig()
  if (blog.path === DEFAULT_BLOG_PATH) {
    const page = await CategoryIndex({ slug })
    if (page) return page
  }
  // Custom blog path, or not a category with posts: a generated page at this
  // URL if one exists, otherwise 404.
  const generated = await renderGeneratedPage(`/resources/category/${slug}`)
  if (!generated) notFound()
  return generated
}
