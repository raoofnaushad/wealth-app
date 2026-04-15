import { useEffect, useState } from 'react'
import { Calendar as CalendarIcon, CheckCircle2, Circle, Clock, Loader2, MapPin, Phone, Users, Flag, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { dealsApi } from '../api'
import type { DealEvent, DealTask, DealEventType, TaskPriority, TaskStatus, GoogleCalendarAccount } from '../types'

const EVENT_ICONS: Record<DealEventType, typeof CalendarIcon> = {
  meeting: Users,
  call: Phone,
  site_visit: MapPin,
  deadline: AlertCircle,
  other: CalendarIcon,
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
}

const STATUS_ICON: Record<TaskStatus, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
}

export function EventsTasksPage() {
  const [events, setEvents] = useState<DealEvent[]>([])
  const [tasks, setTasks] = useState<DealTask[]>([])
  const [calendarAccounts, setCalendarAccounts] = useState<GoogleCalendarAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dealsApi.listEvents(),
      dealsApi.listTasks(),
      dealsApi.listCalendarAccounts(),
    ]).then(([ev, tk, cal]) => {
      setEvents(ev)
      setTasks(tk)
      setCalendarAccounts(cal)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading...
      </div>
    )
  }

  const connectedCalendar = calendarAccounts.find(a => a.status === 'connected')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Events & Tasks</h1>
        {connectedCalendar && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="size-2 rounded-full bg-emerald-500" />
            Calendar synced: {connectedCalendar.emailAddress}
            {connectedCalendar.lastSyncedAt && (
              <span>
                (last: {new Date(connectedCalendar.lastSyncedAt).toLocaleString()})
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="events">
            <TabsList>
              <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="mt-4 space-y-3">
              {events.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No upcoming events.</p>
              ) : (
                events
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((event) => {
                    const Icon = EVENT_ICONS[event.type]
                    return (
                      <Card key={event.id} className="hover:border-primary/30 transition-colors">
                        <CardContent className="flex items-start gap-4 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                            <Icon className="size-5" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium truncate">{event.title}</h3>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {event.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="size-3" />
                                {new Date(event.startTime).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {event.endTime && (
                                  <> – {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                                )}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3" />
                                  {event.location}
                                </span>
                              )}
                              {event.calendarEventId && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                                  <CalendarIcon className="size-2.5" />
                                  Synced
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-4 space-y-3">
              {tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No tasks found.</p>
              ) : (
                tasks
                  .sort((a, b) => {
                    // Sort: todo first, then in_progress, then done
                    const statusOrder: Record<TaskStatus, number> = { todo: 0, in_progress: 1, done: 2 }
                    return statusOrder[a.status] - statusOrder[b.status]
                  })
                  .map((task) => {
                    const StatusIcon = STATUS_ICON[task.status]
                    const priorityConfig = PRIORITY_CONFIG[task.priority]
                    const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date()

                    return (
                      <Card key={task.id} className={cn(
                        'hover:border-primary/30 transition-colors',
                        task.status === 'done' && 'opacity-60',
                      )}>
                        <CardContent className="flex items-start gap-4 p-4">
                          <StatusIcon className={cn(
                            'size-5 mt-0.5 shrink-0',
                            task.status === 'done' ? 'text-emerald-500' : task.status === 'in_progress' ? 'text-blue-500' : 'text-muted-foreground',
                          )} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className={cn(
                                'text-sm font-medium truncate',
                                task.status === 'done' && 'line-through',
                              )}>
                                {task.title}
                              </h3>
                              <Badge className={cn('border-none text-[10px] shrink-0', priorityConfig.className)}>
                                {priorityConfig.label}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {task.assigneeName && (
                                <span className="flex items-center gap-1">
                                  <Users className="size-3" />
                                  {task.assigneeName}
                                </span>
                              )}
                              {task.dueDate && (
                                <span className={cn(
                                  'flex items-center gap-1',
                                  isOverdue && 'text-destructive font-medium',
                                )}>
                                  <Flag className="size-3" />
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                  {isOverdue && ' (overdue)'}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Mini calendar */}
        <div>
          <MiniCalendar events={events} />
        </div>
      </div>
    </div>
  )
}

function MiniCalendar({ events }: { events: DealEvent[] }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  // Dates that have events
  const eventDates = new Set(
    events.map(e => new Date(e.startTime).toDateString())
  )

  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="py-1 text-muted-foreground font-medium">{d}</div>
          ))}
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />
            const dateStr = new Date(year, month, day).toDateString()
            const hasEvent = eventDates.has(dateStr)
            const isToday = day === today.getDate()
            return (
              <div
                key={day}
                className={cn(
                  'relative py-1.5 rounded text-xs',
                  isToday && 'bg-primary text-primary-foreground font-bold',
                  hasEvent && !isToday && 'font-medium text-foreground',
                  !hasEvent && !isToday && 'text-muted-foreground',
                )}
              >
                {day}
                {hasEvent && (
                  <div className={cn(
                    'absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full',
                    isToday ? 'bg-primary-foreground' : 'bg-primary'
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
