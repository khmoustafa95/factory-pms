import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '@/contexts/LocaleContext'
import { cn } from '@/lib/utils'

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export type DashboardChartDatum = {
  key: string
  label: string
  value: number
  color?: string
}

interface StatusDonutChartProps {
  data: DashboardChartDatum[]
  activeKey?: string | null
  onSliceClick?: (key: string) => void
  emptyLabel: string
}

export function StatusDonutChart({
  data,
  activeKey,
  onSliceClick,
  emptyLabel,
}: StatusDonutChartProps) {
  const { dir } = useTranslation()
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="h-52 min-w-0" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="transparent"
              onClick={(entry) => {
                const key =
                  typeof entry === 'object' &&
                  entry !== null &&
                  'key' in entry &&
                  typeof entry.key === 'string'
                    ? entry.key
                    : null
                if (key && onSliceClick) {
                  onSliceClick(key)
                }
              }}
              style={{ cursor: onSliceClick ? 'pointer' : undefined }}
            >
              {data.map((item, index) => (
                <Cell
                  key={item.key}
                  fill={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
                  opacity={activeKey && activeKey !== item.key ? 0.35 : 1}
                  stroke={activeKey === item.key ? 'var(--primary)' : undefined}
                  strokeWidth={activeKey === item.key ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                typeof value === 'number' ? value : Number(value ?? 0),
                '',
              ]}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--card-foreground)',
                direction: dir,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2 text-sm">
        {data.map((item, index) => (
          <li key={item.key}>
            <button
              type="button"
              disabled={!onSliceClick}
              onClick={() => onSliceClick?.(item.key)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-md px-1 py-0.5 text-start',
                onSliceClick && 'hover:bg-muted/50',
                activeKey === item.key && 'bg-muted/60',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    background:
                      item.color ?? CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                <span className="truncate text-muted-foreground">
                  {item.label}
                </span>
              </span>
              <span className="font-medium tabular-nums">{item.value}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface BlockedProjectsBarChartProps {
  data: Array<{
    projectId: string
    projectTitle: string
    blockedTaskCount: number
  }>
  emptyLabel: string
  onBarClick?: (projectId: string) => void
}

export function BlockedProjectsBarChart({
  data,
  emptyLabel,
  onBarClick,
}: BlockedProjectsBarChartProps) {
  const { dir } = useTranslation()

  if (!data.length) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    )
  }

  const chartData = data.map((item) => ({
    ...item,
    shortTitle:
      item.projectTitle.length > 22
        ? `${item.projectTitle.slice(0, 22)}…`
        : item.projectTitle,
  }))

  return (
    <div className="h-56 w-full min-w-0" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <XAxis type="number" allowDecimals={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="shortTitle"
            width={120}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => [
              typeof value === 'number' ? value : Number(value ?? 0),
              '',
            ]}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as
                { projectTitle?: string } | undefined
              return row?.projectTitle ?? ''
            }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--card-foreground)',
              direction: dir,
            }}
          />
          <Bar
            dataKey="blockedTaskCount"
            fill="var(--destructive)"
            radius={[0, 4, 4, 0]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(entry) => {
              const projectId =
                typeof entry === 'object' &&
                entry !== null &&
                'projectId' in entry &&
                typeof entry.projectId === 'string'
                  ? entry.projectId
                  : null
              if (projectId && onBarClick) {
                onBarClick(projectId)
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
