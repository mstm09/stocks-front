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

/** テスト用。APIの代わりに、決めた値を返す fetch を作る。 */
export function mockFetch(handler: (url: URL) => Response | undefined) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const raw = input instanceof Request ? input.url : String(input)
    const res = handler(new URL(raw, 'http://localhost'))
    return res ?? new Response(JSON.stringify({ detail: 'not found' }), { status: 404 })
  })
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
