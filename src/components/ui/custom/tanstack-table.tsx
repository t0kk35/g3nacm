'use client'

import { useState } from "react"
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table"
import { SortingState, getSortedRowModel } from "@tanstack/react-table"
import { ColumnFiltersState, getFilteredRowModel} from "@tanstack/react-table"
import { VisibilityState } from "@tanstack/react-table"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "../button"
import { Input } from "../input"
import { Badge } from "../badge"
import { ChevronsLeft, ChevronsRight, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronDown, ArrowUp, ArrowDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select"
import { Tooltip, TooltipTrigger, TooltipContent } from "../tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

type TanStackTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[],
  filterColumn?:string,
  visibilityChange?: boolean
  pageSize?: number
}

const priorityOrder: Record<string, number> = {
  High: 1,
  Medium: 2,
  Low: 3,
}

export function TanStackTable<TData, TValue>({ columns, data, filterColumn, visibilityChange, pageSize }: TanStackTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0, //initial page index
    pageSize: pageSize || 10, //default page size
  });
 
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination
    },
  });

  return (
    <>
      <div className="flex items-center py-4">
        { /* Filter input */ }
        { filterColumn && (
          <Input
            placeholder="Filter items..."
            value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(filterColumn)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />)}
        { /* Column Visibility */ }
        { visibilityChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter(
                  (column) => column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header,header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        { /* Pagination */ }
        <div className="flex items-center justify-end space-x-2 py-4 mx-2">
          <Select 
            value={pagination.pageSize.toString()}
            onValueChange={(v) => table.setPageSize(Number(v))}
            >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>First Page</span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>Previous</span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>Next</span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>Last Page</span>
            </TooltipContent>
          </Tooltip>                      
        </div>
      </div>
    </>

  )
}

export function tanStackColumnHelper<T>() {
  return {
    select: () :ColumnDef<T> => ({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false
    }),
    accessor: (key: keyof T, value: string, allign:'left'|'right'|'center', sortable: boolean): ColumnDef<T> => ({
      accessorKey: key,
      header: ({ column }) => {
        return (
          sortable ? (
            <div className={`text-${allign}`}>
              <Button
                className="font-semibold data-[state=open]:bg-accent -ml-3 h-8"
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                {value}
                {column.getIsSorted() === "desc" ? (<ArrowDown />) 
                  : column.getIsSorted() === "asc" ? (<ArrowUp />) 
                  : (<ChevronsUpDown />)
                }
              </Button>
            </div>
          ) : (
            <div className={`text-${allign} font-semibold`}>{value}</div>
          )
        )
      },
      cell: ({ getValue }) => {
        return (
          <div className={`text-${allign} font-medium`}>{String(getValue())}</div>
        )
      }
    }),
    priority: (key: keyof T, sortable: boolean): ColumnDef<T> => ({
      accessorKey: key,
      header: ({ column }) => {
        return (
          sortable ? (
            <div className="text-center">
              <Button
                className="font-semibold data-[state=open]:bg-accent -ml-3 h-8`"
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Priority
                {column.getIsSorted() === "desc" ? (<ArrowDown />) 
                  : column.getIsSorted() === "asc" ? (<ArrowUp />) 
                  : (<ChevronsUpDown />)
                }
              </Button>
            </div>
          ) : (
            <div className="text-center font-semibold">Priority</div>
          )
        )
      },
      cell: ({ getValue }) => {
        const priority = String(getValue())
        return (
          <div className="text-center">
            <Badge className={cn((priority === "High")  ? "bg-priority-high" 
              : (priority === "Medium") ? "bg-priority-medium" 
              : "bg-priority-low", "text-muted")}
            >
              {priority}
            </Badge> 
          </div>
        )
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = priorityOrder[String(rowA.getValue(columnId))];
        const b = priorityOrder[String(rowB.getValue(columnId))];
        return a - b;
      }
    }),
    custom: (id: string, header: ColumnDef<T>["header"], cell: ColumnDef<T>["cell"]): ColumnDef<T> => ({
      id,
      header,
      cell,
    }),
  }
}