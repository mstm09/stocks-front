import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/routes'

/** テスト用。指定したURLで、アプリ全体を画面なしで組み立てる。 */
export function renderApp(path = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

/** 画面がAPIへ送った内容（テストで確かめる用）。 */
export type SentRequest = { method: string; path: string; body: unknown }

/**
 * テスト用。APIの代わりに、決めた値を返す fetch を作る。
 * handler の2つ目の引数で、メソッド（GET / POST …）と、送られた中身（body）を見られる。
 */
export function mockFetch(handler: (url: URL, request: SentRequest) => Response | undefined) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const request = input instanceof Request ? input : new Request(String(input))
    const url = new URL(request.url, 'http://localhost')
    const text = await request.clone().text()
    const sent = { method: request.method, path: url.pathname, body: text ? JSON.parse(text) : null }
    const res = handler(url, sent)
    return res ?? new Response(JSON.stringify({ detail: 'not found' }), { status: 404 })
  })
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
