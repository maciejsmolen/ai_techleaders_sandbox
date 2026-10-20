import type { HealthReport } from "@devmentor/core";

import { withRequestScope } from "@/server/container";

export const dynamic = "force-dynamic";

export async function GET() {
  let report: HealthReport;
  try {
    report = await withRequestScope(({ healthService }) => healthService.check());
  } catch {
    // The container couldn't be built (e.g. the database is unreachable at startup).
    report = { status: "error", db: "error" };
  }
  return Response.json(report, { status: report.status === "ok" ? 200 : 503 });
}
