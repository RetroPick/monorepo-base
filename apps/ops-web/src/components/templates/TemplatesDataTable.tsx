"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { OpsTemplateRow } from "@/lib/api";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<OpsTemplateRow>();

export function TemplatesDataTable({ rows }: { rows: OpsTemplateRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "slug", desc: false }]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("slug", {
        header: "Slug",
        cell: (info) => (
          <Link
            href={`/templates/${info.row.original.templateId}`}
            className="font-medium text-[color:var(--color-coloredLinkText)] hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("marketType", {
        header: "Market type",
        cell: (info) => (
          <span className="font-mono text-[color:var(--color-secondaryText)]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("rollingPhase", {
        header: "Rolling phase",
        cell: (info) => (
          <span className="font-mono text-[color:var(--color-secondaryText)]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("initialized", {
        header: "Init",
        cell: (info) => (info.getValue() ? "yes" : "no"),
      }),
      columnHelper.display({
        id: "epochs",
        header: "Epochs",
        cell: ({ row }) => {
          const r = row.original;
          const parts: string[] = [];
          if (r.activeEpochId != null) parts.push(`active ${r.activeEpochId}`);
          if (r.lastResolvedEpochId != null) parts.push(`last ${r.lastResolvedEpochId}`);
          return (
            <span className="text-xs text-[color:var(--color-placeholderText)]">
              {parts.length ? parts.join(" · ") : "—"}
            </span>
          );
        },
      }),
      columnHelper.accessor("templateId", {
        header: "templateId",
        cell: (info) => (
          <span className="max-w-[180px] truncate font-mono text-[10px] text-[color:var(--color-placeholderText)]">
            {info.getValue()}
          </span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-[color:var(--color-mainBorder)]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[color:var(--color-mainBorder)] bg-[color:var(--color-tableHeaderBg)] text-xs uppercase text-[color:var(--color-placeholderText)]">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th key={header.id} className="px-3 py-2">
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className={cn(
                        header.column.getCanSort()
                          ? "cursor-pointer select-none hover:text-[color:var(--color-primaryText)]"
                          : "",
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-[color:var(--color-mainBorder)]">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-[color:var(--color-placeholderText)]"
              >
                No templates indexed.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-[color:var(--color-tableRowBgHover)]">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 text-[color:var(--color-tableCellText)]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
