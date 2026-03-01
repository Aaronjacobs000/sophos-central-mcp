/**
 * Tool: sophos_list_tenants
 * Lists managed tenants for partner/organization callers.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";

export function registerTenantTools(
  server: McpServer,
  tenantResolver: TenantResolver
): void {
  server.registerTool(
    "sophos_list_tenants",
    {
      title: "List Sophos Tenants",
      description: `List all tenants managed by this partner or organisation account.

Returns tenant IDs, names, data regions, and API hosts. Use the tenant ID from 
this response as the tenant_id parameter in other sophos_ tools.

Only available for partner and organisation-level credentials. Tenant-level 
credentials operate against a single implicit tenant.

Returns:
  Array of tenants with: id, name, dataRegion, dataGeography, apiHost

Examples:
  - "Show me all my Sophos tenants"
  - "Which tenants are in the EU region?"`,
      inputSchema: {
        name_filter: z
          .string()
          .optional()
          .describe(
            "Optional: filter tenants by name (case-insensitive substring match)"
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ name_filter }) => {
      const tenants = await tenantResolver.loadTenants();

      let filtered = tenants;
      if (name_filter) {
        const lowerFilter = name_filter.toLowerCase();
        filtered = tenants.filter((t) =>
          t.name.toLowerCase().includes(lowerFilter)
        );
      }

      return jsonResult({
        total: filtered.length,
        tenants: filtered.map((t) => ({
          id: t.id,
          name: t.name,
          data_region: t.dataRegion,
          data_geography: t.dataGeography,
          api_host: t.apiHost,
        })),
      });
    })
  );
}
