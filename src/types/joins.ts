import type {
  Comment,
  Profile,
  Project,
  Task,
  UserRole,
} from '@/types/database'

export type FactorySummary = {
  name: string
  code: string
}

export type ProfileSummary = {
  full_name: string
}

export type ProfileWithFactory = Profile & {
  factories: FactorySummary | null
}

export type ProjectListFinancials = {
  funding_received: number
  budget_used_pct: number | null
  has_funding_gap: boolean
  open_procurement_count: number
  overdue_procurement_count: number
}

export type ProjectListItem = Project &
  Partial<ProjectListFinancials> & {
  factories: FactorySummary | null
  proposer: ProfileSummary | null
  assigned_pm: ProfileSummary | null
}

export type ProjectDetail = Project & {
  factories: FactorySummary | null
  assigned_pm: ProfileSummary | null
}

export type TaskListItem = Task & {
  assignee: ProfileSummary | null
}

export type EscalationProject = {
  id: string
  title: string
  code: string
  factory_id: string
  factories: FactorySummary | null
}

export type EscalationItem = Task & {
  projects: EscalationProject | null
  phases: { name: string } | null
  assignee: ProfileSummary | null
}

export type CommentListItem = Comment & {
  author: { full_name: string; role: UserRole } | null
}

export const PROJECT_LIST_SELECT = `
  *,
  factories (name, code),
  proposer:profiles!proposed_by (full_name),
  assigned_pm:profiles!assigned_pm_id (full_name)
` as const

export const PROJECT_DETAIL_SELECT = `
  *,
  factories (name, code),
  assigned_pm:profiles!assigned_pm_id (full_name)
` as const

export const TASK_LIST_SELECT = `
  *,
  assignee:profiles!assignee_id (full_name)
` as const

export const COMMENT_LIST_SELECT = `
  *,
  author:profiles!author_id (full_name, role)
` as const

export const ESCALATION_SELECT = `
  *,
  projects (
    id,
    title,
    code,
    factory_id,
    factories (name, code)
  ),
  phases (name),
  assignee:profiles!assignee_id (full_name)
` as const

export const PROFILE_WITH_FACTORY_SELECT = '*, factories(name, code)' as const
