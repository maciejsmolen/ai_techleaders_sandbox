"use client";

import type { HealthReport } from "@devmentor/core";
import { apiCall, type ApiResult } from "@devmentor/ui/backend/api";
import { DataTable, type DataTableColumn } from "@devmentor/ui/backend/tables";
import { Button } from "@devmentor/ui/components/ui/button";
import { useCallback, useEffect, useState } from "react";

interface ComponentRow {
  component: string;
  status: string;
}

const columns: DataTableColumn<ComponentRow>[] = [
  { key: "component", header: "Component" },
  { key: "status", header: "Status", cell: (row) => (row.status === "ok" ? "OK" : row.status) },
];

const fetchHealth = () => apiCall<HealthReport>("/api/health", { cache: "no-store" });

/** The admin dashboard's health table: the reference for apiCall + DataTable. */
export function SystemStatus() {
  const [rows, setRows] = useState<ComponentRow[]>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyResult = useCallback((result: ApiResult<HealthReport>) => {
    if (result.ok) {
      setRows([{ component: "Database", status: result.data.db }]);
      setError(null);
    } else {
      setRows(undefined);
      setError(result.error.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    void fetchHealth().then((result) => {
      if (isCurrent) applyResult(result);
    });
    return () => {
      isCurrent = false;
    };
  }, [applyResult]);

  function refresh() {
    setIsLoading(true);
    void fetchHealth().then(applyResult);
  }

  return (
    <section className="flex w-full max-w-xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">System status</h2>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
          Refresh
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.component}
        isLoading={isLoading}
        error={error}
        caption="System status"
      />
    </section>
  );
}
