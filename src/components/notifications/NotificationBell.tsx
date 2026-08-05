import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
  const { t, dir } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { data: notifications = [], isLoading } = useNotifications()
  useNotificationsRealtime(true)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = notifications.filter((item) => !item.is_read).length
  const sheetSide = dir === 'rtl' ? 'left' : 'right'

  const handleOpen = (notification: AppNotification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
    setOpen(false)
    if (notification.link_path) {
      void navigate(notification.link_path)
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
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('common.loading')}
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('notifications.empty')}
            </p>
          ) : (
            <ul className="space-y-1">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onOpen={handleOpen}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
