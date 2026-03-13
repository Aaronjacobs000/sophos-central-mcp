/**
 * Tools: sophos_list_migrations, sophos_get_migration, sophos_create_migration,
 *        sophos_delete_migration, sophos_list_migration_endpoints,
 *        sophos_list_recommended_packages, sophos_list_static_packages
 * Interact with the Sophos Endpoint Migration and Software Package APIs.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import type { SophosPagedResponse } from "../types/sophos.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerEndpointMigrationTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List Migrations ---
  server.registerTool(
    "sophos_list_migrations",
    {
      title: "List Sophos Endpoint Migrations",
      description: `List endpoint migration jobs for a tenant.

Returns migration jobs with their status, name, and endpoint counts.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of migration jobs.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Max results per page (default 50)"),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Page number (default 1)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const data = await client.tenantRequest<
        SophosPagedResponse<Record<string, unknown>>
      >(resolvedTenantId, "/endpoint/v1/migrations", {
        params: { pageSize: String(limit), page: String(page) },
      });

      return jsonResult({
        total: data.pages.total ?? data.pages.items ?? data.items.length,
        page: data.pages.current ?? page,
        migrations: data.items,
      });
    })
  );

  // --- Get Migration ---
  server.registerTool(
    "sophos_get_migration",
    {
      title: "Get Sophos Migration Detail",
      description: `Get full details of a specific endpoint migration job.

Args:
  - migration_id (string): The migration job ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Migration job details including status, name, and endpoint information.`,
      inputSchema: {
        migration_id: z.string().uuid().describe("Migration job ID"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ migration_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/endpoint/v1/migrations/${migration_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Create Migration ---
  server.registerTool(
    "sophos_create_migration",
    {
      title: "Create Sophos Migration Job",
      description: `Create a new endpoint migration job to migrate endpoints between tenants.

Args:
  - name (string): Name for the migration job.
  - endpoints (array, optional): Array of endpoint IDs to include in the migration.
  - from_token (string, optional): Migration token from the source tenant.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  The created migration job details.`,
      inputSchema: {
        name: z.string().describe("Migration job name"),
        endpoints: z
          .array(z.string())
          .optional()
          .describe("Endpoint IDs to include in the migration"),
        from_token: z
          .string()
          .optional()
          .describe("Migration token from the source tenant"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ name, endpoints, from_token, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const body: Record<string, unknown> = { name };
      if (endpoints?.length) body.endpoints = endpoints;
      if (from_token) body.fromToken = from_token;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/migrations",
        { method: "POST", body }
      );

      return jsonResult({ status: "created", migration: data });
    })
  );

  // --- Delete Migration ---
  server.registerTool(
    "sophos_delete_migration",
    {
      title: "Delete Sophos Migration Job",
      description: `Delete an endpoint migration job.

Args:
  - migration_id (string): The migration job ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        migration_id: z.string().uuid().describe("Migration job ID to delete"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ migration_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/endpoint/v1/migrations/${migration_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        migration_id,
        message: `Migration job ${migration_id} deleted.`,
      });
    })
  );

  // --- List Migration Endpoints ---
  server.registerTool(
    "sophos_list_migration_endpoints",
    {
      title: "List Sophos Migration Endpoints",
      description: `List endpoints in a specific migration job.

Args:
  - migration_id (string): The migration job ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of endpoints in the migration.`,
      inputSchema: {
        migration_id: z.string().uuid().describe("Migration job ID"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Max results per page (default 50)"),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Page number (default 1)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ migration_id, tenant_id, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const data = await client.tenantRequest<
        SophosPagedResponse<Record<string, unknown>>
      >(resolvedTenantId, `/endpoint/v1/migrations/${migration_id}/endpoints`, {
        params: { pageSize: String(limit), page: String(page) },
      });

      return jsonResult({
        total: data.pages.total ?? data.pages.items ?? data.items.length,
        page: data.pages.current ?? page,
        endpoints: data.items,
      });
    })
  );

  // --- List Recommended Packages ---
  server.registerTool(
    "sophos_list_recommended_packages",
    {
      title: "List Sophos Recommended Packages",
      description: `List recommended software packages for endpoint deployment.

Returns the recommended installer packages for deploying Sophos endpoint protection.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of recommended software packages.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Max results per page (default 50)"),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Page number (default 1)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const data = await client.tenantRequest<
        Record<string, unknown>
      >(resolvedTenantId, "/endpoint/v1/software/packages/recommended", {
        params: { pageSize: String(limit), page: String(page) },
      });

      const items = (data as { items?: Record<string, unknown>[] }).items ?? [];
      const pages = (data as { pages?: { total?: number; current?: number; items?: number } }).pages;
      return jsonResult({
        total: pages?.total ?? pages?.items ?? items.length,
        page: pages?.current ?? page,
        packages: items,
      });
    })
  );

  // --- List Static Packages ---
  server.registerTool(
    "sophos_list_static_packages",
    {
      title: "List Sophos Static Packages",
      description: `List static software packages for endpoint deployment.

Returns static installer packages available for deploying Sophos endpoint protection.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of static software packages.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Max results per page (default 50)"),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Page number (default 1)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const data = await client.tenantRequest<
        Record<string, unknown>
      >(resolvedTenantId, "/endpoint/v1/software/packages/static", {
        params: { pageSize: String(limit), page: String(page) },
      });

      const items = (data as { items?: Record<string, unknown>[] }).items ?? [];
      const pages = (data as { pages?: { total?: number; current?: number; items?: number } }).pages;
      return jsonResult({
        total: pages?.total ?? pages?.items ?? items.length,
        page: pages?.current ?? page,
        packages: items,
      });
    })
  );
}
