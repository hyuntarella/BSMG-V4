import { test, expect } from '@playwright/test'

const PAGES = [
  { name: 'estimate', path: '/estimate/new', waitFor: '/estimate/' },
  { name: 'crm', path: '/crm' },
  { name: 'calendar', path: '/calendar' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'proposal', path: '/proposal' },
]

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
]

for (const page of PAGES) {
  for (const vp of VIEWPORTS) {
    test(`screenshot-${page.name}-${vp.name}`, async ({ page: p }) => {
      await p.setViewportSize({ width: vp.width, height: vp.height })
      await p.goto(page.path)
      if (page.waitFor) {
        await p.waitForURL(new RegExp(page.waitFor), { timeout: 15000 })
      }
      await p.waitForLoadState('networkidle')
      await p.waitForTimeout(2000)
      await p.screenshot({
        path: `screenshots/${page.name}-${vp.name}.png`,
        fullPage: true,
      })
    })
  }
}
