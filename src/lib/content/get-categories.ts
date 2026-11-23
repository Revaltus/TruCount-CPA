import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cacheLife } from 'next/cache'
import { parseCategories, type BlogCategory } from './categories'

export type { BlogCategory }

/** Read + parse content/categories.json under `cwd`. [] when missing/invalid. */
export async function readCategoriesFile(cwd: string): Promise<BlogCategory[]> {
  try {
    return parseCategories(await fs.readFile(path.join(cwd, 'content', 'categories.json'), 'utf-8'))
  } catch {
    return []
  }
}

/** Cached accessor (same pattern as getBlogConfig). */
export async function getCategories(): Promise<BlogCategory[]> {
  'use cache'
  cacheLife('max')
  return readCategoriesFile(process.cwd())
}

export async function getCategoryBySlug(slug: string): Promise<BlogCategory | null> {
  const all = await getCategories()
  return all.find((c) => c.slug === slug) ?? null
}
