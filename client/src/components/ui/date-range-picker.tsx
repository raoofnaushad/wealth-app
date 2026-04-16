'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import type { DateRange as DayPickerDateRange, ActiveModifiers } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import type { CalendarProps } from '@/components/ui/calendar'

interface DateRangePickerProps {
  onFilterChange: (filter: string) => void
  currentFilter?: string
  className?: string
  mobileSheetContentClassName?: string
  mobileCalendarContainerClassName?: string
  mobileCalendarClassName?: string
  mobileCalendarClassNames?: CalendarProps['classNames']
  mobileOnRangeSelect?: (
    currentRange: DayPickerDateRange | undefined,
    nextRange: DayPickerDateRange | undefined,
    selectedDay: Date,
    activeModifiers: ActiveModifiers,
  ) => DayPickerDateRange | undefined
}

function buildPresets() {
  const today = new Date()
  return [
    {
      label: 'Last two days',
      range: {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
        to: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
      },
    },
    {
      label: 'Last 7 days',
      range: {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
        to: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
      },
    },
    {
      label: 'Last 30 days',
      range: {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
        to: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
      },
    },
    {
      label: 'This Month',
      range: {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: today,
      },
    },
    {
      label: 'Last month',
      range: {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 0),
      },
    },
    {
      label: 'This Quarter',
      range: {
        from: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
        to: today,
      },
    },
    {
      label: 'This Year',
      range: {
        from: new Date(today.getFullYear(), 0, 1),
        to: today,
      },
    },
  ]
}

function parseCustomRange(label: string): DayPickerDateRange | undefined {
  const match = label.match(/^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/)
  if (!match) return undefined
  const from = new Date(`${match[1]}T00:00:00`)
  const to = new Date(`${match[2]}T00:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return undefined
  return { from, to }
}

export function DateRangePicker({
  onFilterChange,
  currentFilter = 'This Month',
  className,
  mobileSheetContentClassName,
  mobileCalendarContainerClassName,
  mobileCalendarClassName,
  mobileCalendarClassNames,
  mobileOnRangeSelect,
}: DateRangePickerProps) {
  const isMobile = useIsMobile()
  const [presets, setPresets] = React.useState(buildPresets)
  const [isOpen, setIsOpen] = React.useState(false)

  // Committed state
  const [date, setDate] = React.useState<DayPickerDateRange | undefined>(() => {
    const preset = buildPresets().find((p) => p.label === currentFilter)
    return preset?.range ?? parseCustomRange(currentFilter)
  })
  const [selectedLabel, setSelectedLabel] = React.useState(currentFilter)

  // Draft state (while popover/sheet is open)
  const [draftDate, setDraftDate] = React.useState<DayPickerDateRange | undefined>(date)
  const [draftLabel, setDraftLabel] = React.useState(currentFilter)

  // Refresh presets & draft when opened
  React.useEffect(() => {
    if (!isOpen) return
    const fresh = buildPresets()
    setPresets(fresh)
    setDraftDate(date)
    setDraftLabel(selectedLabel)
  }, [isOpen]) // intentionally omit date/selectedLabel to snapshot on open

  // Sync if parent changes currentFilter externally
  React.useEffect(() => {
    setSelectedLabel(currentFilter)
    const preset = presets.find((p) => p.label === currentFilter)
    setDate(preset?.range ?? parseCustomRange(currentFilter))
  }, [currentFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDateSelect(range: DayPickerDateRange | undefined) {
    setDraftDate(range)
    if (range?.from && range?.to) {
      setDraftLabel(`${format(range.from, 'yyyy-MM-dd')} to ${format(range.to, 'yyyy-MM-dd')}`)
    }
  }

  function handlePresetSelect(label: string, range: DayPickerDateRange) {
    setDraftDate(range)
    setDraftLabel(label)
  }

  function handleApply() {
    if (!draftDate?.from || !draftDate?.to) return
    setDate(draftDate)
    setSelectedLabel(draftLabel)
    onFilterChange(draftLabel)
    setIsOpen(false)
  }

  const canApply = Boolean(draftDate?.from && draftDate?.to)

  const triggerClassName = cn(
    'flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm',
    'ring-offset-background transition-colors',
    'hover:bg-accent hover:text-accent-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'h-9 justify-start text-left font-normal cursor-pointer',
    !date && 'text-muted-foreground',
    className ?? 'w-auto',
  )

  function renderPresetButtons(mobile: boolean) {
    return (
      <div className={cn('space-y-1', mobile ? 'grid grid-cols-2 gap-1.5 space-y-0' : 'w-32')}>
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant={draftLabel === preset.label ? 'default' : 'ghost'}
            className={cn('text-sm', mobile ? 'h-9 w-full justify-center' : 'h-8 w-full justify-start')}
            onClick={() => handlePresetSelect(preset.label, preset.range)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    )
  }

  if (isMobile) {
    return (
      <>
        <button type="button" onClick={() => setIsOpen(true)} className={triggerClassName}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="min-w-0 truncate">{selectedLabel}</span>
        </button>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent
            side="bottom"
            className={cn(
              'flex max-h-[calc(100dvh-8px)] flex-col overflow-hidden rounded-t-[28px] px-4 pb-4 pt-3',
              mobileSheetContentClassName,
            )}
          >
            <SheetHeader className="space-y-1 px-10">
              <SheetTitle>Select Date Range</SheetTitle>
            </SheetHeader>

            <div className="mt-3 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-1">
              {renderPresetButtons(true)}
              <div
                className={cn(
                  'mx-auto w-full max-w-[340px] rounded-lg border p-2',
                  mobileCalendarContainerClassName,
                )}
              >
                <Calendar
                  mode="range"
                  defaultMonth={draftDate?.from}
                  selected={draftDate}
                  onSelect={(nextRange, selectedDay, activeModifiers) => {
                    const resolved = mobileOnRangeSelect
                      ? mobileOnRangeSelect(draftDate, nextRange, selectedDay, activeModifiers)
                      : nextRange
                    handleDateSelect(resolved)
                  }}
                  numberOfMonths={1}
                  className={cn('mx-auto', mobileCalendarClassName)}
                  classNames={mobileCalendarClassNames}
                />
              </div>
            </div>

            <SheetFooter className="mt-3 flex-row gap-2 border-t border-border/60 pt-3">
              <Button variant="outline" className="h-11 flex-1" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button className="h-11 flex-1" onClick={handleApply} disabled={!canApply}>
                Apply
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClassName}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="min-w-0 truncate">{selectedLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
        <div className="flex">
          <div className="border-r border-border p-3">{renderPresetButtons(false)}</div>
          <div className="p-3">
            <Calendar
              mode="range"
              defaultMonth={draftDate?.from}
              selected={draftDate}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply} disabled={!canApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
