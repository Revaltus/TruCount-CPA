import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseCategories, resolvePostCategoryIds, coerceCategoryIds } from './categories'
import { readCategoriesFile } from './get-categories'

const dirs: string[] = []
function siteWith(file?: string): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cats-'))
  dirs.push(root)
  mkdirSync(path.join(root, 'content'))
  if (file !== undefined) writeFileSync(path.join(root, 'content', 'categories.json'), file)
  return root
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true })
})

const valid = JSON.stringify({
  version: 1,
  categories: [
    { id: 'c-aaaaaa', name: 'Construction', slug: 'construction', description: 'Build' },
    { id: 'c-bbbbbb', name: 'Retail', slug: 'retail' },
  ],
})

describe('readCategoriesFile', () => {
  it('returns the list for a valid file', async () => {
    const out = await readCategoriesFile(siteWith(valid))
    expect(out.map((c) => c.slug)).toEqual(['construction', 'retail'])
    expect(out[0].description).toBe('Build')
  })
  it('returns [] for bad JSON', async () => {
    expect(await readCategoriesFile(siteWith('{nope'))).toEqual([])
  })
  it('returns [] for a missing file', async () => {
    expect(await readCategoriesFile(siteWith())).toEqual([])
  })
})

describe('parseCategories', () => {
  it('treats any invalid or duplicate entry as a corrupt file (renders none)', () => {
    const good = [
      { id: 'c-aaaaaa', name: 'A', slug: 'a' },
      { id: 'c-ffffff', name: 'F', slug: 'f' },
    ]
    const bad = [
      { id: 'c-aaaaaa', name: 'dup id', slug: 'z' },
      { id: 'c-cccccc', name: 'dup slug', slug: 'a' },
      { id: 'bad', name: 'B', slug: 'b' },
      { id: 'c-dddddd', name: '  ', slug: 'd' },
      { id: 'c-eeeeee', name: 'E', slug: 'Bad Slug' },
    ]
    expect(parseCategories(JSON.stringify({ categories: good })).map((c) => c.id)).toEqual(['c-aaaaaa', 'c-ffffff'])
    for (const entry of bad) {
      expect(parseCategories(JSON.stringify({ categories: [...good, entry] }))).toEqual([])
    }
  })
  it('treats a non-empty list with no valid entries as invalid', () => {
    expect(parseCategories(JSON.stringify({ categories: [{ id: 'x' }] }))).toEqual([])
  })
  it('accepts an empty list', () => {
    expect(parseCategories(JSON.stringify({ version: 1, categories: [] }))).toEqual([])
  })
})

describe('post category ids', () => {
  const known = parseCategories(valid)
  it('drops unknown ids', () => {
    expect(resolvePostCategoryIds(['c-gone'], known)).toEqual([])
    expect(resolvePostCategoryIds(['c-bbbbbb', 'c-gone', 'c-bbbbbb'], known)).toEqual(['c-bbbbbb'])
  })
  it('tolerates a single string and junk', () => {
    expect(resolvePostCategoryIds('c-aaaaaa', known)).toEqual(['c-aaaaaa'])
    expect(coerceCategoryIds(42)).toEqual([])
    expect(coerceCategoryIds(undefined)).toEqual([])
  })
  it('is [] for every post when there are no categories', () => {
    expect(resolvePostCategoryIds(['c-aaaaaa'], [])).toEqual([])
  })
})
