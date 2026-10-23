"use client";

import { useState, type ReactNode } from "react";

import { Button } from "../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { EmptyState } from "../feedback/EmptyState";
import { ErrorMessage } from "../feedback/ErrorMessage";
import { LoadingMessage } from "../feedback/LoadingMessage";

export interface DataTableColumn<Row> {
  /** Also the default cell: `row[key]`, rendered as text. */
  key: string;
  header: ReactNode;
  cell?: (row: Row) => ReactNode;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[] | undefined;
  getRowId: (row: Row) => string;
  isLoading?: boolean;
  /** An error message; replaces the table. */
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Rows per page; pagination controls appear only when there is more than one page. */
  pageSize?: number;
  /** Rendered in a trailing "Actions" column. */
  rowActions?: (row: Row) => ReactNode;
  caption?: string;
}

const DEFAULT_PAGE_SIZE = 20;

function defaultCell(row: unknown, key: string): ReactNode {
  const value = (row as Record<string, unknown>)[key];
  return value === null || value === undefined ? "" : String(value);
}

export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  error,
  emptyTitle,
  emptyDescription,
  pageSize = DEFAULT_PAGE_SIZE,
  rowActions,
  caption,
}: DataTableProps<Row>) {
  const [page, setPage] = useState(0);

  if (isLoading) return <LoadingMessage />;
  if (error) return <ErrorMessage message={error} />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  const pageCount = Math.ceil(rows.length / pageSize);
  // The rows may shrink (e.g. after a delete) while a later page is selected.
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3">
      <Table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
            {rowActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((column) => (
                <TableCell key={column.key}>{column.cell ? column.cell(row) : defaultCell(row, column.key)}</TableCell>
              ))}
              {rowActions && <TableCell className="text-right">{rowActions(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {currentPage + 1} of {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
