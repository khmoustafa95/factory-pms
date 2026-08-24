import type {
  AccountsPageParams,
  EscalationsPageParams,
  FactoriesPageParams,
  ProjectsPageParams,
} from '@/lib/list-query-params'

export const queryKeys = {
  profile: (userId: string | undefined) => ['profile', userId] as const,
  factories: ['factories'] as const,
  factoriesPage: (params: FactoriesPageParams) =>
    ['factories', 'page', params] as const,
  accounts: ['accounts'] as const,
  accountsPage: (params: AccountsPageParams) =>
    ['accounts', 'page', params] as const,
  projects: ['projects'] as const,
  projectsPage: (params: ProjectsPageParams) =>
    ['projects', 'page', params] as const,
  project: (projectId: string | undefined) => ['project', projectId] as const,
  projectAttachments: (projectId: string | undefined) =>
    ['project-attachments', projectId] as const,
  phases: (projectId: string | undefined) => ['phases', projectId] as const,
  tasks: (projectId: string | undefined) => ['tasks', projectId] as const,
  comments: (entityType: string, entityId: string | undefined) =>
    ['comments', entityType, entityId] as const,
  projectActivity: (projectId: string | undefined) =>
    ['project-activity', projectId] as const,
  projectStatusTransitions: (projectId: string | undefined) =>
    ['project-status-transitions', projectId] as const,
  escalations: ['escalations'] as const,
  escalationsPage: (params: EscalationsPageParams) =>
    ['escalations', 'page', params] as const,
  dashboard: ['dashboard'] as const,
  dashboardInsights: ['dashboard', 'insights'] as const,
  dashboardProjects: ['dashboard', 'projects'] as const,
  commandProjects: (search: string) =>
    ['command-projects', search] as const,
  appSettings: ['app-settings'] as const,
  currencies: ['currencies'] as const,
  factoryProjectManagers: (factoryId: string | null | undefined) =>
    ['factory-project-managers', factoryId] as const,
  notifications: (userId: string | undefined) =>
    ['notifications', userId] as const,
  mentionableProfiles: (projectId: string | undefined) =>
    ['mentionable-profiles', projectId] as const,
}
