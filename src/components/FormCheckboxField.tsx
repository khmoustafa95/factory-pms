import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface FormCheckboxFieldProps {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function FormCheckboxField({
  id,
  label,
  checked,
  onCheckedChange,
}: FormCheckboxFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
    </div>
  )
}
