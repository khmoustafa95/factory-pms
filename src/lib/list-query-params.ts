import type { ProjectStatus } from '@/types/database'

export type FactoriesPageParams = {
  page: number
  pageSize: number
  search: string
  status: 'all' | 'active' | 'inactive'
}

export type AccountsPageParams = {
  page: number
  pageSize: number
  search: string
  role: 'all' | 'company_director' | 'factory_manager' | 'project_manager'
  factoryId: string
  status: 'all' | 'active' | 'inactive'
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
}
