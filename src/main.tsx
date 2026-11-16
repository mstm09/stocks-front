import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { createAppRouter } from './router'

// 入口。index.html の <div id="root"> の中に、Reactの画面を組み立てる。

// TanStack Query: APIから取った値を覚えておき、読み込み中・エラーの状態も管理してくれる。
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 株価は1日1回しか変わらないので、1分は取り直さない
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createAppRouter()} />
    </QueryClientProvider>
  </StrictMode>,
)
