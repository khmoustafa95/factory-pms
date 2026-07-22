import type {
  CommentListItem,
  EscalationItem,
  ProfileWithFactory,
  ProjectDetail,
  ProjectListItem,
  TaskListItem,
} from '@/types/joins'

export function mapJoinRows<T>(data: unknown | null | undefined): T[] {
  if (!data) {
    return []
  }

  return data as T[]
}

export function mapJoinRow<T>(data: unknown | null | undefined): T | null {
  if (!data) {
    return null
  }

  return data as T
}

export const joinMappers = {
  profileWithFactory: (data: unknown) => mapJoinRows<ProfileWithFactory>(data),
  projectListItem: (data: unknown) => mapJoinRows<ProjectListItem>(data),
  projectDetail: (data: unknown) => mapJoinRow<ProjectDetail>(data),
  taskListItem: (data: unknown) => mapJoinRows<TaskListItem>(data),
  escalationItem: (data: unknown) => mapJoinRows<EscalationItem>(data),
  commentListItem: (data: unknown) => mapJoinRows<CommentListItem>(data),
} as const
