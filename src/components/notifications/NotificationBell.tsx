import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { Bell } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  appendProjectTab,
  notificationTabForType,
} from '@/lib/notification-navigation'
import { todayDateOnly } from '@/lib/date-only'
import { formatLocalizedDate } from '@/lib/i18n-format'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationsRealtime,
} from '@/hooks/useNotifications'
import {
  notificationBodyKey,
  notificationTitleKey,
  parseNotificationPayload,
} from '@/lib/notifications'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/types/database'

function NotificationItem({
  notification,
  onOpen,
}: {
  notification: AppNotification
  onOpen: (notification: AppNotification) => void
}) {
  const { t, locale } = useTranslation()
  const payload = parseNotificationPayload(notification.payload)
  const params = {
    projectTitle: payload.projectTitle ?? t('common.notAvailable'),
    projectCode: payload.projectCode ?? '',
    taskTitle: payload.taskTitle ?? t('common.notAvailable'),
    actorName: payload.actorName ?? t('common.user'),
    reason: payload.reason ?? '',
    preview: payload.preview ?? '',
  }

  const relativeTime = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: locale === 'ar' ? ar : enUS,
  })

  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-lg border border-transparent px-3 py-2.5 text-start transition-colors hover:bg-muted/80',
        !notification.is_read && 'bg-muted/50',
      )}
      onClick={() => onOpen(notification)}
    >
      <div className="flex items-start gap-2">
        {!notification.is_read ? (
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
            aria-hidden
          />
        ) : (
          <span className="mt-1.5 size-2 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t(notificationTitleKey(notification.type), params)}
          </p>
          <p className="text-sm text-muted-foreground text-pretty">
            {t(notificationBodyKey(notification.type), params)}
          </p>
          <p className="text-xs text-muted-foreground">{relativeTime}</p>
        </div>
      </div>
    </button>
  )
}

export function NotificationBell() {
  const { t, dir, locale } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { data: notifications = [], isLoading } = useNotifications()
  useNotificationsRealtime(true)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = notifications.filter((item) => !item.is_read).length
  const sheetSide = dir === 'rtl' ? 'left' : 'right'
  const today = todayDateOnly()

  const visibleNotifications = useMemo(
    () =>
      unreadOnly
        ? notifications.filter((item) => !item.is_read)
        : notifications,
    [notifications, unreadOnly],
  )

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, AppNotification[]>()
    for (const notification of visibleNotifications) {
      const date = notification.created_at.slice(0, 10)
      const label =
        date === today
          ? t('notifications.today')
          : date === getYesterday(today)
            ? t('notifications.yesterday')
            : formatLocalizedDate(date, locale)
      const bucket = groups.get(label) ?? []
      bucket.push(notification)
      groups.set(label, bucket)
    }
    return Array.from(groups.entries())
  }, [locale, t, today, visibleNotifications])

  const handleOpen = (notification: AppNotification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
    setOpen(false)
    if (notification.link_path) {
      const tab = notificationTabForType(notification.type)
      void navigate(appendProjectTab(notification.link_path, tab))
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="relative"
          aria-label={
            unreadCount > 0
              ? t('a11y.notificationsUnread', { count: unreadCount })
              : t('a11y.notifications')
          }
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -inset-e-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side={sheetSide} className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <div className="flex items-start justify-between gap-2 pe-8">
            <div className="space-y-1">
              <SheetTitle>{t('notifications.title')}</SheetTitle>
              <SheetDescription>
                {unreadCount > 0
                  ? t('notifications.unreadCount', { count: unreadCount })
                  : t('notifications.allCaughtUp')}
              </SheetDescription>
            </div>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                {t('notifications.markAllRead')}
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch
              id="notifications-unread-only"
              checked={unreadOnly}
              onCheckedChange={setUnreadOnly}
            />
            <Label htmlFor="notifications-unread-only" className="text-sm">
              {t('notifications.unreadOnly')}
            </Label>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('common.loading')}
            </p>
          ) : visibleNotifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('notifications.empty')}
            </p>
          ) : (
            <div className="space-y-4">
              {groupedNotifications.map(([label, items]) => (
                <div key={label} className="space-y-1">
                  <p className="px-3 text-xs font-medium text-muted-foreground">
                    {label}
                  </p>
                  <ul className="space-y-1">
                    {items.map((notification) => (
                      <li key={notification.id}>
                        <NotificationItem
                          notification={notification}
                          onOpen={handleOpen}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function getYesterday(today: string): string {
  const date = new Date(`${today}T00:00:00`)
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}
