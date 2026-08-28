/**
 * Tools: sophos_list_audit_events
 * Interact with the Sophos Audit Events API /audit/v1/ (global host).
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerAuditEventTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List Audit Events ---
  server.registerTool(
    "sophos_list_audit_events",
    {
      title: "List Sophos Central Audit Events",
      description: `List audit events (who did what in Sophos Central).

Covers administrative activity across Sophos Central: sign-ins, policy and
settings changes, and API activity. Events are retained for 90 days; the
start date must be within that window. Cursor-paginated via page_from_key.

Scoping: pass tenant_id to query one tenant's audit trail. Omit it to query
at the caller's own level (partner, organization, or tenant depending on the
credentials).

Args:
  - start_date (string): Start date (ISO 8601), no earlier than 90 days ago.
  - end_date (string, optional): Up to this end date (ISO 8601).
  - origin_ip_address (string, optional): Filter by origin IP address.
  - modified_by (string, optional): Filter by modifier's email.
  - modifier_account_id (string, optional): Filter by modifier account ID.
  - resource_owner_id (string, optional): Filter by resource owner ID.
  - page_from_key (string, optional): Cursor key from a previous response.
  - limit (number, optional): Max results per page (1-100, default 50).
  - tenant_id (string, optional): Tenant ID to scope the query to one tenant.`,
      inputSchema: {
        start_date: z
          .string()
          .describe("Start date (ISO 8601), no earlier than 90 days ago"),
        end_date: z.string().optional().describe("Up to this end date (ISO 8601)"),
        origin_ip_address: z
          .string()
          .optional()
          .describe("Filter by origin IP address"),
        modified_by: z.string().optional().describe("Filter by modifier's email"),
        modifier_account_id: z
          .string()
          .optional()
          .describe("Filter by modifier account ID"),
        resource_owner_id: z
          .string()
          .optional()
          .describe("Filter by resource owner ID"),
        page_from_key: z
          .string()
          .optional()
          .describe("Cursor key from a previous response"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Max results per page (default 50)"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID to scope the query to one tenant"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(
      async ({
        start_date,
        end_date,
        origin_ip_address,
        modified_by,
        modifier_account_id,
        resource_owner_id,
        page_from_key,
        limit,
        tenant_id,
      }) => {
        const params: Record<string, string> = {
          startDate: start_date,
          pageSize: String(limit),
        };
        if (end_date) params.endDate = end_date;
        if (origin_ip_address) params.originIpAddress = origin_ip_address;
        if (modified_by) params.modifiedBy = modified_by;
        if (modifier_account_id) params.modifierAccountId = modifier_account_id;
        if (resource_owner_id) params.resourceOwnerId = resource_owner_id;
        if (page_from_key) params.pageFromKey = page_from_key;

        const data = await client.globalRequest<Record<string, unknown>>(
          "/audit/v1/audit-events",
          {
            params,
            ...(tenant_id ? { headers: { "X-Tenant-ID": tenant_id } } : {}),
          }
        );
        return jsonResult(data);
      }
    )
  );
}
