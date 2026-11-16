import { screen } from '@testing-library/react'
import { json, mockFetch, renderApp } from '@/test/render'

afterEach(() => vi.restoreAllMocks())

test('APIにつながると、その旨を出す', async () => {
  mockFetch((url) => (url.pathname === '/api/health' ? json({ status: 'ok' }) : undefined))
  renderApp('/')
  expect(await screen.findByText(/つながっています/)).toBeInTheDocument()
})

test('APIにつながらないと、起動方法を出す', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
  renderApp('/')
  expect(await screen.findByText(/つながりません/)).toBeInTheDocument()
})

test('知らないURLは、ページがないと出す', async () => {
  mockFetch(() => undefined)
  renderApp('/nai')
  expect(await screen.findByText('ページがありません')).toBeInTheDocument()
})
