export const queryKeys = {
  profile: (userId: string | undefined) => ['profile', userId] as const,
  factories: ['factories'] as const,
  accounts: ['accounts'] as const,
  projects: ['projects'] as const,
}
