"use client";

import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Search,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Sortable column header — click toggles asc → desc, with arrow affordances. */
export function SortableHeader<TData>({
  column,
  label,
}: {
  column: Column<TData, unknown>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="flex items-center gap-1.5 font-semibold text-on-surface transition-colors hover:text-accent"
    >
      {label}
      <span className="flex flex-col leading-none">
        <ArrowUp
          className={cn(
            "-mb-0.5 size-3",
            sorted === "asc" ? "text-accent opacity-100" : "opacity-30",
          )}
        />
        <ArrowDown
          className={cn(
            "size-3",
            sorted === "desc" ? "text-accent opacity-100" : "opacity-30",
          )}
        />
      </span>
    </button>
  );
}

/** Header with a dropdown to filter by discrete values (+ optional sort). */
export function FilterHeader<TData>({
  column,
  label,
  options,
  sortable = false,
}: {
  column: Column<TData, unknown>;
  label: string;
  options: { value: string; label: string }[];
  sortable?: boolean;
}) {
  const applied = (column.getFilterValue() as string[] | undefined) ?? [];
  // Local mirror of the applied filter. Updated synchronously on click so the
  // checkmarks repaint immediately (the portaled menu content does not always
  // re-render from the parent table's state change while held open). Re-synced
  // from the column whenever the menu opens.
  const [current, setCurrent] = useState<string[]>(applied);

  function commit(next: string[]) {
    setCurrent(next);
    column.setFilterValue(next.length ? next : undefined);
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          setCurrent((column.getFilterValue() as string[] | undefined) ?? []);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 font-semibold text-on-surface transition-colors hover:text-accent"
        >
          {label}
          <ChevronDown
            className={cn(
              "size-3.5",
              applied.length ? "text-accent" : "opacity-50",
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {sortable && (
          <>
            <DropdownMenuLabel className="text-xs text-on-surface-variant">
              Sort
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
              <ArrowUp /> Ascending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
              <ArrowDown /> Descending
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-on-surface-variant">
              Filter
            </DropdownMenuLabel>
          </>
        )}
        {/* Plain items with an explicitly-rendered check: the indicator is
            driven straight off `current` on every render, so it tracks the
            live filter even while the menu is held open (Radix's controlled
            CheckboxItem indicator does not repaint reliably in that case).
            Multi-select; "All" clears. preventDefault keeps the menu open. */}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            commit([]);
          }}
        >
          <Check
            className={cn(
              "size-4 text-accent",
              current.length === 0 ? "opacity-100" : "opacity-0",
            )}
          />
          All
        </DropdownMenuItem>
        {options.map((o) => {
          const active = current.includes(o.value);
          return (
            <DropdownMenuItem
              key={o.value}
              onSelect={(e) => {
                e.preventDefault();
                commit(
                  active
                    ? current.filter((v) => v !== o.value)
                    : [...current, o.value],
                );
              }}
            >
              <Check
                className={cn(
                  "size-4 text-accent",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              {o.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** filterFn: keep rows whose cell value is in the selected set (multi-select). */
export const includesValue: FilterFn<unknown> = (row, columnId, value) => {
  const set = value as string[] | undefined;
  if (!set?.length) return true;
  return set.includes(String(row.getValue(columnId)));
};

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  getRowId?: (row: TData, index: number) => string;
  enableRowSelection?: boolean;
  selectionToolbar?: (
    selectedRows: TData[],
    clearSelection: () => void,
  ) => ReactNode;
  noun?: string;
  /** Plural form for the footer/empty copy (defaults to `${noun}s`). */
  nounPlural?: string;
  searchPlaceholder?: string;
  globalFilterFn?: FilterFn<TData>;
  /** Human labels for the column-visibility menu, keyed by column id. */
  columnLabels?: Record<string, string>;
  /** Fixed pixel widths per column id — keeps columns stable across filters. */
  columnWidths?: Record<string, number>;
  initialVisibility?: VisibilityState;
  /**
   * Persist the user's column choices to localStorage under this key, and
   * restore them on mount (merged over initialVisibility).
   */
  storageKey?: string;
  /** Extra filter controls rendered left of the Columns button. */
  toolbar?: ReactNode;
  /** Primary action(s) rendered at the far right of the toolbar (e.g. Add). */
  rightActions?: ReactNode;
  emptyState?: ReactNode;
};

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  enableRowSelection = false,
  selectionToolbar,
  noun = "record",
  nounPlural,
  searchPlaceholder = "Search…",
  globalFilterFn,
  columnLabels = {},
  columnWidths = {},
  initialVisibility = {},
  storageKey,
  toolbar,
  rightActions,
  emptyState,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(initialVisibility);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const visibilityStorageKey = storageKey ? `dt:${storageKey}:columns` : null;

  // Restore the user's saved column choices after mount (SSR-safe).
  useEffect(() => {
    if (!visibilityStorageKey) return;
    try {
      const raw = localStorage.getItem(visibilityStorageKey);
      if (raw) {
        const saved = JSON.parse(raw) as VisibilityState;
        setColumnVisibility((prev) => ({ ...prev, ...saved }));
      }
    } catch {
      // Corrupt/unavailable storage — fall back to defaults silently.
    }
  }, [visibilityStorageKey]);

  const onVisibilityChange: typeof setColumnVisibility = (updater) => {
    setColumnVisibility((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (s: VisibilityState) => VisibilityState)(prev)
          : updater;
      if (visibilityStorageKey) {
        try {
          localStorage.setItem(visibilityStorageKey, JSON.stringify(next));
        } catch {
          // Storage full/blocked — preference just won't persist.
        }
      }
      return next;
    });
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: onVisibilityChange,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    getRowId,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const plural = nounPlural ?? `${noun}s`;
  const selectedRows = enableRowSelection
    ? table.getSelectedRowModel().flatRows.map((row) => row.original)
    : [];
  const clearSelection = () => setRowSelection({});

  return (
    <div className="space-y-4">
      {/* Toolbar: search · custom filters · column visibility · primary action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-on-surface-variant" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {enableRowSelection && selectedRows.length > 0 && (
            <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-accent/25 bg-accent/10 px-2 py-0.5">
              <span className="whitespace-nowrap px-1 text-xs font-semibold text-accent">
                {selectedRows.length} selected
              </span>
              {selectionToolbar?.(selectedRows, clearSelection)}
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-11 gap-2">
                <Columns3 className="size-4" />
                <span className="hidden lg:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  >
                    {columnLabels[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {rightActions}
        </div>
      </div>

      {/* The table — including its header filters — always renders, even with
          zero matches, so a filter that empties the result can still be
          cleared from the column header. The empty message lives in tbody. */}
      <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
        <table
          className="w-full table-fixed border-collapse text-sm"
          style={{ minWidth: table.getTotalSize() }}
        >
          <colgroup>
            {table.getVisibleLeafColumns().map((col) => (
              <col
                key={col.id}
                style={{ width: columnWidths[col.id] ?? col.getSize() }}
              />
            ))}
          </colgroup>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-surface-container">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left font-semibold text-on-surface"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {filteredCount === 0 ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length}>
                  {emptyState ?? (
                    <p className="px-6 py-14 text-center text-sm text-on-surface-variant">
                      No {plural} match your filters.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-outline-variant/40 border-t transition-colors",
                    row.getIsSelected()
                      ? "bg-accent/10 hover:bg-accent/15"
                      : "odd:bg-card even:bg-surface-low hover:bg-surface-container/60",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: count · rows-per-page · pager */}
      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-on-surface-variant">
          Showing{" "}
          <span className="font-medium text-on-surface">{filteredCount}</span>{" "}
          of <span className="font-medium text-on-surface">{data.length}</span>{" "}
          {data.length === 1 ? noun : plural}
        </p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-on-surface-variant">
            Rows
            <select
              value={
                pagination.pageSize >= data.length && data.length > 0
                  ? "all"
                  : String(pagination.pageSize)
              }
              onChange={(e) =>
                table.setPageSize(
                  e.target.value === "all"
                    ? Math.max(1, data.length)
                    : Number(e.target.value),
                )
              }
              className="h-9 rounded border border-outline-variant bg-card px-2 text-sm text-on-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="all">All</option>
            </select>
          </label>
          <span className="whitespace-nowrap text-sm text-on-surface-variant">
            Page{" "}
            <span className="font-medium text-on-surface">
              {pageCount === 0 ? 0 : pageIndex + 1}
            </span>{" "}
            of <span className="font-medium text-on-surface">{pageCount}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
