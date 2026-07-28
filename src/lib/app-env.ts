export type AppEnv = 'local' | 'staging' | 'production' | (string & {})

export function getAppEnv(): AppEnv {
  return (import.meta.env.VITE_APP_ENV as AppEnv | undefined) ?? 'production'
}

export function isNonProductionEnv(): boolean {
  return getAppEnv() !== 'production'
}

/** Demo login hints are for local/staging trial only — never production. */
export function shouldShowDemoAccounts(): boolean {
  return isNonProductionEnv()
}
