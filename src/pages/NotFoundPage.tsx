import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">ページがありません</h1>
      <Link to="/" className="text-blue-700 underline">
        ホームへ戻る
      </Link>
    </div>
  )
}
