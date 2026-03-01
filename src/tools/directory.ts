/**
 * Tools: sophos_list_users, sophos_list_admins
 * Interact with the Sophos Common API for directory and admin management.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import type { SophosPagedResponse } from "../types/sophos.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

interface SophosUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  exchangeLogin?: string;
  groupIds?: string[];
  groupNames?: string[];
}

interface SophosAdmin {
  id: string;
  name?: string;
  roleAssignments?: Array<{
    roleId: string;
    roleName?: string;
  }>;
}

export function registerDirectoryTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List Users ---
  server.registerTool(
    "sophos_list_users",
    {
      title: "List Sophos Directory Users",
      description: `List directory users in a Sophos Central tenant.

Returns user records from the Sophos Central directory, which maps users to 
their devices and group memberships.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - search (string, optional): Search by name or email.
  - group_id (string, optional): Filter by group ID.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of users with: id, name, email, group memberships.`,
      inputSchema: {
        tenant_id: z
          .string()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        search: z
          .string()
          .optional()
          .describe("Search by name or email substring"),
        group_id: z
          .string()
          .optional()
          .describe("Filter by directory group ID"),
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
    withErrorHandling(async ({ tenant_id, search, group_id, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };

      if (search) params.search = search;
      if (group_id) params.groupId = group_id;

      const data = await client.tenantRequest<SophosPagedResponse<SophosUser>>(
        resolvedTenantId,
        "/common/v1/directory/users",
        { params }
      );

      return jsonResult({
        total: data.pages.total ?? data.pages.items ?? data.items.length,
        page: data.pages.current ?? page,
        users: data.items.map((u) => ({
          id: u.id,
          name: u.name,
          first_name: u.firstName ?? null,
          last_name: u.lastName ?? null,
          email: u.email ?? null,
          exchange_login: u.exchangeLogin ?? null,
          groups: u.groupNames ?? [],
        })),
      });
    })
  );

  // --- List Admins ---
  server.registerTool(
    "sophos_list_admins",
    {
      title: "List Sophos Admins",
      description: `List administrator accounts in a Sophos Central tenant.

Returns admin users and their role assignments.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).`,
      inputSchema: {
        tenant_id: z
          .string()
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

      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };

      const data = await client.tenantRequest<SophosPagedResponse<SophosAdmin>>(
        resolvedTenantId,
        "/common/v1/admins",
        { params }
      );

      return jsonResult({
        total: data.pages.total ?? data.pages.items ?? data.items.length,
        page: data.pages.current ?? page,
        admins: data.items.map((a) => ({
          id: a.id,
          name: a.name ?? null,
          roles: a.roleAssignments ?? [],
        })),
      });
    })
  );

  // --- List Roles ---
  server.registerTool(
    "sophos_list_roles",
    {
      title: "List Sophos Admin Roles",
      description: `List available admin roles in a Sophos Central tenant.

Returns all role definitions that can be assigned to admins. Useful for
understanding what permissions are available before assigning roles.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).`,
      inputSchema: {
        tenant_id: z
          .string()
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

      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };

      const data = await client.tenantRequest<
        SophosPagedResponse<Record<string, unknown>>
      >(resolvedTenantId, "/common/v1/roles", { params });

      return jsonResult({
        total: data.pages.total ?? data.pages.items ?? data.items.length,
        page: data.pages.current ?? page,
        roles: data.items,
      });
    })
  );
}
