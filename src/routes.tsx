import type { RouteObject } from 'react-router'
import { Layout } from '@/components/Layout'
import { CandidatesPage } from '@/pages/CandidatesPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { StockDetailPage } from '@/pages/StockDetailPage'

/**
 * URLと画面の対応表。画面を増やすときは、ここに1行足す。
 * Layout（共通の枠）の中に、URLに合った画面が入る。
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'candidates', element: <CandidatesPage /> },
      { path: 'stocks/:code', element: <StockDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
