import { useState, useEffect, useMemo } from "react"
import { db } from "../db/database"
import { getAllProducts, getAllVariants } from "../engine/queries"
import { getStock } from "../engine/stock-engine"
import Card from "../ui/components/Card"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Ledger() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [ledgerData, setLedgerData] = useState<any[]>([])
  
  // Date utils
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = currentDate.toLocaleString('default', { month: 'long' })
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  async function loadData() {
    setLoading(true)
    const products = await getAllProducts()
    const variants = await getAllVariants()
    
    // Create a map of product names
    const pMap = new Map(products.map(p => [p.id, p.name]))
    
    // Get all SALE events for this month
    const startOfMonth = new Date(year, month, 1).getTime()
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
    
    const sales = await db.inventory_events
      .where("type").equals("SALE")
      .and(e => e.created_at >= startOfMonth && e.created_at <= endOfMonth)
      .toArray()
      
    // Group sales by variant and day
    const salesByVariant: Record<string, Record<number, number>> = {}
    for (const sale of sales) {
      const date = new Date(sale.created_at)
      const day = date.getDate()
      
      if (!salesByVariant[sale.variant_id]) salesByVariant[sale.variant_id] = {}
      if (!salesByVariant[sale.variant_id][day]) salesByVariant[sale.variant_id][day] = 0
      
      salesByVariant[sale.variant_id][day] += sale.quantity
    }
    
    // Build ledger rows
    const rows = []
    for (const v of variants) {
      const pName = pMap.get(v.product_id) || "Unknown"
      const vDetails = `${v.size || "N/A"} / ${v.color || "N/A"}`
      const fullName = `${pName} — ${vDetails}`
      
      const vSales = salesByVariant[v.id] || {}
      let totalSales = 0
      const dailySales: Record<number, number> = {}
      
      for (let d = 1; d <= daysInMonth; d++) {
        const qty = vSales[d] || 0
        dailySales[d] = qty
        totalSales += qty
      }
      
      const currentStock = await getStock(v.id)
      
      rows.push({
        id: v.id,
        pName,
        vDetails,
        fullName,
        sku: v.sku || "No SKU",
        currentStock,
        dailySales,
        totalSales
      })
    }
    
    // Sort alphabetically by product name
    rows.sort((a, b) => a.fullName.localeCompare(b.fullName))
    
    setLedgerData(rows)
    setLoading(false)
  }
  
  useEffect(() => {
    loadData()
  }, [month, year])
  
  // Handlers for month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const today = () => setCurrentDate(new Date())
  
  // Calculate bottom totals
  const dailyTotals = useMemo(() => {
    const totals: Record<number, number> = {}
    days.forEach(d => totals[d] = 0)
    let grandTotal = 0
    
    ledgerData.forEach(row => {
      days.forEach(d => {
        totals[d] += row.dailySales[d]
      })
      grandTotal += row.totalSales
    })
    
    return { daily: totals, grand: grandTotal }
  }, [ledgerData, days])

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-text tracking-tight m-0">Monthly Ledger</h2>
          <p className="mt-1 text-[13px] text-muted m-0">Matrix tracking for daily sales and current stock.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-surface border border-border p-1 rounded-md shadow-sm">
          <Button variant="ghost" size="sm" onClick={prevMonth} className="h-7 px-2"><ChevronLeft size={16} /></Button>
          <div 
            className="flex items-center gap-2 px-2 text-sm font-medium w-[130px] justify-center cursor-pointer hover:text-accent transition-colors"
            onClick={today}
            title="Go to current month"
          >
            <Calendar size={14} className="text-muted" />
            {monthName} {year}
          </div>
          <Button variant="ghost" size="sm" onClick={nextMonth} className="h-7 px-2"><ChevronRight size={16} /></Button>
        </div>
      </div>
      
      {/* Table */}
      <Card className="!p-0 overflow-hidden flex flex-col flex-1 shadow-sm border border-border/60">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max text-[13px]">
            <thead className="sticky top-0 z-20 bg-surface shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
              <tr>
                <th className="p-3 border-b border-r border-border font-semibold text-text min-w-[160px] max-w-[160px] md:min-w-[240px] md:max-w-[240px] sticky left-0 z-30 bg-surface shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Product Variant</th>
                <th className="p-3 border-b border-r border-border font-semibold text-text min-w-[70px] md:min-w-[80px] md:sticky md:left-[240px] z-30 bg-surface text-center">Stock</th>
                {days.map(d => (
                  <th key={d} className="p-2 border-b border-border font-medium text-muted text-center min-w-[36px] bg-black/[0.01]">
                    {d}
                  </th>
                ))}
                <th className="p-3 border-b border-l border-border font-semibold text-accent min-w-[70px] md:min-w-[80px] md:sticky md:right-0 z-20 bg-surface shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr><td colSpan={days.length + 3} className="p-8 text-center text-muted">Loading ledger data...</td></tr>
              ) : ledgerData.length === 0 ? (
                 <tr><td colSpan={days.length + 3} className="p-8 text-center text-muted">No products found.</td></tr>
              ) : (
                <>
                  {ledgerData.map((row) => (
                    <tr key={row.id} className="hover:bg-black/[0.02] border-b border-border last:border-0 group transition-colors">
                      <td className="p-2.5 border-r border-border min-w-[160px] max-w-[160px] md:min-w-[240px] md:max-w-[240px] sticky left-0 z-10 bg-surface group-hover:bg-[#FDFCFB] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.02)] align-top">
                        <div className="text-[11px] text-muted leading-tight mb-0.5 line-clamp-2 whitespace-normal break-words" title={row.pName}>{row.pName}</div>
                        <div className="font-semibold text-[13px] text-text truncate w-full" title={row.vDetails}>{row.vDetails}</div>
                        <div className="text-[9px] text-muted/60 tracking-wider truncate w-full mt-0.5 font-mono" title={row.sku}>{row.sku}</div>
                      </td>
                      <td className="p-2.5 border-r border-border min-w-[70px] md:min-w-[80px] md:sticky md:left-[240px] z-10 bg-surface group-hover:bg-[#FDFCFB] text-center">
                        <span className={`font-semibold ${row.currentStock <= 5 ? "text-error" : "text-success"}`}>
                          {row.currentStock}
                        </span>
                      </td>
                      {days.map(d => {
                        const val = row.dailySales[d]
                        return (
                          <td key={d} className="p-2 text-center border-r border-border/30 last:border-r-0">
                            {val > 0 ? <span className="font-medium text-text">{val}</span> : <span className="text-muted/20">-</span>}
                          </td>
                        )
                      })}
                      <td className="p-2.5 border-l border-border min-w-[70px] md:min-w-[80px] md:sticky md:right-0 z-10 bg-surface group-hover:bg-[#FDFCFB] text-center font-bold text-accent bg-accent/[0.01]">
                        {row.totalSales > 0 ? row.totalSales : <span className="text-muted/20">-</span>}
                      </td>
                    </tr>
                  ))}
                  {/* Bottom Totals Row */}
                  <tr className="sticky bottom-0 z-20 bg-surface shadow-[0_-2px_5px_-2px_rgba(0,0,0,0.05)]">
                    <td className="p-3 border-t-2 border-r border-border min-w-[160px] max-w-[160px] md:min-w-[240px] md:max-w-[240px] sticky left-0 z-30 bg-surface font-semibold text-text shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Daily Totals</td>
                    <td className="p-3 border-t-2 border-r border-border min-w-[70px] md:min-w-[80px] md:sticky md:left-[240px] z-30 bg-surface text-center text-muted text-xs font-medium">All</td>
                    {days.map(d => {
                       const val = dailyTotals.daily[d]
                       return (
                         <td key={d} className="p-2 text-center border-t-2 border-r border-border/30 last:border-r-0 font-semibold text-[12px] bg-black/[0.01]">
                           {val > 0 ? <span className="text-accent">{val}</span> : <span className="text-muted/30">-</span>}
                         </td>
                       )
                    })}
                    <td className="p-3 border-t-2 border-l border-border min-w-[70px] md:min-w-[80px] md:sticky md:right-0 z-20 bg-accent text-white text-center font-bold shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {dailyTotals.grand}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
