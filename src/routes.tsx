import type { RouteObject } from 'react-router'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
