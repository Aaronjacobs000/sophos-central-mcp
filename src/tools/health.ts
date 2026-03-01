/**
 * Tool: sophos_get_account_health
 * Retrieves account health check scores from the Sophos Common API.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";

export function registerHealthTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  server.registerTool(
    "sophos_get_account_health",
    {
      title: "Get Sophos Account Health",
      description: `Get the account health check scores for a Sophos Central tenant.

Returns protection percentages and status for endpoints and servers,
including policy compliance, exclusion health, and tamper protection status.

Useful for a quick overview of tenant security posture.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Health check object with endpoint/server protection scores and status.`,
      inputSchema: {
        tenant_id: z
          .string()
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
    withErrorHandling(async ({ tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/account-health-check/v1/health-check"
      );
      return jsonResult(data);
    })
  );
}
