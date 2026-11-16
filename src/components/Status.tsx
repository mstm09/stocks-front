import type { ReactNode } from 'react'

// 読み込み中・エラー・0件のときに出す、決まった形の表示。

export function Loading({ children = '読み込み中…' }: { children?: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>
}

/** エラー。role="alert" を付けると、読み上げソフトがすぐに読む。 */
export function ErrorMessage({ error }: { error: Error }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive"
    >
      {error.message}
    </p>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}
