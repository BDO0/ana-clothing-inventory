// Reports — structured business reports using shadcn Card + badges
import { useEffect, useState } from "react"
import {
  generateInventoryReport,
  generateSalesReport,
  generateBusinessOverview,
  type InventoryReport,
  type SalesReport,
  type BusinessOverview,
} from "../engine/report-engine"
import Card from "../ui/components/Card"
import StatCard from "../ui/components/StatCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, PackageCheck, AlertTriangle, AlertCircle, ShoppingBag, TrendingUp, Download } from "lucide-react"

type ReportTab = "inventory" | "sales" | "overview"

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>("overview")
  const [overview, setOverview] = useState<BusinessOverview | null>(null)
  const [inventory, setInventory] = useState<InventoryReport | null>(null)
  const [sales, setSales] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    generateBusinessOverview().then((data) => {
      setOverview(data)
      setLoading(false)
    })
  }, [])

  async function loadInventory() {
    setLoading(true)
    const data = await generateInventoryReport()
    setInventory(data)
    setTab("inventory")
    setLoading(false)
  }

  async function loadSales() {
    setLoading(true)
    const end = new Date().toISOString().slice(0, 10)
    const start = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
    const data = await generateSalesReport(start, end)
    setSales(data)
    setTab("sales")
    setLoading(false)
  }

  function downloadCSV(filename: string, rows: string[][]) {
    const csvContent = rows.map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function exportInventoryCSV() {
    if (!inventory) return
    const rows = [["Product Name", "Size", "Color", "SKU", "Stock"]]
    for (const item of inventory.items) {
      for (const v of item.variants) {
        rows.push([
          `"${item.productName.replace(/"/g, '""')}"`,
          `"${(v.size || "N/A").replace(/"/g, '""')}"`,
          `"${(v.color || "N/A").replace(/"/g, '""')}"`,
          `"${(v.sku || "N/A").replace(/"/g, '""')}"`,
          v.stock.toString()
        ])
      }
    }
    downloadCSV(`inventory_report_${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  function exportSalesCSV() {
    if (!sales) return
    const rows = [["Date", "Total Quantity", "Transactions"]]
    for (const day of sales.days) {
      rows.push([day.date, day.totalQuantity.toString(), day.transactions.toString()])
    }
    downloadCSV(`sales_report_${sales.startDate}_to_${sales.endDate}.csv`, rows)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text tracking-tight m-0">Reports</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === "overview" ? "default" : "outline"} size="sm" onClick={() => setTab("overview")}>
          Business Overview
        </Button>
        <Button variant={tab === "inventory" ? "default" : "outline"} size="sm" onClick={loadInventory}>
          Inventory Report
        </Button>
        <Button variant={tab === "sales" ? "default" : "outline"} size="sm" onClick={loadSales}>
          Sales Report (30d)
        </Button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-[100px] rounded-xxl" />
          ))}
        </div>
      )}

      {tab === "overview" && overview && !loading && (
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-lg font-semibold text-text m-0">Business Overview</h3>
              <p className="text-muted text-[12px] mt-0.5">
                Generated: {new Date(overview.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Products" value={overview.products.total} icon={Package} accent="accent" />
            <StatCard label="Total Stock" value={overview.stock.total} icon={PackageCheck} accent="success" />
            <StatCard label="Low Stock Items" value={overview.stock.lowStock} icon={AlertTriangle} accent="warning" warn={overview.stock.lowStock > 0} description={overview.stock.lowStock > 0 ? "Items need replenishment" : "All levels stable"} />
            <StatCard label="Out of Stock" value={overview.stock.outOfStock} icon={AlertCircle} accent="error" warn={overview.stock.outOfStock > 0} description={overview.stock.outOfStock > 0 ? "Critical shortage" : "All active"} />
            <StatCard label="Recent Sales (50)" value={overview.sales.recentSales} icon={ShoppingBag} accent="accent" />
            <StatCard label="Total Sales Qty" value={overview.sales.totalEvents} icon={TrendingUp} accent="success" />
          </div>
        </div>
      )}

      {tab === "inventory" && inventory && !loading && (
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-text m-0 mb-1">Inventory Report</h3>
              <p className="text-muted text-[13px] m-0">
                {inventory.totalProducts} products, {inventory.totalVariants} variants, {inventory.totalStock} total units
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={exportInventoryCSV}>
              <Download size={14} className="mr-2" /> Export CSV
            </Button>
          </div>

          {inventory.items.map((item) => (
            <div key={item.productId} className="mb-3 p-3 bg-bg rounded-md border border-border">
              <div className="flex justify-between font-semibold text-sm mb-2 text-text">
                <span>{item.productName}</span>
                <span>{item.totalStock} units</span>
              </div>
              {item.variants.map((v) => (
                <div key={v.variantId} className="flex justify-between text-[13px] py-1 px-2 text-muted">
                  <span>{v.size ?? "N/A"} / {v.color ?? "N/A"} ({v.sku ?? "no SKU"})</span>
                  <span className={`font-semibold ${v.stock <= 5 ? "text-error" : "text-success"}`}>{v.stock}</span>
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}

      {tab === "sales" && sales && !loading && (
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-text m-0 mb-1">Sales Report</h3>
              <p className="text-muted text-[13px] m-0">
                {sales.startDate} → {sales.endDate} | Total sales: {sales.totalSales} units
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={exportSalesCSV}>
              <Download size={14} className="mr-2" /> Export CSV
            </Button>
          </div>

          <h4 className="text-sm font-semibold mb-2 text-text">Top Products (last 30 days)</h4>
          {sales.topProducts.map((p, i) => (
            <div key={i} className="flex justify-between py-1.5 text-[13px] border-b border-border text-text">
              <span>{p.name}</span>
              <span className="font-semibold">{p.quantity} units sold</span>
            </div>
          ))}
          <h4 className="text-sm font-semibold mt-4 mb-2 text-text">Daily Breakdown</h4>
          {sales.days.length === 0 && <p className="text-muted text-[13px]">No sales in this period.</p>}
          {sales.days.map((day) => (
            <div key={day.date} className="flex justify-between py-1 text-[13px] text-muted border-b border-border">
              <span>{day.date}</span>
              <span>{day.totalQuantity} units ({day.transactions} transactions)</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}