export type ProjectDetailTab =
  | 'overview'
  | 'finance'
  | 'wbs'
  | 'kanban'
  | 'activity'
  | 'attachments'

const ALL_TABS: ProjectDetailTab[] = [
  'overview',
  'finance',
  'wbs',
  'kanban',
  'activity',
  'attachments',
]

/** Legacy URL values that map onto a current tab. */
const TAB_ALIASES: Record<string, ProjectDetailTab> = {
  timeline: 'wbs',
}

export function parseProjectDetailTab(
  value: string | null,
  showFinance: boolean,
): ProjectDetailTab {
  if (!value) {
    return 'overview'
  }

  const resolved = TAB_ALIASES[value] ?? value

  if (!ALL_TABS.includes(resolved as ProjectDetailTab)) {
    return 'overview'
  }

  if (resolved === 'finance' && !showFinance) {
    return 'overview'
  }

  return resolved as ProjectDetailTab
}

export function notificationTabForType(type: string): ProjectDetailTab {
  if (type === 'task_blocked' || type === 'escalation_acknowledged') {
    return 'kanban'
  }

  if (type === 'phases_ready') {
    return 'wbs'
  }

  if (
    type === 'comment_project' ||
    type === 'comment_task' ||
    type === 'comment_mention'
  ) {
    return 'activity'
  }

  return 'overview'
}

export function appendProjectTab(
  linkPath: string,
  tab: ProjectDetailTab,
): string {
  const [path, search = ''] = linkPath.split('?')
  const params = new URLSearchParams(search)
  params.set('tab', tab)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}
