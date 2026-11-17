import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * ブラウザ標準の <select> に、Input と同じ見た目を付けたもの。
 * 選択肢が少なく、凝った見た目がいらない所で使う（キーボードやスマホの操作が、標準のまま使える）。
 */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
