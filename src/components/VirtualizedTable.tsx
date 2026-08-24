import { type ReactNode, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface VirtualizedTableProps {
  rowCount: number
  colSpan: number
  estimateSize?: number
  overscan?: number
  maxHeightClassName?: string
  header: ReactNode
  renderRow: (index: number) => ReactNode
  empty: ReactNode
  className?: string
}

export function VirtualizedTable({
  rowCount,
  colSpan,
  estimateSize = 48,
  overscan = 8,
  maxHeightClassName = 'max-h-[min(32rem,70vh)]',
  header,
  renderRow,
  empty,
  className,
}: VirtualizedTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  // TanStack Virtual returns unstable function identities; skip compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })
  const items = virtualizer.getVirtualItems()
  const paddingTop = items.length > 0 ? items[0].start : 0
  const lastItem = items.at(-1)
  const paddingBottom =
    lastItem && rowCount > 0
      ? virtualizer.getTotalSize() - lastItem.end
      : 0

  return (
    <div
      ref={parentRef}
      className={cn(
        'relative w-full overflow-auto rounded-xl border border-border/60',
        maxHeightClassName,
        className,
      )}
    >
      <table className="w-full caption-bottom text-sm">
        <TableHeader className="sticky top-0 z-10 bg-background">
          {header}
        </TableHeader>
        <TableBody>
          {rowCount === 0 ? (
            empty
          ) : (
            <>
              {paddingTop > 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="p-0 hover:bg-transparent"
                    style={{ height: paddingTop }}
                  />
                </TableRow>
              ) : null}
              {items.map((item) => (
                <TableRow
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                >
                  {renderRow(item.index)}
                </TableRow>
              ))}
              {paddingBottom > 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="p-0 hover:bg-transparent"
                    style={{ height: paddingBottom }}
                  />
                </TableRow>
              ) : null}
            </>
          )}
        </TableBody>
      </table>
    </div>
  )
}
