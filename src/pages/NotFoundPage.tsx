import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">ページがありません</h1>
      <Link to="/" className="underline underline-offset-4">
        ホームへ戻る
      </Link>
    </div>
  )
}
