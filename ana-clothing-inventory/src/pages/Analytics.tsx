// Analytics — KPIs, event trends (Recharts), and product performance
import { useEffect, useState } from "react"
import {
  getStockSummary,
  getTopProducts,
  getEventTrends,
  type StockSummary,
  type ProductPerformance,
  type TrendData,
} from "../engine/analytics-engine"
import Card from "../ui/components/Card"
import StatCard from "../ui/components/StatCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { colors } from "../ui/tokens"
import { Package, Layers, PackageCheck, AlertTriangle, AlertCircle, Eye } from "lucide-react"

type TrendRange = "7d" | "30d"

const chartColors = { stockIn: colors.success, sale: colors.error }

function Loader() {
  return (
    <div>
      <Skeleton className="h-6 w-[120px] mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[1,2,3,4,5,6].map(i => (
          <Skeleton key={i} className="h-[100px] rounded-xxl" />
        ))}
      </div>
      <Skeleton className="h-[260px] rounded-xxl mb-4" />
      <Skeleton className="h-[200px] rounded-xxl" />
    </div>
  )
}

export default function Analytics() {
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null)
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([])
  const [trends, setTrends] = useState<TrendData[]>([])
  const [trendRange, setTrendRange] = useState<TrendRange>("7d")
  const [loading, setLoading] = useState(true)
  const [trendsLoading, setTrendsLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const [summary, products, trendsData] = await Promise.all([
        getStockSummary(),
        getTopProducts(10),
        getEventTrends("7d"),
      ])
      setStockSummary(summary)
      setTopProducts(products)
      setTrends(trendsData)
      setLoading(false)
    }
    load()
  }, [])

  async function changeTrendRange(range: TrendRange) {
    setTrendRange(range)
    setTrendsLoading(true)
    const data = await getEventTrends(range)
    setTrends(data)
    setTrendsLoading(false)
  }

  if (loading) return <Loader />

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text tracking-tight m-0">Analytics</h2>

      {/* KPI Grid */}
      {stockSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Products"
            value={stockSummary.totalProducts}
            icon={Package}
            accent="accent"
          />
          <StatCard
            label="Total Variants"
            value={stockSummary.totalVariants}
            icon={Layers}
            accent="accent"
          />
          <StatCard
            label="Total Stock Units"
            value={stockSummary.totalStock}
            icon={PackageCheck}
            accent="success"
          />
          <StatCard
            label="Low Stock Items"
            value={stockSummary.lowStockItems}
            icon={AlertTriangle}
            accent={stockSummary.lowStockItems > 0 ? "warning" : "muted"}
            warn={stockSummary.lowStockItems > 0}
            description={stockSummary.lowStockItems > 0 ? "Items need reordering" : "Stock level is stable"}
          />
          <StatCard
            label="Out of Stock Items"
            value={stockSummary.outOfStockItems}
            icon={AlertCircle}
            accent={stockSummary.outOfStockItems > 0 ? "error" : "muted"}
            warn={stockSummary.outOfStockItems > 0}
            description={stockSummary.outOfStockItems > 0 ? "Replenish immediately" : "All variants active"}
          />
          <StatCard
            label="Low Stock Threshold"
            value={stockSummary.lowStockThreshold}
            icon={Eye}
            accent="muted"
            description="Alert limit trigger value"
          />
        </div>
      )}

      {/* Event Trends — Recharts Bar Chart */}
      <Card>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-text m-0">Inventory Flow — STOCK_IN vs SALE</h3>
          <div className="flex gap-1">
            <Button variant={trendRange === "7d" ? "default" : "outline"} size="sm" onClick={() => changeTrendRange("7d")}>
              7 days
            </Button>
            <Button variant={trendRange === "30d" ? "default" : "outline"} size="sm" onClick={() => changeTrendRange("30d")}>
              30 days
            </Button>
          </div>
        </div>

        {trendsLoading ? (
          <Skeleton className="h-[200px] w-full rounded-md" />
        ) : trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trends} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: colors.muted }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: colors.muted }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 12, background: colors.surface }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="stockIn" name="Stock In" fill={chartColors.stockIn} radius={[4, 4, 0, 0]} />
              <Bar dataKey="sale" name="Sales" fill={chartColors.sale} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-5 text-muted text-[13px]">No data for this period</div>
        )}
      </Card>

      {/* Top Products */}
      <div className="mt-4">
        <Card>
          <h3 className="text-lg font-semibold text-text m-0 mb-4">Top 10 Products by Sales Volume</h3>
          {topProducts.length === 0 && <p className="text-muted text-[13px]">No sales data yet.</p>}
          {topProducts.map((product, i) => (
            <div key={product.productId} className="flex justify-between items-center py-2 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="font-semibold text-sm text-text">{product.productName}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm text-text">{product.totalSalesQuantity} units</div>
                <div className="text-xs text-muted">{product.totalSalesEvents} transactions</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}