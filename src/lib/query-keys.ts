export const queryKeys = {
  profile: (userId: string | undefined) => ['profile', userId] as const,
  factories: ['factories'] as const,
  accounts: ['accounts'] as const,
  projects: ['projects'] as const,
  project: (projectId: string | undefined) => ['project', projectId] as const,
  phases: (projectId: string | undefined) => ['phases', projectId] as const,
  tasks: (projectId: string | undefined) => ['tasks', projectId] as const,
  comments: (entityType: string, entityId: string | undefined) =>
    ['comments', entityType, entityId] as const,
  projectActivity: ['project-activity'] as const,
  escalations: ['escalations'] as const,
  dashboard: ['dashboard'] as const,
  factoryProjectManagers: (factoryId: string | null | undefined) =>
    ['factory-project-managers', factoryId] as const,
}
