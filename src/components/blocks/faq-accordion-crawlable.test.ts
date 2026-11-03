import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FaqAccordionClient } from './FaqAccordionClient'

/**
 * 2026.09.14: FAQ answers are in the server HTML while collapsed, so search
 * engines and AI crawlers read them (the FAQ now carries each page's depth).
 * They stay visually closed: Radix renders force-mounted content open, so the
 * closed state is hidden with CSS.
 */
describe('FaqAccordionClient', () => {
  const html = renderToStaticMarkup(
    createElement(FaqAccordionClient, {
      items: [
        { question: 'How is pricing set?', answer: 'A fixed monthly fee agreed up front.' },
        { question: 'Do you work remotely?', answer: 'Yes, through a secure portal.' },
      ],
    }),
  )

  it('renders every answer into the HTML while collapsed', () => {
    expect(html).toContain('A fixed monthly fee agreed up front.')
    expect(html).toContain('Yes, through a secure portal.')
  })

  it('keeps collapsed answers visually hidden', () => {
    const regions = [...html.matchAll(/<div[^>]*role="region"[^>]*>/g)].map((m) => m[0])
    expect(regions).toHaveLength(2)
    for (const r of regions) {
      expect(r).toContain('data-state="closed"')
      expect(r).toContain('data-[state=closed]:hidden')
    }
  })
})
