const PROJECT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type ProjectRouteRef =
  | { kind: 'canonical'; factoryCode: string; projectCode: string }
  | { kind: 'legacy'; ref: string }

export type ProjectLinkSource = {
  code: string
  factories?: { code: string } | null
}

export function isProjectUuid(value: string): boolean {
  return PROJECT_UUID_REGEX.test(value)
}

export function encodeProjectRouteSegment(value: string): string {
  return encodeURIComponent(value)
}

export function buildProjectPath(project: ProjectLinkSource): string {
  const factoryCode = project.factories?.code
  if (!factoryCode) {
    return `/projects/${encodeProjectRouteSegment(project.code)}`
  }

  return `/projects/${encodeProjectRouteSegment(factoryCode)}/${encodeProjectRouteSegment(project.code)}`
}

export function buildProjectPathFromCodes(
  factoryCode: string,
  projectCode: string,
): string {
  return `/projects/${encodeProjectRouteSegment(factoryCode)}/${encodeProjectRouteSegment(projectCode)}`
}

export function parseProjectRouteParams(params: {
  factoryCode?: string
  projectCode?: string
  projectRef?: string
}): ProjectRouteRef | undefined {
  if (params.factoryCode && params.projectCode) {
    return {
      kind: 'canonical',
      factoryCode: decodeURIComponent(params.factoryCode),
      projectCode: decodeURIComponent(params.projectCode),
    }
  }

  if (params.projectRef) {
    return {
      kind: 'legacy',
      ref: decodeURIComponent(params.projectRef),
    }
  }

  return undefined
}

export function projectRouteKey(ref: ProjectRouteRef): string {
  return ref.kind === 'canonical'
    ? `${ref.factoryCode}/${ref.projectCode}`
    : ref.ref
}

export function isCanonicalProjectPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  return segments[0] === 'projects' && segments.length === 3
}
