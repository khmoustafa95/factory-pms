import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/contexts/LocaleContext'

interface ActiveStatusBadgeProps {
  isActive: boolean
}

export function ActiveStatusBadge({ isActive }: ActiveStatusBadgeProps) {
  const { t } = useTranslation()

  return (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? t('common.active') : t('common.inactive')}
    </Badge>
  )
}
