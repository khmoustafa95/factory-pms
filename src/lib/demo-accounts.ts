export const DEMO_ACCOUNTS = [
  {
    email: 'director@demo.local',
    roleKey: 'roles.company_director',
    factory: '—',
    notesKey: 'auth.demoAccounts.directorNote',
  },
  {
    email: 'director.viewer@demo.local',
    roleKey: 'roles.company_director',
    factory: '—',
    notesKey: 'auth.demoAccounts.directorViewerNote',
  },
  {
    email: 'fm.damascus@demo.local',
    roleKey: 'roles.factory_manager',
    factory: 'DMS',
    notesKey: 'auth.demoAccounts.fmDamascusNote',
  },
  {
    email: 'fm.damascus.viewer@demo.local',
    roleKey: 'roles.factory_manager',
    factory: 'DMS',
    notesKey: 'auth.demoAccounts.fmDamascusViewerNote',
  },
  {
    email: 'fm.aleppo@demo.local',
    roleKey: 'roles.factory_manager',
    factory: 'ALP',
    notesKey: 'auth.demoAccounts.fmAleppoNote',
  },
] as const

export const DEMO_PASSWORD = 'demo123456'
