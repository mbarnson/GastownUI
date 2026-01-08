import { useState, useMemo, useId } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import {
  Gem,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  CircleDot,
  Clock,
  CheckCircle2,
  Bug,
  Lightbulb,
  ListTodo,
  Atom,
} from 'lucide-react'
import type { Bead } from '../../hooks/useGastown'
import { focusRingClasses } from '../../lib/a11y'

interface BeadsBrowserProps {
  beads: Bead[]
  rigId: string
}

const statusConfig = {
  open: {
    icon: CircleDot,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    label: 'Open',
  },
  in_progress: {
    icon: Clock,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    label: 'In Progress',
  },
  closed: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    label: 'Closed',
  },
}

const typeConfig: Record<string, { icon: typeof Bug; color: string }> = {
  bug: { icon: Bug, color: 'text-red-400' },
  feature: { icon: Lightbulb, color: 'text-purple-400' },
  task: { icon: ListTodo, color: 'text-cyan-400' },
  molecule: { icon: Atom, color: 'text-orange-400' },
}

const priorityColors: Record<string, string> = {
  P0: 'text-red-400 bg-red-500/20',
  P1: 'text-amber-400 bg-amber-400/20',
  P2: 'text-yellow-300 bg-yellow-400/20',
  P3: 'text-blue-400 bg-blue-400/20',
  P4: 'text-slate-300 bg-slate-400/20', // AA compliant
}

export default function BeadsBrowser({ beads, rigId: _rigId }: BeadsBrowserProps) {
  const searchId = useId()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter beads by status
  const filteredBeads = useMemo(() => {
    if (statusFilter === 'all') return beads
    return beads.filter((b) => b.status === statusFilter)
  }, [beads, statusFilter])

  const columns = useMemo<ColumnDef<Bead>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-cyan-400 text-sm">
            {row.original.id}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Pri
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-3 h-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const priority = row.original.priority
          return (
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                priorityColors[priority] || 'text-gray-400 bg-gray-400/20'
              }`}
            >
              {priority}
            </span>
          )
        },
        size: 60,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
          const type = row.original.type
          const config = typeConfig[type] || { icon: Gem, color: 'text-gray-400' }
          const TypeIcon = config.icon
          return (
            <div className="flex items-center gap-1.5">
              <TypeIcon className={`w-3.5 h-3.5 ${config.color}`} />
              <span className="text-sm text-gray-300 capitalize">{type}</span>
            </div>
          )
        },
        size: 100,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status
          const config = statusConfig[status]
          const StatusIcon = config.icon
          return (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${config.bg} w-fit`}>
              <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
              <span className={`text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
            </div>
          )
        },
        size: 120,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Title
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-3 h-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-white line-clamp-1" title={row.original.title}>
            {row.original.title}
          </span>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredBeads,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const statusCounts = useMemo(() => {
    return {
      all: beads.length,
      open: beads.filter((b) => b.status === 'open').length,
      in_progress: beads.filter((b) => b.status === 'in_progress').length,
      closed: beads.filter((b) => b.status === 'closed').length,
    }
  }, [beads])

  return (
    <section
      className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5 lg:col-span-2"
      aria-labelledby="beads-browser-heading"
    >
      <div className="flex items-center gap-3 mb-4">
        <Gem className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h2 id="beads-browser-heading" className="text-lg font-semibold text-white">
          Beads Browser
        </h2>
        <span className="ml-auto text-sm text-slate-300" role="status" aria-live="polite">
          {filteredBeads.length} of {beads.length} beads
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4" role="search">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <label htmlFor={searchId} className="sr-only">
            Search beads by ID, title, or type
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            placeholder="Search beads..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-500 transition-colors ${focusRingClasses}`}
            aria-describedby="search-results-count"
          />
        </div>

        {/* Status filter */}
        <div
          className="flex items-center gap-1 bg-slate-700 rounded-lg p-1"
          role="radiogroup"
          aria-label="Filter by status"
        >
          <Filter className="w-4 h-4 text-slate-400 ml-2" aria-hidden="true" />
          {(['all', 'open', 'in_progress', 'closed'] as const).map((status) => {
            const displayName = status === 'all' ? 'All' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                role="radio"
                aria-checked={statusFilter === status}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${focusRingClasses}
                  ${statusFilter === status
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-200 hover:bg-slate-600'
                  }
                `}
              >
                {displayName}
                <span className="ml-1 text-xs opacity-80" aria-label={`${statusCounts[status]} ${displayName.toLowerCase()} beads`}>
                  ({statusCounts[status]})
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      {filteredBeads.length === 0 ? (
        <div className="text-center py-12 text-slate-400" role="status">
          <Gem className="w-10 h-10 mx-auto mb-2 opacity-50" aria-hidden="true" />
          <p>No beads found</p>
          {globalFilter && (
            <p className="text-sm mt-1 text-slate-500">Try adjusting your search</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-600">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left py-3 px-3 text-sm font-medium text-gray-400"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3 px-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
