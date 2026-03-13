/**
 * Tools: sophos_list_quotes, sophos_get_quote, sophos_get_partner_level
 * Partner business automation tools using globalRequest.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerBusinessAutomationTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // =========================================================================
  // QUOTES
  // =========================================================================

  server.registerTool(
    "sophos_list_quotes",
    {
      title: "List Partner Quotes",
      description: `List quotes for the partner account.

Returns all quotes associated with this partner, including pending,
accepted, and expired quotes.

Args:
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of partner quotes.`,
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
      }>("/partner/v1/quotes", { params });

      const items = data.items ?? [];
      return jsonResult({
        total: data.pages?.total ?? data.pages?.items ?? items.length,
        page: data.pages?.current ?? page,
        quotes: items,
      });
    })
  );

  server.registerTool(
    "sophos_get_quote",
    {
      title: "Get Partner Quote",
      description: `Get details of a specific partner quote.

Args:
  - quote_id (string): Quote ID to retrieve.

Returns:
  Full quote details including line items, pricing, and status.`,
      inputSchema: {
        quote_id: z.string().describe("Quote ID to retrieve"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ quote_id }) => {
      const data = await client.globalRequest<Record<string, unknown>>(
        `/partner/v1/quotes/${quote_id}`
      );

      return jsonResult(data);
    })
  );

  // =========================================================================
  // PARTNER LEVEL
  // =========================================================================

  server.registerTool(
    "sophos_get_partner_level",
    {
      title: "Get Partner Level",
      description: `Get the current partner level/tier information.

Returns the partner's current program level, tier status, and any
associated benefits or requirements.

Returns:
  Partner level details.`,
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
        "/partner/v1/level"
      );

      return jsonResult(data);
    })
  );
}
