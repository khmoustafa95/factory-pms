import type { NotificationPayload, NotificationType } from '@/types/database'

const KNOWN_TYPES = new Set<NotificationType>([
  'project_proposed',
  'project_approved',
  'project_rejected',
  'project_started',
  'project_paused',
  'project_resumed',
  'project_completed',
  'task_blocked',
  'comment_project',
  'comment_task',
  'comment_mention',
])

export function isNotificationType(value: string): value is NotificationType {
  return KNOWN_TYPES.has(value as NotificationType)
}

export function parseNotificationPayload(
  payload: unknown,
): NotificationPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  const record = payload as Record<string, unknown>

  return {
    projectTitle:
      typeof record.projectTitle === 'string' ? record.projectTitle : undefined,
    projectCode:
      typeof record.projectCode === 'string' ? record.projectCode : undefined,
    taskTitle:
      typeof record.taskTitle === 'string' ? record.taskTitle : undefined,
    actorName:
      typeof record.actorName === 'string' ? record.actorName : undefined,
    reason:
      typeof record.reason === 'string'
        ? record.reason
        : record.reason === null
          ? null
          : undefined,
    preview: typeof record.preview === 'string' ? record.preview : undefined,
  }
}

export function notificationTitleKey(type: string): string {
  if (isNotificationType(type)) {
    return `notifications.types.${type}.title`
  }
  return 'notifications.types.unknown.title'
}

export function notificationBodyKey(type: string): string {
  if (isNotificationType(type)) {
    return `notifications.types.${type}.body`
  }
  return 'notifications.types.unknown.body'
}
