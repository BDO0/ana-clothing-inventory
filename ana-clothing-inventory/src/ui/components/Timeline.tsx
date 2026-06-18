// Timeline — event timeline with colored dots
import { cn } from "@/lib/utils"

export interface TimelineEvent {
  id: string
  type: string
  quantity: number
  label: string
  timestamp: number
}

interface TimelineProps {
  events: TimelineEvent[]
  className?: string
}

const eventColors: Record<string, string> = {
  STOCK_IN: "bg-event-stock-in",
  SALE: "bg-event-sale",
  RETURN: "bg-event-return",
  ADJUSTMENT: "bg-event-adjustment",
}

const eventLabels: Record<string, string> = {
  STOCK_IN: "STOCK_IN",
  SALE: "SALE",
  RETURN: "RETURN",
  ADJUSTMENT: "ADJ",
}

export default function Timeline({ events, className }: TimelineProps) {
  if (events.length === 0) {
    return <div className="text-center py-3 text-muted text-[13px]">No events</div>
  }

  return (
    <div className={cn("space-y-0", className)}>
      {events.map((event) => (
        <div key={event.id} className="flex gap-3 pb-2">
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
              eventColors[event.type] || "bg-muted/50"
            )} />
            <div className="w-px flex-1 bg-border min-h-[20px]" />
          </div>
          <div className="flex-1 pb-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "text-[11px] font-semibold uppercase tracking-wider",
                eventColors[event.type] ? "text-text" : "text-muted"
              )}>
                {eventLabels[event.type] || event.type}
              </span>
              <span className="text-xs font-bold text-text">×{event.quantity}</span>
            </div>
            <div className="text-[12px] text-muted truncate">{event.label}</div>
            <div className="text-[11px] text-muted/80">
              {new Date(event.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}