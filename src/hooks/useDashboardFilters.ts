import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  AttentionDrill,
  BlockedFilter,
  OverdueFilter,
  OverdueProcurementFilter,
  PhaseIssueFilter,
  ProgressFilter,
  TaskActivityFilter,
  UnderfundedFilter,
} from '@/components/dashboard/dashboard-types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { ProjectStatus } from '@/types/database'

const FILTER_KEYS = [
  'q',
  'status',
  'factory',
  'progress',
  'blocked',
  'overdue',
  'phaseIssues',
  'underfunded',
  'overdueProcurement',
  'taskActivity',
  'drill',
] as const

export function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [projectSearch, setProjectSearch] = useState(
    () => searchParams.get('q') ?? '',
  )
  const debouncedProjectSearch = useDebouncedValue(projectSearch, 300)
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>(
    () => (searchParams.get('status') as 'all' | ProjectStatus) ?? 'all',
  )
  const [factoryFilter, setFactoryFilter] = useState(
    () => searchParams.get('factory') ?? 'all',
  )
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>(
    () => (searchParams.get('progress') as ProgressFilter) ?? 'all',
  )
  const [blockedFilter, setBlockedFilter] = useState<BlockedFilter>(
    () => (searchParams.get('blocked') as BlockedFilter) ?? 'all',
  )
  const [taskActivityFilter, setTaskActivityFilter] =
    useState<TaskActivityFilter>(
      () => (searchParams.get('taskActivity') as TaskActivityFilter) ?? 'all',
    )
  const [overdueFilter, setOverdueFilter] = useState<OverdueFilter>(
    () => (searchParams.get('overdue') as OverdueFilter) ?? 'all',
  )
  const [phaseIssueFilter, setPhaseIssueFilter] = useState<PhaseIssueFilter>(
    () => (searchParams.get('phaseIssues') as PhaseIssueFilter) ?? 'all',
  )
  const [underfundedFilter, setUnderfundedFilter] =
    useState<UnderfundedFilter>(
      () => (searchParams.get('underfunded') as UnderfundedFilter) ?? 'all',
    )
  const [overdueProcurementFilter, setOverdueProcurementFilter] =
    useState<OverdueProcurementFilter>(
      () =>
        (searchParams.get('overdueProcurement') as OverdueProcurementFilter) ??
        'all',
    )
  const [attentionDrill, setAttentionDrill] = useState<AttentionDrill>(
    () => (searchParams.get('drill') as AttentionDrill) ?? null,
  )

  useEffect(() => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        const setOrDelete = (key: string, value: string | null) => {
          if (!value || value === 'all') {
            params.delete(key)
          } else {
            params.set(key, value)
          }
        }

        setOrDelete('q', debouncedProjectSearch.trim() || null)
        setOrDelete('status', statusFilter)
        setOrDelete('factory', factoryFilter)
        setOrDelete('progress', progressFilter)
        setOrDelete('blocked', blockedFilter)
        setOrDelete('overdue', overdueFilter)
        setOrDelete('phaseIssues', phaseIssueFilter)
        setOrDelete('underfunded', underfundedFilter)
        setOrDelete('overdueProcurement', overdueProcurementFilter)
        setOrDelete('taskActivity', taskActivityFilter)
        setOrDelete('drill', attentionDrill)

        return params
      },
      { replace: true },
    )
  }, [
    attentionDrill,
    blockedFilter,
    debouncedProjectSearch,
    factoryFilter,
    overdueFilter,
    overdueProcurementFilter,
    phaseIssueFilter,
    progressFilter,
    setSearchParams,
    statusFilter,
    taskActivityFilter,
    underfundedFilter,
  ])

  const resetListFilters = useCallback(() => {
    setProjectSearch('')
    setStatusFilter('all')
    setFactoryFilter('all')
    setProgressFilter('all')
    setBlockedFilter('all')
    setTaskActivityFilter('all')
    setOverdueFilter('all')
    setPhaseIssueFilter('all')
    setUnderfundedFilter('all')
    setOverdueProcurementFilter('all')
    setAttentionDrill(null)
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        for (const key of FILTER_KEYS) {
          params.delete(key)
        }
        return params
      },
      { replace: true },
    )
  }, [setSearchParams])

  const hasActiveProjectFilters = useMemo(
    () =>
      projectSearch.trim().length > 0 ||
      statusFilter !== 'all' ||
      factoryFilter !== 'all' ||
      progressFilter !== 'all' ||
      blockedFilter !== 'all' ||
      taskActivityFilter !== 'all' ||
      overdueFilter !== 'all' ||
      phaseIssueFilter !== 'all' ||
      underfundedFilter !== 'all' ||
      overdueProcurementFilter !== 'all',
    [
      blockedFilter,
      factoryFilter,
      overdueFilter,
      overdueProcurementFilter,
      phaseIssueFilter,
      progressFilter,
      projectSearch,
      statusFilter,
      taskActivityFilter,
      underfundedFilter,
    ],
  )

  return {
    projectSearch,
    setProjectSearch,
    debouncedProjectSearch,
    statusFilter,
    setStatusFilter,
    factoryFilter,
    setFactoryFilter,
    progressFilter,
    setProgressFilter,
    blockedFilter,
    setBlockedFilter,
    taskActivityFilter,
    setTaskActivityFilter,
    overdueFilter,
    setOverdueFilter,
    phaseIssueFilter,
    setPhaseIssueFilter,
    underfundedFilter,
    setUnderfundedFilter,
    overdueProcurementFilter,
    setOverdueProcurementFilter,
    attentionDrill,
    setAttentionDrill,
    resetListFilters,
    hasActiveProjectFilters,
  }
}
