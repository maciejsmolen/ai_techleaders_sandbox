import { z } from "zod";

import { withScope } from "../container/container";
import type { Cradle } from "../container/cradle";
import { apiHandler, type RouteHandler } from "./apiHandler";
import { parseBody, parseInput } from "./parse";

/** The service shape a plain CRUD resource exposes. */
export interface CrudService<T, CreateInput, UpdateInput> {
  list(): Promise<T[]>;
  create(input: CreateInput): Promise<T>;
  update(id: string, input: UpdateInput): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface CrudRouteConfig<T, CreateInput, UpdateInput> {
  /** Picks the service from the request scope. */
  service: (cradle: Cradle) => CrudService<T, CreateInput, UpdateInput>;
  createSchema: z.ZodType<CreateInput>;
  updateSchema: z.ZodType<UpdateInput>;
  /** Validates the record id. Defaults to a UUID (the id type of every entity). */
  idSchema?: z.ZodType<string>;
}

/** Works for both `api/<concept>/route.ts` (`?id=`) and `api/<concept>/[id]/route.ts`. */
export type CrudRouteContext = { params: Promise<{ id?: string | string[] }> };

type CrudRoutes = Record<"GET" | "POST" | "PUT" | "DELETE", RouteHandler<CrudRouteContext>>;

/**
 * Builds the handlers for a resource that is only list/create/update/delete.
 * Re-export them from `route.ts`: `export const { GET, POST, PUT, DELETE } = makeCrudRoute({ ... })`.
 * Workflow endpoints (booking, payment) use `apiHandler` directly instead.
 */
export function makeCrudRoute<T, CreateInput, UpdateInput>(
  config: CrudRouteConfig<T, CreateInput, UpdateInput>,
): CrudRoutes {
  const idSchema = config.idSchema ?? z.uuid();

  async function readId(request: Request, context: CrudRouteContext): Promise<string> {
    const id = (await context.params).id ?? new URL(request.url).searchParams.get("id") ?? undefined;
    return parseInput(z.object({ id: idSchema }), { id }).id;
  }

  return {
    GET: apiHandler(() => withScope((cradle) => config.service(cradle).list())),
    POST: apiHandler(
      async (request: Request) => {
        const input = await parseBody(request, config.createSchema);
        return withScope((cradle) => config.service(cradle).create(input));
      },
      { status: 201 },
    ),
    PUT: apiHandler(async (request: Request, context: CrudRouteContext) => {
      const id = await readId(request, context);
      const input = await parseBody(request, config.updateSchema);
      return withScope((cradle) => config.service(cradle).update(id, input));
    }),
    DELETE: apiHandler(async (request: Request, context: CrudRouteContext) => {
      const id = await readId(request, context);
      await withScope((cradle) => config.service(cradle).remove(id));
      return null;
    }),
  };
}
