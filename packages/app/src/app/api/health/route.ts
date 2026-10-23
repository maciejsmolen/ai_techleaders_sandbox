import { withScope } from "@devmentor/core/container";
import { apiHandler } from "@devmentor/core/http";

export const dynamic = "force-dynamic";

// 200 { ok: true, data: { status, db } }, or 503 `service_unavailable` when
// the database is unreachable (HealthService and withScope throw it).
export const GET = apiHandler(() => withScope(({ healthService }) => healthService.check()));
