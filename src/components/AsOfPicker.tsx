import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  /** 選んでいる基準日（YYYY-MM-DD）。undefined は「最新」。 */
  value: string | undefined
  onChange: (value: string | undefined) => void
}

/** 基準日を選ぶ部品。空にすると、最新日になる。 */
export function AsOfPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="as-of" className="text-muted-foreground">
        基準日
      </Label>
      <Input
        id="as-of"
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-40 bg-background"
      />
      {value && (
        <Button variant="link" size="sm" onClick={() => onChange(undefined)}>
          最新に戻す
        </Button>
      )}
    </div>
  )
}
