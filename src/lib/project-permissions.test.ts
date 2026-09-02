import { describe, expect, it } from 'vitest'
import {
  canConfirmCompletion,
  canGovernExecution,
  canManagePhases,
  canManageTasks,
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

const director = {
  id: 'd1',
  role: 'company_director' as const,
  factory_id: null,
}
const fm = {
  id: 'fm1',
  role: 'factory_manager' as const,
  factory_id: 'f1',
}
const pm = {
  id: 'pm1',
  role: 'project_manager' as const,
  factory_id: 'f1',
}

const assigned = {
  status: 'in_progress' as const,
  assigned_pm_id: 'pm1',
  factory_id: 'f1',
}

describe('lifecycle permissions', () => {
  it('lets only the assigned PM write WBS', () => {
    expect(canManagePhases(assigned, pm)).toBe(true)
    expect(canManageTasks(assigned, pm)).toBe(true)
    expect(canManagePhases(assigned, fm)).toBe(false)
    expect(canManagePhases(assigned, director)).toBe(false)
    expect(
      canManageTasks(
        { ...assigned, status: 'approved' },
        pm,
      ),
    ).toBe(false)
  })

  it('lets factory manager or director govern pause/resume', () => {
    expect(canGovernExecution(assigned, fm)).toBe(true)
    expect(canGovernExecution(assigned, director)).toBe(true)
    expect(canGovernExecution(assigned, pm)).toBe(false)
  })

  it('splits completion request and director confirm', () => {
    expect(canRequestCompletion(assigned, fm)).toBe(true)
    expect(canRequestCompletion(assigned, director)).toBe(false)
    expect(canConfirmCompletion(director)).toBe(true)
    expect(canConfirmCompletion(fm)).toBe(false)
    expect(canStartExecution({ status: 'approved', factory_id: 'f1' }, fm)).toBe(
      true,
    )
    expect(
      canStartExecution({ status: 'approved', factory_id: 'f1' }, director),
    ).toBe(false)
  })

  it('allows comments on completed projects and proposal discussion only for director/FM', () => {
    expect(canCommentOnProject('completed', pm)).toBe(true)
    expect(canCommentOnProject('proposed', pm)).toBe(false)
    expect(canCommentOnProject('proposed', fm)).toBe(true)
    expect(canEditProjectDetails('in_progress')).toBe(false)
    expect(canEditProjectDetails('draft')).toBe(true)
    expect(canManageProjectAttachments('in_progress', fm)).toBe(true)
    expect(canManageProjectAttachments('in_progress', pm)).toBe(false)
    expect(canRequestProjectChange('approved')).toBe(true)
  })

  it('splits funding (director/FM) from operations (FM/PM)', () => {
    expect(canManageProjectFunding(assigned, director)).toBe(true)
    expect(canManageProjectFunding(assigned, pm)).toBe(false)
    expect(canManageProjectOperations(assigned, pm)).toBe(true)
    expect(canManageProjectOperations(assigned, director)).toBe(false)
    expect(
      canManageProjectFunding({ ...assigned, status: 'completed' }, fm),
    ).toBe(false)
  })
})
