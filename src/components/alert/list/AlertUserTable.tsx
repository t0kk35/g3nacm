'use client'

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { AlertUserStatus } from "@/components/alert/list/AlertUserStatus"
import { AlertUserDetection } from "@/components/alert/list/AlertUserDetection"
import { AlertPriorityBadge } from "../AlertPriority"
import { Alert } from "@/app/api/data/alert/alert"

type Props = { data: Alert[] }

export function AlertTable({ data }: Props) {
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "alert_identifier",
      header: "Alert Identifier",
      cell: ({ row }) => (
        <Link href={`/alert/${row.original.id}`} className="hover:underline">
          {row.original.alert_identifier}
        </Link>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <AlertPriorityBadge priority={row.original.priority} />
      ),
    },
    {
      accessorKey: "alert_item",
      header: "Alert Item",
      cell: ({ row }) => (
        <Link href={`/subject/${row.original.alert_item.id}`} className="hover:underline">
          {row.original.alert_item.details.subject_name}
        </Link>
      ),
    },
    {
      accessorKey: "alert_type",
      header: "Alert Type",
    },
    {
      accessorKey: "entity_state.to_state",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="sm">
                Status
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <AlertUserStatus alert={row.original} />
            </HoverCardContent>
          </HoverCard>
        </div>
      ),
    },
    {
      id: "detections",
      header: "Detections",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="sm">
                Detections
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <AlertUserDetection alert={row.original} />
            </HoverCardContent>
          </HoverCard>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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
    </div>
  )
}