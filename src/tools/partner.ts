/**
 * Tools: sophos_create_tenant, sophos_get_managed_tenant,
 *        sophos_list_partner_roles, sophos_get_partner_role,
 *        sophos_create_partner_role, sophos_delete_partner_role,
 *        sophos_list_partner_permission_sets,
 *        sophos_list_partner_admins, sophos_get_partner_admin,
 *        sophos_create_partner_admin, sophos_delete_partner_admin,
 *        sophos_list_partner_admin_role_assignments,
 *        sophos_add_partner_admin_role_assignment,
 *        sophos_delete_partner_admin_role_assignment,
 *        sophos_get_billing_usage
 * Partner/organization-level tools using globalRequest.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerPartnerTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // =========================================================================
  // TENANT MANAGEMENT
  // =========================================================================

  server.registerTool(
    "sophos_create_tenant",
    {
      title: "Create Managed Tenant",
      description: `Create a new managed tenant under this partner/organization account.

Creates a new Sophos Central tenant that will be managed by the calling
partner or organization.

Args:
  - name (string): Display name for the new tenant.
  - data_geography (string): Data residency geography (e.g. "US", "IE", "DE").
  - billing_type (string, optional): Billing type (e.g. "trial", "usage").
  - contact_first_name (string, optional): Primary contact first name.
  - contact_last_name (string, optional): Primary contact last name.
  - contact_email (string, optional): Primary contact email.

Returns:
  Created tenant details including id, name, apiHost.`,
      inputSchema: {
        name: z.string().describe("Display name for the new tenant"),
        data_geography: z
          .string()
          .describe('Data residency geography (e.g. "US", "IE", "DE")'),
        billing_type: z
          .string()
          .optional()
          .describe('Billing type (e.g. "trial", "usage")'),
        contact_first_name: z
          .string()
          .optional()
          .describe("Primary contact first name"),
        contact_last_name: z
          .string()
          .optional()
          .describe("Primary contact last name"),
        contact_email: z
          .string()
          .optional()
          .describe("Primary contact email address"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(
      async ({
        name,
        data_geography,
        billing_type,
        contact_first_name,
        contact_last_name,
        contact_email,
      }) => {
        const body: Record<string, unknown> = {
          name,
          dataGeography: data_geography,
        };
        if (billing_type) body.billingType = billing_type;
        if (contact_first_name || contact_last_name || contact_email) {
          body.contact = {
            ...(contact_first_name ? { firstName: contact_first_name } : {}),
            ...(contact_last_name ? { lastName: contact_last_name } : {}),
            ...(contact_email ? { email: contact_email } : {}),
          };
        }

        const data = await client.globalRequest<Record<string, unknown>>(
          "/partner/v1/tenants",
          { method: "POST", body }
        );

        return jsonResult({ status: "created", tenant: data });
      }
    )
  );

  server.registerTool(
    "sophos_get_managed_tenant",
    {
      title: "Get Managed Tenant Details",
      description: `Get detailed information about a specific managed tenant.

Returns full tenant details including name, data geography, API host,
billing type, status, and contact information.

Args:
  - tenant_id (string): The tenant ID to retrieve.

Returns:
  Full tenant details.`,
      inputSchema: {
        tenant_id: z.string().describe("Tenant ID to retrieve"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id }) => {
      const data = await client.globalRequest<Record<string, unknown>>(
        `/partner/v1/tenants/${tenant_id}`
      );

      return jsonResult(data);
    })
  );

  // =========================================================================
  // PARTNER ROLES
  // =========================================================================

  server.registerTool(
    "sophos_list_partner_roles",
    {
      title: "List Partner Roles",
      description: `List partner-level admin roles.

Returns all role definitions available at the partner/organization level.
These roles can be assigned to partner administrators.

Args:
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of partner roles.`,
      inputSchema: {
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
    withErrorHandling(async ({ limit, page }) => {
      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };

      const data = await client.globalRequest<{
        items?: Record<string, unknown>[];
        pages?: { current?: number; total?: number; items?: number };
      }>("/partner/v1/roles", { params });

      const items = data.items ?? [];
      return jsonResult({
        total: data.pages?.total ?? data.pages?.items ?? items.length,
        page: data.pages?.current ?? page,
        roles: items,
      });
    })
  );

  server.registerTool(
    "sophos_get_partner_role",
    {
      title: "Get Partner Role",
      description: `Get details of a specific partner-level role.

Args:
  - role_id (string): Role ID to retrieve.

Returns:
  Role details including name, description, and permission sets.`,
      inputSchema: {
        role_id: z.string().describe("Role ID to retrieve"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ role_id }) => {
      const data = await client.globalRequest<Record<string, unknown>>(
        `/partner/v1/roles/${role_id}`
      );

      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_create_partner_role",
    {
      title: "Create Partner Role",
      description: `Create a new partner-level admin role.

Creates a custom role that can be assigned to partner administrators.
Use sophos_list_partner_permission_sets to see available permissions.

Args:
  - name (string): Role name.
  - description (string, optional): Role description.
  - permission_sets (string[], optional): Array of permission set IDs to include.

Returns:
  Created role details.`,
      inputSchema: {
        name: z.string().describe("Role name"),
        description: z.string().optional().describe("Role description"),
        permission_sets: z
          .array(z.string())
          .optional()
          .describe("Array of permission set IDs to include"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ name, description, permission_sets }) => {
      const body: Record<string, unknown> = { name };
      if (description) body.description = description;
      if (permission_sets) body.permissionSets = permission_sets;

      const data = await client.globalRequest<Record<string, unknown>>(
        "/partner/v1/roles",
        { method: "POST", body }
      );

      return jsonResult({ status: "created", role: data });
    })
  );

  server.registerTool(
    "sophos_delete_partner_role",
    {
      title: "Delete Partner Role",
      description: `Delete a partner-level admin role.

Removes the role definition. Any admins currently assigned this role will
lose the associated permissions.

Args:
  - role_id (string): Role ID to delete.

Returns:
  Confirmation of deletion.`,
      inputSchema: {
        role_id: z.string().describe("Role ID to delete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ role_id }) => {
      await client.globalRequest(
        `/partner/v1/roles/${role_id}`,
        { method: "DELETE" }
      );

      return jsonResult({
        status: "deleted",
        role_id,
        message: `Partner role ${role_id} deleted.`,
      });
    })
  );

  // =========================================================================
  // PARTNER PERMISSION SETS
  // =========================================================================

  server.registerTool(
    "sophos_list_partner_permission_sets",
    {
      title: "List Partner Permission Sets",
      description: `List available partner-level permission sets.

Returns all permission sets that can be assigned to partner roles.
Use these IDs when creating or updating partner roles.

Returns:
  List of available permission sets with IDs and descriptions.`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async () => {
      const data = await client.globalRequest<Record<string, unknown>>(
        "/partner/v1/roles/permission-sets"
      );

      return jsonResult(data);
    })
  );

  // =========================================================================
  // PARTNER ADMINS
  // =========================================================================

  server.registerTool(
    "sophos_list_partner_admins",
    {
      title: "List Partner Admins",
      description: `List partner-level administrator accounts.

Returns all administrators at the partner/organization level with their
role assignments.

Args:
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of partner admins.`,
      inputSchema: {
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
    withErrorHandling(async ({ limit, page }) => {
      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };

      const data = await client.globalRequest<{
        items?: Record<string, unknown>[];
        pages?: { current?: number; total?: number; items?: number };
      }>("/partner/v1/admins", { params });

      const items = data.items ?? [];
      return jsonResult({
        total: data.pages?.total ?? data.pages?.items ?? items.length,
        page: data.pages?.current ?? page,
        admins: items,
      });
    })
  );

  server.registerTool(
    "sophos_get_partner_admin",
    {
      title: "Get Partner Admin",
      description: `Get details of a specific partner-level administrator.

Args:
  - admin_id (string): Admin ID to retrieve.

Returns:
  Admin details including name, email, and role assignments.`,
      inputSchema: {
        admin_id: z.string().describe("Admin ID to retrieve"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ admin_id }) => {
      const data = await client.globalRequest<Record<string, unknown>>(
        `/partner/v1/admins/${admin_id}`
      );

      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_create_partner_admin",
    {
      title: "Create Partner Admin",
      description: `Create a new partner-level administrator.

Creates an admin account at the partner/organization level. The admin
will receive an invitation email.

Args:
  - first_name (string): Admin's first name.
  - last_name (string): Admin's last name.
  - email (string): Admin's email address.
  - role_assignments (array, optional): Array of role assignment objects,
    each with a roleId string.

Returns:
  Created admin details.`,
      inputSchema: {
        first_name: z.string().describe("Admin's first name"),
        last_name: z.string().describe("Admin's last name"),
        email: z.string().describe("Admin's email address"),
        role_assignments: z
          .array(z.object({ roleId: z.string().describe("Role ID") }))
          .optional()
          .describe("Array of role assignments"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ first_name, last_name, email, role_assignments }) => {
      const body: Record<string, unknown> = {
        firstName: first_name,
        lastName: last_name,
        email,
      };
      if (role_assignments) body.roleAssignments = role_assignments;

      const data = await client.globalRequest<Record<string, unknown>>(
        "/partner/v1/admins",
        { method: "POST", body }
      );

      return jsonResult({ status: "created", admin: data });
    })
  );

  server.registerTool(
    "sophos_delete_partner_admin",
    {
      title: "Delete Partner Admin",
      description: `Delete a partner-level administrator account.

Permanently removes the admin's access to the partner dashboard and
all managed tenants.

Args:
  - admin_id (string): Admin ID to delete.

Returns:
  Confirmation of deletion.`,
      inputSchema: {
        admin_id: z.string().describe("Admin ID to delete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ admin_id }) => {
      await client.globalRequest(
        `/partner/v1/admins/${admin_id}`,
        { method: "DELETE" }
      );

      return jsonResult({
        status: "deleted",
        admin_id,
        message: `Partner admin ${admin_id} deleted.`,
      });
    })
  );

  // =========================================================================
  // PARTNER ADMIN ROLE ASSIGNMENTS
  // =========================================================================

  server.registerTool(
    "sophos_list_partner_admin_role_assignments",
    {
      title: "List Partner Admin Role Assignments",
      description: `List role assignments for a specific partner administrator.

Returns all roles currently assigned to the specified admin.

Args:
  - admin_id (string): Admin ID whose role assignments to list.

Returns:
  List of role assignments for the admin.`,
      inputSchema: {
        admin_id: z.string().describe("Admin ID whose role assignments to list"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ admin_id }) => {
      const data = await client.globalRequest<Record<string, unknown>>(
        `/partner/v1/admins/${admin_id}/role-assignments`
      );

      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_add_partner_admin_role_assignment",
    {
      title: "Add Partner Admin Role Assignment",
      description: `Add a role assignment to a partner administrator.

Grants the specified role's permissions to the admin.

Args:
  - admin_id (string): Admin ID to assign the role to.
  - role_id (string): Role ID to assign.

Returns:
  Created role assignment details.`,
      inputSchema: {
        admin_id: z.string().describe("Admin ID to assign the role to"),
        role_id: z.string().describe("Role ID to assign"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ admin_id, role_id }) => {
      const data = await client.globalRequest<Record<string, unknown>>(
        `/partner/v1/admins/${admin_id}/role-assignments`,
        { method: "POST", body: { roleId: role_id } }
      );

      return jsonResult({ status: "created", assignment: data });
    })
  );

  server.registerTool(
    "sophos_delete_partner_admin_role_assignment",
    {
      title: "Delete Partner Admin Role Assignment",
      description: `Remove a role assignment from a partner administrator.

Revokes the specified role's permissions from the admin.

Args:
  - admin_id (string): Admin ID to remove the role from.
  - assignment_id (string): Role assignment ID to remove.

Returns:
  Confirmation of deletion.`,
      inputSchema: {
        admin_id: z.string().describe("Admin ID to remove the role from"),
        assignment_id: z.string().describe("Role assignment ID to remove"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ admin_id, assignment_id }) => {
      await client.globalRequest(
        `/partner/v1/admins/${admin_id}/role-assignments/${assignment_id}`,
        { method: "DELETE" }
      );

      return jsonResult({
        status: "deleted",
        admin_id,
        assignment_id,
        message: `Role assignment ${assignment_id} removed from admin ${admin_id}.`,
      });
    })
  );

  // =========================================================================
  // BILLING USAGE
  // =========================================================================

  server.registerTool(
    "sophos_get_billing_usage",
    {
      title: "Get Billing Usage",
      description: `Get billing usage for a specific month.

Returns billing usage data across all managed tenants for the given year and month.
Supports pagination and optional client-side tenant filtering.

When tenant_id is provided, results are filtered client-side by matching the
accountId field in each billing line item. Items without an accountId (e.g.
standalone device subscriptions) are excluded from filtered results. The
pages metadata reflects the unfiltered totals from the API.

Args:
  - year (number): The year (e.g. 2026).
  - month (number): The month (1-12).
  - tenant_id (string, optional): Filter results to a specific tenant by accountId.
  - page_size (number, optional): Items per page (default 50).
  - cursor (string, optional): Pagination cursor from a previous response.

Returns:
  Billing usage details for the specified month.`,
      inputSchema: {
        year: z.number().int().min(2000).max(2100).describe("Year (e.g. 2026)"),
        month: z.number().int().min(1).max(12).describe("Month (1-12)"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Filter results to a specific tenant by accountId"),
        page_size: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Items per page (default 50)"),
        cursor: z
          .string()
          .optional()
          .describe("Pagination cursor from a previous response"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ year, month, tenant_id, page_size, cursor }) => {
      const params: Record<string, string> = { pageTotal: "true" };
      if (page_size) params.pageSize = String(page_size);
      if (cursor) params.cursor = cursor;

      const data = await client.globalRequest<{
        items?: Array<Record<string, unknown>>;
        pages?: Record<string, unknown>;
      }>(
        `/partner/v1/billing/usage/${year}/${month}`,
        { params }
      );

      if (tenant_id && Array.isArray(data.items)) {
        const filtered = data.items.filter(
          (item) => item.accountId === tenant_id || item.externalId === tenant_id
        );
        return jsonResult({
          items: filtered,
          filteredCount: filtered.length,
          unfilteredCount: data.items.length,
          tenantFilter: tenant_id,
          pages: data.pages,
        });
      }

      return jsonResult(data);
    })
  );

}
