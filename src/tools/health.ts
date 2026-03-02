/**
 * Tools: sophos_get_account_health, sophos_list_account_health
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";

const HEALTH_PATH = "/account-health-check/v1/health-check";
const CONCURRENCY = 10;

/**
 * Extracts the minimum overall score from a health check response.
 * Checks both endpoint and server protection globalDetail scores.
 * Returns null if no health data is available.
 */
function extractOverallScore(data: Record<string, unknown> | null): number | null {
  if (!data) return null;
  const scores: number[] = [];
  // Health response structure: data.endpoint.protection.computer.score / .server.score
  const endpoint = data["endpoint"] as Record<string, unknown> | undefined;
  const protection = endpoint?.["protection"] as Record<string, unknown> | undefined;
  for (const deviceType of ["computer", "server"]) {
    const deviceProtection = protection?.[deviceType] as Record<string, unknown> | undefined;
    if (typeof deviceProtection?.["score"] === "number") {
      scores.push(deviceProtection["score"] as number);
    }
  }
  return scores.length > 0 ? Math.min(...scores) : null;
}

export function registerHealthTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  server.registerTool(
    "sophos_get_account_health",
    {
      title: "Get Sophos Account Health",
      description: `Get the account health check scores for a single Sophos Central tenant.

Returns protection percentages and status for endpoints and servers,
including policy compliance, exclusion health, and tamper protection status.

For partner/org callers who need to compare health across multiple tenants,
use sophos_list_account_health instead — it fetches all tenants in parallel.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Health check object with endpoint/server protection scores and status.`,
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
        HEALTH_PATH
      );
      return jsonResult(data);
    })
  );

  // Bulk health tool: only useful for partner/org callers who manage multiple tenants
  if (tenantResolver.getIdentity().idType !== "tenant") {
    server.registerTool(
      "sophos_list_account_health",
      {
        title: "List Account Health for All Tenants",
        description: `Fetch account health scores for all managed tenants in parallel and return a ranked summary.

Use this when you need to compare health across tenants or find tenants with the lowest
scores. Much faster than calling sophos_get_account_health per tenant — fetches all
tenants concurrently server-side in a single tool call.

Results are sorted by overall score ascending (lowest/worst first).
Tenants with no health data (no enrolled products) are listed last.

Args:
  - limit (number, optional): Return only the N lowest-scoring tenants. Useful for
    "show me the 10 worst tenants". Omit to return all tenants.

Returns:
  Array of tenants with their health scores and full health detail, sorted worst-first.`,
        inputSchema: {
          limit: z
            .number()
            .int()
            .min(1)
            .max(500)
            .optional()
            .describe("Return only the N lowest-scoring tenants (default: all)."),
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      withErrorHandling(async ({ limit }) => {
        const tenants = tenantResolver.getCachedTenants();

        // Fetch health for all tenants in parallel batches
        type HealthEntry = {
          tenant_id: string;
          tenant_name: string;
          overall_score: number | null;
          health: Record<string, unknown> | null;
        };

        const results: HealthEntry[] = [];

        for (let i = 0; i < tenants.length; i += CONCURRENCY) {
          const batch = tenants.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.all(
            batch.map(async (tenant) => {
              try {
                const data = await client.tenantRequest<Record<string, unknown>>(
                  tenant.id,
                  HEALTH_PATH
                );
                return {
                  tenant_id: tenant.id,
                  tenant_name: tenant.name,
                  overall_score: extractOverallScore(data),
                  health: data,
                };
              } catch {
                return {
                  tenant_id: tenant.id,
                  tenant_name: tenant.name,
                  overall_score: null,
                  health: null,
                };
              }
            })
          );
          results.push(...batchResults);
        }

        // Sort: lowest score first, null (no data) last
        results.sort((a, b) => {
          if (a.overall_score === null && b.overall_score === null) return 0;
          if (a.overall_score === null) return 1;
          if (b.overall_score === null) return -1;
          return a.overall_score - b.overall_score;
        });

        const limited = limit !== undefined ? results.slice(0, limit) : results;

        return jsonResult({
          total_tenants: tenants.length,
          returned: limited.length,
          tenants: limited,
        });
      })
    );
  }
}
