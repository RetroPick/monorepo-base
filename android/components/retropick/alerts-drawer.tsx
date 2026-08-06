'use client'

import { X, Trash2, BellRing, Info, ShieldAlert, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NotificationLog = {
  id: string
  title: string
  body: string
  time: string
  type: 'info' | 'alert' | 'whale'
  read: boolean
}

export function AlertsDrawer({
  open,
  onClose,
  notifications,
  onClear,
  onDeleteNotif,
}: {
  open: boolean
  onClose: () => void
  notifications: NotificationLog[]
  onClear: () => void
  onDeleteNotif?: (id: string) => void
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-40 transition-all duration-300",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Slide-out Panel */}
      <aside
        className={cn(
          "absolute right-0 top-0 bottom-[72px] flex w-[85%] max-w-[320px] flex-col border-l border-border bg-popover transition-transform duration-300 shadow-2xl",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4.5 py-4">
          <div className="flex items-center gap-2">
            <BellRing className="h-4.5 w-4.5 text-primary" />
            <span className="font-display text-sm font-bold text-foreground">
              Notifications
            </span>
          </div>
          <div className="flex items-center gap-3">
            {notifications.length > 0 && (
              <button
                onClick={onClear}
                className="text-muted-foreground hover:text-no transition-colors text-xs font-bold flex items-center gap-1"
                aria-label="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
            <button onClick={onClose} aria-label="Close notifications panel">
              <X className="h-4.5 w-4.5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length > 0 ? (
            notifications.map((n) => {
              let Icon = Info
              let iconColor = 'text-blue-400 bg-blue-500/15'
              if (n.type === 'alert') {
                Icon = BellRing
                iconColor = 'text-yes bg-yes-soft'
              } else if (n.type === 'whale') {
                Icon = ShieldAlert
                iconColor = 'text-purple-400 bg-purple-500/15'
              }

              return (
                <div
                  key={n.id}
                  className={cn(
                    "group relative rounded-xl border p-3 space-y-1 bg-card transition-all",
                    n.read ? "border-border/60" : "border-primary/30 bg-primary/5 shadow-sm"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={cn("grid h-7 w-7 place-items-center rounded-full shrink-0", iconColor)}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex justify-between items-baseline gap-1">
                        <h4 className="text-xs font-bold text-foreground truncate">{n.title}</h4>
                        <span className="text-[9px] text-muted-foreground shrink-0">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                        {n.body}
                      </p>
                    </div>

                    {onDeleteNotif && (
                      <button
                        onClick={() => onDeleteNotif(n.id)}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-no opacity-60 hover:opacity-100 transition-all p-1"
                        aria-label="Delete notification"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col justify-center items-center py-20 text-center space-y-3.5">
              <span className="text-3xl animate-bounce">📭</span>
              <div>
                <p className="text-xs font-bold text-foreground">All caught up!</p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[180px] leading-relaxed">
                  No alerts or signals logged. Set a price alert on any market detail page to monitor changes!
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

