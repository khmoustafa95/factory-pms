export const DEMO_ACCOUNTS = [
  {
    email: 'director@demo.local',
    roleKey: 'roles.company_director',
    factory: '—',
    notesKey: 'auth.demoAccounts.directorNote',
  },
  {
    email: 'fm.damascus@demo.local',
    roleKey: 'roles.factory_manager',
    factory: 'DMS',
    notesKey: 'auth.demoAccounts.fmDamascusNote',
  },
  {
    email: 'fm.aleppo@demo.local',
    roleKey: 'roles.factory_manager',
    factory: 'ALP',
    notesKey: 'auth.demoAccounts.fmAleppoNote',
  },
  {
    email: 'pm.ahmed@demo.local',
    roleKey: 'roles.project_manager',
    factory: 'DMS',
    notesKey: 'auth.demoAccounts.pmAhmedNote',
  },
  {
    email: 'pm.sara@demo.local',
    roleKey: 'roles.project_manager',
    factory: 'DMS',
    notesKey: 'auth.demoAccounts.pmSaraNote',
  },
  {
    email: 'pm.khalid@demo.local',
    roleKey: 'roles.project_manager',
    factory: 'ALP',
    notesKey: 'auth.demoAccounts.pmKhalidNote',
  },
  {
    email: 'inactive@demo.local',
    roleKey: 'roles.project_manager',
    factory: 'DMS',
    notesKey: 'auth.demoAccounts.inactiveNote',
  },
] as const

export const DEMO_PASSWORD = 'demo123456'
