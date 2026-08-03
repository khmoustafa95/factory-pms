export type ValidationTranslator = (
  key: string,
  params?: Record<string, string | number>,
) => string
