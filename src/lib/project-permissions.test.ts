import { describe, expect, it } from 'vitest'
import {
  canConfirmCompletion,
  canGovernExecution,
  canManagePhases,
  canManageTasks,
  canExecuteTasks,
  canRequestCompletion,
  canStartExecution,
} from '@/lib/wbs'
import {
  canCommentOnProject,
  canEditProjectDetails,
  canManageProjectAttachments,
  canRequestProjectChange,
} from '@/lib/project-status'
import {
  canManageProjectFunding,
  canManageProjectOperations,
} from '@/lib/project-finance'
import { canManageAccounts, getManagedRoles } from '@/lib/account-permissions'

const director = {
  id: 'd1',
  role: 'company_director' as const,
  factory_id: null,
  can_control: true,
}
const directorViewer = { ...director, id: 'd2', can_control: false }
const fm = {
  id: 'fm1',
  role: 'factory_manager' as const,
  factory_id: 'f1',
  can_control: true,
}
const fmViewer = { ...fm, id: 'fm2', can_control: false }

const assigned = {
  status: 'in_progress' as const,
  factory_id: 'f1',
}

describe('lifecycle permissions', () => {
  it('lets the controlling factory manager write phases and tasks', () => {
    expect(canManagePhases(assigned, fm)).toBe(true)
    expect(canManagePhases(assigned, director)).toBe(false)
    expect(canManagePhases(assigned, fmViewer)).toBe(false)
    expect(canManageTasks(assigned, fm)).toBe(true)
    expect(canManageTasks(assigned, director)).toBe(false)
    expect(canManageTasks({ ...assigned, status: 'approved' }, fm)).toBe(true)
    expect(canExecuteTasks({ ...assigned, status: 'approved' }, fm)).toBe(false)
    expect(canExecuteTasks(assigned, fm)).toBe(true)
    expect(canExecuteTasks(assigned, fmViewer)).toBe(false)
  })

  it('lets controlling factory manager or director govern pause/resume', () => {
    expect(canGovernExecution(assigned, fm)).toBe(true)
    expect(canGovernExecution(assigned, director)).toBe(true)
    expect(canGovernExecution(assigned, directorViewer)).toBe(false)
    expect(canGovernExecution(assigned, fmViewer)).toBe(false)
  })

  it('splits completion request and director confirm', () => {
    expect(canRequestCompletion(assigned, fm)).toBe(true)
    expect(canRequestCompletion(assigned, fmViewer)).toBe(false)
    expect(canRequestCompletion(assigned, director)).toBe(false)
    expect(canConfirmCompletion(director)).toBe(true)
    expect(canConfirmCompletion(directorViewer)).toBe(false)
    expect(canConfirmCompletion(fm)).toBe(false)
    expect(
      canStartExecution({ status: 'approved', factory_id: 'f1' }, fm),
    ).toBe(true)
    expect(
      canStartExecution({ status: 'approved', factory_id: 'f1' }, fmViewer),
    ).toBe(false)
    expect(
      canStartExecution({ status: 'approved', factory_id: 'f1' }, director),
    ).toBe(false)
  })

  it('allows comments only for controlling director/FM', () => {
    expect(canCommentOnProject('completed', fm)).toBe(true)
    expect(canCommentOnProject('completed', fmViewer)).toBe(false)
    expect(canCommentOnProject('proposed', fm)).toBe(true)
    expect(canCommentOnProject('proposed', directorViewer)).toBe(false)
    expect(canEditProjectDetails('in_progress')).toBe(false)
    expect(canEditProjectDetails('draft')).toBe(true)
    expect(canManageProjectAttachments('in_progress', fm)).toBe(true)
    expect(canManageProjectAttachments('in_progress', fmViewer)).toBe(false)
    expect(canRequestProjectChange('approved')).toBe(true)
  })

  it('splits funding (director/FM) from operations (FM)', () => {
    expect(canManageProjectFunding(assigned, director)).toBe(true)
    expect(canManageProjectFunding(assigned, directorViewer)).toBe(false)
    expect(canManageProjectOperations(assigned, fm)).toBe(true)
    expect(canManageProjectOperations(assigned, director)).toBe(false)
    expect(canManageProjectOperations(assigned, fmViewer)).toBe(false)
    expect(
      canManageProjectFunding({ ...assigned, status: 'completed' }, fm),
    ).toBe(false)
  })

  it('blocks finance writes until the project is approved', () => {
    const proposed = { ...assigned, status: 'proposed' as const }
    const approved = { ...assigned, status: 'approved' as const }
    const draft = { ...assigned, status: 'draft' as const }

    expect(canManageProjectFunding(proposed, fm)).toBe(false)
    expect(canManageProjectFunding(proposed, director)).toBe(false)
    expect(canManageProjectOperations(proposed, fm)).toBe(false)

    expect(canManageProjectFunding(draft, fm)).toBe(false)
    expect(canManageProjectFunding(approved, director)).toBe(true)
    expect(canManageProjectFunding(approved, fm)).toBe(true)
    expect(canManageProjectOperations(approved, fm)).toBe(true)
  })

  it('lets only controlling company directors manage accounts', () => {
    expect(getManagedRoles(director)).toEqual([
      'company_director',
      'factory_manager',
    ])
    expect(canManageAccounts(director)).toBe(true)
    expect(canManageAccounts(directorViewer)).toBe(false)
    expect(canManageAccounts(fm)).toBe(false)
  })
})
