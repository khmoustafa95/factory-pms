import {
  PointerSensor,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  type PointerSensorOptions,
} from '@dnd-kit/core'
import type { PointerEvent } from 'react'
import type { TaskListItem } from '@/hooks/useTasks'
import { isTaskStatus } from '@/lib/task-status'
import type { TaskStatus } from '@/types/database'

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, option, [role="combobox"], [role="listbox"], [data-no-dnd]'

export interface KanbanTaskDragData {
  type: 'task'
  task: TaskListItem
}

export interface KanbanColumnDragData {
  type: 'column'
  status: TaskStatus
}

export function isKanbanTaskDragData(
  data: unknown,
): data is KanbanTaskDragData {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  if (!('type' in data) || data.type !== 'task') {
    return false
  }

  if (
    !('task' in data) ||
    typeof data.task !== 'object' ||
    data.task === null
  ) {
    return false
  }

  return 'id' in data.task && typeof data.task.id === 'string'
}

export function isKanbanColumnDragData(
  data: unknown,
): data is KanbanColumnDragData {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  if (!('type' in data) || data.type !== 'column') {
    return false
  }

  return 'status' in data && isTaskStatus(data.status)
}

export function getDroppableStatus(over: {
  id: string | number
  data: { current?: unknown }
}): TaskStatus | null {
  if (isKanbanColumnDragData(over.data.current)) {
    return over.data.current.status
  }

  return isTaskStatus(over.id) ? over.id : null
}

function shouldHandlePointerEvent(event: PointerEvent['nativeEvent']): boolean {
  if (!event.isPrimary || event.button !== 0) {
    return false
  }

  const target = event.target
  if (!(target instanceof Element)) {
    return false
  }

  return !target.closest(INTERACTIVE_SELECTOR)
}

export class KanbanPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (
        { nativeEvent: event }: PointerEvent,
        { onActivation }: PointerSensorOptions,
      ) => {
        if (!shouldHandlePointerEvent(event)) {
          return false
        }

        onActivation?.({ event })
        return true
      },
    },
  ]
}

export const kanbanCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) {
    return pointerCollisions
  }

  return closestCorners(args)
}
