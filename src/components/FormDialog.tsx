import type { FormEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** 送信ボタンの文字 */
  submitLabel: string
  /** 送信ボタンを赤くする（消す操作など、取り消せないもの） */
  destructive?: boolean
  /** 送信中か。true の間は、ボタンを押せなくする */
  pending: boolean
  /** APIが返したエラー。フォームの下に出す */
  error: Error | null
  onSubmit: () => void
  children?: ReactNode
}

/**
 * 画面の上に重ねて出す、入力フォーム（または確認）の枠。
 * 中身（入力欄）だけを children に渡せば、見出し・エラー表示・ボタンは共通で付く。
 */
export function FormDialog(props: Props) {
  function submit(e: FormEvent) {
    e.preventDefault() // ブラウザ標準の「ページを再読み込みして送信」を止める
    props.onSubmit()
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{props.title}</DialogTitle>
            {/* 説明がないときも、読み上げ用に見出しと同じ文を置く（Radix の決まり） */}
            <DialogDescription className={props.description ? undefined : 'sr-only'}>
              {props.description ?? props.title}
            </DialogDescription>
          </DialogHeader>
          {props.children}
          {props.error && (
            <p role="alert" className="text-sm text-destructive">
              {props.error.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
              やめる
            </Button>
            <Button
              type="submit"
              variant={props.destructive ? 'destructive' : 'default'}
              disabled={props.pending}
            >
              {props.pending ? '送信中…' : props.submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
