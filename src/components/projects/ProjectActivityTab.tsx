import { CommentThread } from '@/components/comments/CommentThread'
import { QueryState } from '@/components/QueryState'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslation } from '@/contexts/LocaleContext'
import { useProjectActivity } from '@/hooks/useComments'
import { useCommentsRealtime } from '@/hooks/useRealtime'
import { formatLocalizedDateTime, getRoleLabel } from '@/lib/i18n-format'
import {
  ESCALATION_PREFIX,
  isEscalationComment,
} from '@/lib/validations/comment'
import type { EntityType, UserRole } from '@/types/database'

interface ProjectActivityTabProps {
  projectId: string
  canComment: boolean
}

function parseUserRole(role: string | undefined): UserRole | undefined {
  if (
    role === 'company_director' ||
    role === 'factory_manager' ||
    role === 'project_manager'
  ) {
    return role
  }

  return undefined
}

function getActivityContextLabel(
  t: (key: string) => string,
  entityType: EntityType,
): string {
  switch (entityType) {
    case 'project':
      return t('activity.onProject')
    case 'phase':
      return t('activity.onPhase')
    case 'task':
      return t('activity.onTask')
  }
}

export function ProjectActivityTab({
  projectId,
  canComment,
}: ProjectActivityTabProps) {
  const { t, locale } = useTranslation()
  const {
    data: activity = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useProjectActivity(projectId)
  useCommentsRealtime('project', projectId)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('activity.title')}</CardTitle>
          <CardDescription>{t('activity.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <QueryState
            isLoading={isLoading}
            error={error}
            loadingMessage={t('common.loading')}
            errorMessage={t('activity.loadFailed')}
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          >
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('activity.empty')}
              </p>
            ) : (
              activity.map((item) => {
                const role = parseUserRole(item.author?.role)
                const escalated = isEscalationComment(item.body)

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-muted p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline">
                        {getActivityContextLabel(t, item.entity_type)}
                      </Badge>
                      {escalated ? (
                        <Badge variant="destructive">
                          {t('common.escalate')}
                        </Badge>
                      ) : null}
                      <span className="font-medium">
                        {item.author?.full_name ?? t('common.user')}
                      </span>
                      {role ? (
                        <span className="text-muted-foreground">
                          {getRoleLabel(t, role)}
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">
                        {formatLocalizedDateTime(item.created_at, locale)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                      {escalated
                        ? item.body.replace(`${ESCALATION_PREFIX} `, '')
                        : item.body}
                    </p>
                  </div>
                )
              })
            )}
          </QueryState>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <CommentThread
            entityType="project"
            entityId={projectId}
            title={t('activity.onProject')}
            canComment={canComment}
          />
        </CardContent>
      </Card>
    </div>
  )
}
