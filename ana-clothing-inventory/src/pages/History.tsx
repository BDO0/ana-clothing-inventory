// History — event timeline with filters and global recent feed
import { useEffect, useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table"
import { getAllProducts, getVariantsByProduct, getAllVariants, getRecentEvents } from "../engine/queries"
import { getEventHistory } from "../engine/stock-engine"
import { db } from "../db/database"
import type { Product, Variant, InventoryEvent } from "../db/models"
import Card from "../ui/components/Card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

export default function History() {
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [pId, setPId] = useState("")
  const [vId, setVId] = useState("")
  const [events, setEvents] = useState<InventoryEvent[]>([])
  const [filterType, setFilterType] = useState("")
  const [loading, setLoading] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const [productMap, setProductMap] = useState<Map<string, Product>>(new Map())
  const [variantMap, setVariantMap] = useState<Map<string, Variant>>(new Map())

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true)
      const [allProducts, allVariants] = await Promise.all([
        getAllProducts(),
        getAllVariants(),
      ])
      setProducts(allProducts)
      setProductMap(new Map(allProducts.map((p) => [p.id, p])))
      setVariantMap(new Map(allVariants.map((v) => [v.id, v])))
      setLoading(false)
    }
    init()
  }, [])

  // Product selection handler
  async function onProductChange(id: string) {
    setPId(id)
    setVId("")
    if (id) {
      const vars = await getVariantsByProduct(id)
      setVariants(vars)
    } else {
      setVariants([])
    }
  }

  // Filter & query logic
  async function handleFilter() {
    setLoading(true)
    let filtered: InventoryEvent[] = []

    try {
      if (vId) {
        // Specific variant history
        filtered = await getEventHistory(vId)
      } else if (pId) {
        // All variants of selected product
        const variantIds = variants.map((v) => v.id)
        if (variantIds.length > 0) {
          filtered = await db.inventory_events
            .where("variant_id")
            .anyOf(variantIds)
            .toArray()
        }
      } else {
        // Global feed (last 100 events)
        filtered = await getRecentEvents(100)
      }

      // Filter by transaction type if selected
      if (filterType) {
        filtered = filtered.filter((e) => e.type === filterType)
      }

      // Order newest first
      filtered.sort((a, b) => b.created_at - a.created_at)
      setEvents(filtered)
    } catch (err) {
      console.error("Failed to load history events", err)
    } finally {
      setLoading(false)
    }
  }

  // Trigger query whenever selection changes
  useEffect(() => {
    handleFilter()
  }, [pId, vId, filterType, variants])

  const typeStyles: Record<string, string> = {
    STOCK_IN: "bg-success/10 text-success",
    SALE: "bg-error/10 text-error",
    RETURN: "bg-warning/10 text-warning",
    ADJUSTMENT: "bg-[#6B6661]/10 text-[#6B6661]",
  }

  const columns = useMemo<ColumnDef<InventoryEvent>[]>(() => [
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ getValue }) => {
        const v = getValue<number>()
        const d = new Date(v)
        return (
          <div className="text-xs text-text">
            <div>{d.toLocaleDateString()}</div>
            <div className="text-[10px] text-muted mt-0.5">
              {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ getValue }) => {
        const type = getValue<string>()
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${typeStyles[type] || "bg-bg text-text"}`}>
            {type}
          </span>
        )
      },
    },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => {
        const qty = row.original.quantity
        const type = row.original.type
        const prefix = (type === "STOCK_IN" || type === "RETURN") ? "+" : "-"
        const colorClass = (type === "STOCK_IN" || type === "RETURN") ? "text-success" : "text-error"
        return <span className={`font-bold text-xs ${colorClass}`}>{prefix}{qty}</span>
      },
    },
    {
      id: "variant",
      header: "Product / Variant",
      cell: ({ row }) => {
        const v = variantMap.get(row.original.variant_id)
        const p = v ? productMap.get(v.product_id) : undefined
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-text">{p?.name ?? "Unknown Product"}</span>
            <span className="text-[10px] text-muted mt-0.5">
              Size: {v?.size ?? "N/A"} · Color: {v?.color ?? "N/A"}
              {v?.sku && ` · SKU: ${v.sku}`}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "reference",
      header: "Reference / Note",
      cell: ({ row }) => {
        const ref = row.original.reference
        const note = row.original.note
        return (
          <div className="text-xs">
            <div className="text-text font-medium">{ref || "—"}</div>
            {note && <div className="text-[10px] text-muted italic mt-0.5">{note}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: "synced",
      header: "Sync Status",
      cell: ({ getValue }) => {
        const synced = getValue<boolean>()
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            synced ? "bg-success/8 text-success" : "bg-warning/8 text-warning"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${synced ? "bg-success" : "bg-warning"}`} />
            {synced ? "Synced" : "Pending"}
          </span>
        )
      },
    },
  ], [variantMap, productMap])

  const table = useReactTable({
    data: events,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-text tracking-tight m-0">History</h2>
        <p className="mt-1 text-[13px] text-muted m-0">Event audit trail and sync status</p>
      </div>

      <Card className="!p-0">
        <div className="flex gap-2.5 p-3 flex-wrap items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block mb-1.5 font-semibold text-[11px] text-muted uppercase tracking-wider">Product</label>
            <select value={pId} onChange={(e) => onProductChange(e.target.value)} className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent">
              <option value="">All Products</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block mb-1.5 font-semibold text-[11px] text-muted uppercase tracking-wider">Variant</label>
            <select value={vId} onChange={(e) => setVId(e.target.value)} disabled={!pId} className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50">
              <option value="">All Variants</option>
              {variants.map((v) => <option key={v.id} value={v.id}>{v.size ?? "N/A"} / {v.color ?? "N/A"}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block mb-1.5 font-semibold text-[11px] text-muted uppercase tracking-wider">Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent">
              <option value="">All Types</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="SALE">Sale</option>
              <option value="RETURN">Return</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="mt-4">
        {loading && (
          <Card>
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </Card>
        )}
        {!loading && events.length === 0 && (
          <Card>
            <div className="text-center py-6 text-muted text-[13px]">
              No events match your criteria.
            </div>
          </Card>
        )}
        {!loading && events.length > 0 && (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id} onClick={header.column.getToggleSortingHandler()} className="cursor-pointer select-none font-semibold text-xs text-muted">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map(row => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}