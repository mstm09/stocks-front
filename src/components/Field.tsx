import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Props = {
  /** 入力欄の id と同じにする（ラベルを押すと、その入力欄にフォーカスが移る） */
  htmlFor: string
  label: string
  /** 入力欄の下に出す補足 */
  hint?: string
  required?: boolean
  className?: string
  children: ReactNode
}

/** フォームの1項目（ラベル ＋ 入力欄 ＋ 補足）。 */
export function Field({ htmlFor, label, hint, required, className, children }: Props) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
