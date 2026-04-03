/**
 * Tools: sophos_list_wifi_mac_filters, sophos_add_wifi_mac_filter,
 *        sophos_delete_wifi_mac_filter
 * Interact with the Sophos Wi-Fi API /wifi/v1/
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerWifiTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List Wi-Fi MAC Filters ---
  server.registerTool(
    "sophos_list_wifi_mac_filters",
    {
      title: "List Wi-Fi MAC Filtering Entries",
      description: `List Wi-Fi MAC filtering entries configured for a tenant.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of MAC filtering entries with address, action, and comment.`,
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
        "/wifi/v1/settings/mac-filtering",
        { params: { pageSize: String(limit), page: String(page) } }
      );
      return jsonResult(data);
    })
  );

  // --- Add Wi-Fi MAC Filter ---
  server.registerTool(
    "sophos_add_wifi_mac_filter",
    {
      title: "Add Wi-Fi MAC Filter Entry",
      description: `Add a MAC filtering entry to allow or deny a device by MAC address.

Args:
  - mac_address (string): MAC address to filter (e.g. "00:11:22:33:44:55").
  - action (string): Filter action: "allow" or "deny".
  - comment (string, optional): Description or reason for the filter entry.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mac_address: z
          .string()
          .describe('MAC address to filter (e.g. "00:11:22:33:44:55")'),
        action: z
          .enum(["allow", "deny"])
          .describe('Filter action: "allow" or "deny"'),
        comment: z.string().optional().describe("Description or reason for the filter"),
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
    withErrorHandling(async ({ mac_address, action, comment, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { macAddress: mac_address, action };
      if (comment) body.comment = comment;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/wifi/v1/settings/mac-filtering",
        { method: "POST", body }
      );
      return jsonResult({ status: "created", filter: data });
    })
  );

  // --- Delete Wi-Fi MAC Filter ---
  server.registerTool(
    "sophos_delete_wifi_mac_filter",
    {
      title: "Delete Wi-Fi MAC Filter Entry",
      description: `Delete a Wi-Fi MAC filtering entry.

Args:
  - filter_id (string): The MAC filter entry ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        filter_id: z.string().describe("MAC filter entry ID to delete"),
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
    withErrorHandling(async ({ filter_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/wifi/v1/settings/mac-filtering/${filter_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        filter_id,
        message: `Wi-Fi MAC filter ${filter_id} deleted.`,
      });
    })
  );
}
