/**
 * Category page URLs: `{blogPath}/category/{slug}`. Dependency-free so the
 * client-side ResourceBrowser can build chip links without pulling in fs or zod.
 * `category` is a reserved post slug (see isReservedPostSlug in blog-config).
 */
export const CATEGORY_SEGMENT = 'category'

export function categoryPath(blogPath: string, slug: string): string {
  return `${blogPath}/${CATEGORY_SEGMENT}/${slug}`
}
