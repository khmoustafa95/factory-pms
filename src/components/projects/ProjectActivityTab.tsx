import { format } from 'date-fns'
import { useProjectActivity } from '@/hooks/useComments'
import { useCommentsRealtime } from '@/hooks/useRealtime'
import { USER_ROLE_LABELS } from '@/lib/roles'
import {
  ESCALATION_PREFIX,
  isEscalationComment,
} from '@/lib/validations/comment'
import type { UserRole } from '@/types/database'
import { CommentThread } from '@/components/comments/CommentThread'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface ProjectActivityTabProps {
  projectId: string
  phaseIds: string[]
  taskIds: string[]
  canComment: boolean
}

export function ProjectActivityTab({
  projectId,
  phaseIds,
  taskIds,
  canComment,
}: ProjectActivityTabProps) {
  const { data: activity = [], isLoading } = useProjectActivity(
    projectId,
    phaseIds,
    taskIds,
  )
  useCommentsRealtime('project', projectId)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Activity feed</CardTitle>
          <CardDescription>
            Comments on this project, its phases, and tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading activity…</p>
          ) : null}

          {activity.length === 0 && !isLoading ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            activity.map((item) => {
              const role = item.author?.role as UserRole | undefined
              const escalated = isEscalationComment(item.body)

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">{item.context_label}</Badge>
                    {escalated ? (
                      <Badge variant="destructive">Escalation</Badge>
                    ) : null}
                    <span className="font-medium">
                      {item.author?.full_name ?? 'Unknown'}
                    </span>
                    {role ? (
                      <span className="text-slate-500">
                        {USER_ROLE_LABELS[role]}
                      </span>
                    ) : null}
                    <span className="text-slate-400">
                      {format(new Date(item.created_at), 'dd MMM yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {escalated
                      ? item.body.replace(`${ESCALATION_PREFIX} `, '')
                      : item.body}
                  </p>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project discussion</CardTitle>
          <CardDescription>
            Leave notes visible to everyone with project access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommentThread
            entityType="project"
            entityId={projectId}
            title="Project comments"
            canComment={canComment}
          />
        </CardContent>
      </Card>
    </div>
  )
}
