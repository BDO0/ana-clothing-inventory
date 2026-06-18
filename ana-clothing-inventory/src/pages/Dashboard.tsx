// Dashboard — premium greeting, big numbers, activity timeline + sales chart
import { useEffect, useState } from "react"
import { getAllProducts, getAllVariants, getRecentEvents } from "../engine/queries"
import { getStock } from "../engine/stock-engine"
import { getDailySales } from "../engine/analytics-engine"
import { getSyncMetrics } from "../sync/sync-monitor"
import Card from "../ui/components/Card"
import Timeline, { type TimelineEvent } from "../ui/components/Timeline"
import StatCard from "../ui/components/StatCard"
import { Skeleton } from "@/components/ui/skeleton"
import { colors } from "../ui/tokens"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Package, PackageCheck, RefreshCw, AlertTriangle } from "lucide-react"

const LOW_STOCK_THRESHOLD = 5

const greetings = ["Good morning", "Good afternoon", "Good evening"]

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return greetings[0]
  if (h < 17) return greetings[1]
  return greetings[2]
}

function Loader() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-6 w-[30%] mb-2" />
        <Skeleton className="h-3 w-[20%]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-[100px] rounded-xxl" />
        <Skeleton className="h-[100px] rounded-xxl" />
        <Skeleton className="h-[100px] rounded-xxl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[250px] rounded-xxl" />
        <Skeleton className="h-[250px] rounded-xxl" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [products, variants, events, metrics] = await Promise.all([
        getAllProducts(),
        getAllVariants(),
        getRecentEvents(10),
        getSyncMetrics(),
      ])

      const stockResults = await Promise.all(variants.map(async (v) => ({ variant: v, stock: await getStock(v.id) })))
      const totalStock = stockResults.reduce((sum, r) => sum + r.stock, 0)
      const productMap = new Map(products.map((p) => [p.id, p]))

      const lowStock = stockResults
        .filter((r) => r.stock >= 0 && r.stock < LOW_STOCK_THRESHOLD)
        .map((r) => ({ variant: r.variant, product: productMap.get(r.variant.product_id) ?? { id: "", name: "Unknown", created_at: 0 }, stock: r.stock }))
        .sort((a, b) => a.stock - b.stock)

      const chartData: { date: string; sales: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const dateStr = d.toISOString().slice(0, 10)
        const daySales = await getDailySales(dateStr)
        chartData.push({ date: d.toLocaleDateString("en", { month: "short", day: "numeric" }), sales: daySales.totalQuantity })
      }

      setData({ totalProducts: products.length, totalStock, lowStock, recentEvents: events, lowStockCount: lowStock.length, metrics, chartData })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Loader />
  if (!data) return null

  const timelineEvents: TimelineEvent[] = data.recentEvents.map((e: any) => ({
    id: e.id,
    type: e.type,
    quantity: e.quantity,
    label: e.reference ?? e.note ?? "No reference",
    timestamp: e.created_at,
  }))

  return (
    <div className="space-y-6">
      {/* Greeting + health */}
      <div>
        <h2 className="text-xl font-semibold text-text tracking-tight m-0">
          {getGreeting()}.
        </h2>
        <p className="mt-1 text-[13px] text-muted m-0">
          {data.lowStockCount === 0
            ? "Inventory healthy"
            : `${data.lowStockCount} low stock item${data.lowStockCount !== 1 ? "s" : ""}`}
          <span className={[
            "ml-2",
            !data.metrics.isOnline ? "text-error" : !data.metrics.isConfigured ? "text-muted" : "text-success"
          ].join(" ")}>
            · {!data.metrics.isOnline ? "Offline" : !data.metrics.isConfigured ? "Local only" : "Synced"}
          </span>
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Products"
          value={data.totalProducts}
          icon={Package}
          accent="accent"
        />
        <StatCard
          label="Total Stock Units"
          value={data.totalStock}
          icon={PackageCheck}
          accent="success"
        />
        <StatCard
          label="Pending Sync"
          value={data.metrics.retryQueueSize}
          icon={RefreshCw}
          accent={data.metrics.retryQueueSize > 0 ? "warning" : "muted"}
          description={data.metrics.isOnline ? "Database online" : "Database offline"}
          warn={data.metrics.retryQueueSize > 0}
        />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card header={`Recent Activity (${data.recentEvents.length})`}>
          <Timeline events={timelineEvents} />
        </Card>

        <Card header="7-Day Sales">
          {data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.chartData} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.accent} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: colors.muted }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: colors.muted }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${colors.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12, background: colors.surface }} />
                <Area type="monotone" dataKey="sales" stroke={colors.accent} strokeWidth={2} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-5 text-muted text-[13px]">No sales data yet</div>
          )}
        </Card>
      </div>

      {/* Low stock section */}
      {data.lowStock.length > 0 && (
        <Card header={`Critical Low Stock Warning (${data.lowStockCount})`}>
          <div className="flex flex-col gap-2.5">
            {data.lowStock.slice(0, 5).map((item: any) => (
              <div key={item.variant.id} className="flex justify-between items-center text-[13px] text-text py-2 px-3.5 bg-[#C53030]/[0.02] border border-[#C53030]/[0.08] rounded-xl hover:bg-[#C53030]/[0.04] transition-colors">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={14} className="text-error flex-shrink-0" />
                  <span className="font-semibold text-text">{item.product.name}</span>
                  <span className="text-muted text-xs">({item.variant.size ?? "N/A"} / {item.variant.color ?? "N/A"})</span>
                </div>
                <span className="text-error font-bold bg-[#C53030]/[0.08] px-2.5 py-0.5 rounded-full text-xs">
                  {item.stock} units
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}