export type ProjectDetailTab =
  | 'overview'
  | 'finance'
  | 'wbs'
  | 'kanban'
  | 'timeline'
  | 'activity'
  | 'attachments'

const ALL_TABS: ProjectDetailTab[] = [
  'overview',
  'finance',
  'wbs',
  'kanban',
  'timeline',
  'activity',
  'attachments',
]

export function parseProjectDetailTab(
  value: string | null,
  showFinance: boolean,
): ProjectDetailTab {
  if (!value || !ALL_TABS.includes(value as ProjectDetailTab)) {
    return 'overview'
  }

  if (value === 'finance' && !showFinance) {
    return 'overview'
  }

  return value as ProjectDetailTab
}

export function notificationTabForType(type: string): ProjectDetailTab {
  if (type === 'task_blocked' || type === 'escalation_acknowledged') {
    return 'kanban'
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
