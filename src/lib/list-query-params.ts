import type { ProjectStatus } from '@/types/database'

export type ActiveInactiveFilter = 'all' | 'active' | 'inactive'

export type FactoriesPageParams = {
  page: number
  pageSize: number
  search: string
  status: ActiveInactiveFilter
}

export type AccountsPageParams = {
  page: number
  pageSize: number
  search: string
  role: 'all' | 'company_director' | 'factory_manager' | 'project_manager'
  factoryId: string
  status: ActiveInactiveFilter
}

export type ProjectsPageParams = {
  page: number
  pageSize: number
  search: string
  status: 'all' | ProjectStatus
  factoryId: string
}

export type EscalationsPageParams = {
  page: number
  pageSize: number
  search: string
  factoryId: string
  escalationStatus: 'all' | 'open' | 'acknowledged'
}
