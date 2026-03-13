/**
 * Tools: sophos_list_dns_locations, sophos_get_dns_location,
 *        sophos_create_dns_location, sophos_update_dns_location,
 *        sophos_delete_dns_location
 * Interact with the Sophos DNS Protection API /dns-protection/v1/
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerDnsProtectionTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List DNS Locations ---
  server.registerTool(
    "sophos_list_dns_locations",
    {
      title: "List DNS Protection Locations",
      description: `List DNS protection locations configured for a tenant.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of DNS protection locations.`,
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
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/dns-protection/v1/locations",
        { params: { pageSize: String(limit), page: String(page) } }
      );
      return jsonResult(data);
    })
  );

  // --- Get DNS Location ---
  server.registerTool(
    "sophos_get_dns_location",
    {
      title: "Get DNS Protection Location",
      description: `Get details of a specific DNS protection location.

Args:
  - location_id (string): The location ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        location_id: z.string().describe("DNS location ID"),
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
    withErrorHandling(async ({ location_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/dns-protection/v1/locations/${location_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Create DNS Location ---
  server.registerTool(
    "sophos_create_dns_location",
    {
      title: "Create DNS Protection Location",
      description: `Create a new DNS protection location.

Args:
  - name (string): Location name.
  - ip_addresses (string[], optional): IP addresses for the location.
  - networks (string[], optional): Network CIDR ranges for the location.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        name: z.string().describe("Location name"),
        ip_addresses: z
          .array(z.string())
          .optional()
          .describe("IP addresses for the location"),
        networks: z
          .array(z.string())
          .optional()
          .describe("Network CIDR ranges for the location"),
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
    withErrorHandling(async ({ name, ip_addresses, networks, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { name };
      if (ip_addresses) body.ipAddresses = ip_addresses;
      if (networks) body.networks = networks;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/dns-protection/v1/locations",
        { method: "POST", body }
      );
      return jsonResult({ status: "created", location: data });
    })
  );

  // --- Update DNS Location ---
  server.registerTool(
    "sophos_update_dns_location",
    {
      title: "Update DNS Protection Location",
      description: `Update an existing DNS protection location.

Args:
  - location_id (string): The location ID to update.
  - name (string, optional): Updated location name.
  - ip_addresses (string[], optional): Updated IP addresses.
  - networks (string[], optional): Updated network CIDR ranges.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        location_id: z.string().describe("DNS location ID to update"),
        name: z.string().optional().describe("Updated location name"),
        ip_addresses: z
          .array(z.string())
          .optional()
          .describe("Updated IP addresses"),
        networks: z
          .array(z.string())
          .optional()
          .describe("Updated network CIDR ranges"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ location_id, name, ip_addresses, networks, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (ip_addresses) body.ipAddresses = ip_addresses;
      if (networks) body.networks = networks;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/dns-protection/v1/locations/${location_id}`,
        { method: "PATCH", body }
      );
      return jsonResult({ status: "updated", location: data });
    })
  );

  // --- Delete DNS Location ---
  server.registerTool(
    "sophos_delete_dns_location",
    {
      title: "Delete DNS Protection Location",
      description: `Delete a DNS protection location.

WARNING: This permanently removes the DNS protection location.

Args:
  - location_id (string): The location ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        location_id: z.string().describe("DNS location ID to delete"),
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
    withErrorHandling(async ({ location_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/dns-protection/v1/locations/${location_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        location_id,
        message: `DNS location ${location_id} deleted.`,
      });
    })
  );
}
