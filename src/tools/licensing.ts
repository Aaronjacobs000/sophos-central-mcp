/**
 * Tools: sophos_list_licenses, sophos_list_firewall_licenses
 * Interact with the Sophos Licensing API /licensing/v1/
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";

export function registerLicensingTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List Licenses ---
  server.registerTool(
    "sophos_list_licenses",
    {
      title: "List Software Licenses",
      description: `List software licenses for a Sophos Central tenant.

Returns license details including product name, type, quantity, expiry, and usage.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
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
    withErrorHandling(async ({ tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/licensing/v1/licenses"
      );
      return jsonResult(data);
    })
  );

  // --- List Firewall Licenses ---
  server.registerTool(
    "sophos_list_firewall_licenses",
    {
      title: "List Firewall Licenses",
      description: `List firewall licenses for a Sophos Central tenant.

Returns firewall-specific license details including serial numbers, subscription status, and features.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
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
    withErrorHandling(async ({ tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/licensing/v1/firewall-licenses"
      );
      return jsonResult(data);
    })
  );
}
