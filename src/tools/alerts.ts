/**
 * Tools: sophos_list_alerts, sophos_get_alert, sophos_acknowledge_alert
 * Interact with the Sophos Common API /common/v1/alerts
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import type { SophosAlertPage, SophosAlert } from "../types/sophos.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerAlertTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List Alerts ---
  server.registerTool(
    "sophos_list_alerts",
    {
      title: "List Sophos Alerts",
      description: `List alerts from a Sophos Central tenant with optional filtering.

Retrieves alerts from the Common API with filtering by severity, category,
product, and date range. Results are paginated.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - severity (string, optional): Filter by severity: "high", "medium", "low".
  - category (string, optional): Filter by category e.g. "malware", "policy", "runtimeDetections", "updating".
  - product (string, optional): Filter by product e.g. "endpoint", "server", "firewall", "email".
  - from_date (string, optional): ISO 8601 start date e.g. "2025-01-01T00:00:00Z".
  - limit (number, optional): Max results per page (1-100, default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of alerts with: id, severity, category, description, product, raisedAt, managedAgent, allowedActions.`,
      inputSchema: {
        tenant_id: z
          .string()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        severity: z
          .string()
          .optional()
          .describe('Filter by severity: "high", "medium", "low"'),
        category: z
          .string()
          .optional()
          .describe("Filter by alert category"),
        product: z
          .string()
          .optional()
          .describe('Filter by product: "endpoint", "server", etc.'),
        from_date: z
          .string()
          .optional()
          .describe("ISO 8601 start date filter"),
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
    withErrorHandling(
      async ({ tenant_id, severity, category, product, from_date, limit, page }) => {
        const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

        const params: Record<string, string> = {
          pageSize: String(limit),
          page: String(page),
        };

        if (severity) params.severity = severity;
        if (category) params.category = category;
        if (product) params.product = product;
        if (from_date) params.from = from_date;

        const data = await client.tenantRequest<SophosAlertPage>(
          resolvedTenantId,
          "/common/v1/alerts",
          { params }
        );

        return jsonResult({
          total: data.pages.total ?? data.pages.items ?? data.items.length,
          page: data.pages.current ?? page,
          page_size: data.pages.size,
          total_pages: data.pages.total,
          alerts: data.items.map(formatAlert),
        });
      }
    )
  );

  // --- Get Alert ---
  server.registerTool(
    "sophos_get_alert",
    {
      title: "Get Sophos Alert Detail",
      description: `Get full details of a specific Sophos Central alert by ID.

Returns complete alert information including description, severity, category,
product, managed agent details, and allowed actions (e.g. acknowledge, cleanPua).

Args:
  - alert_id (string): The alert ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        alert_id: z.string().describe("Alert ID to retrieve"),
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
    withErrorHandling(async ({ alert_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const alert = await client.tenantRequest<SophosAlert>(
        resolvedTenantId,
        `/common/v1/alerts/${alert_id}`
      );
      return jsonResult(formatAlert(alert));
    })
  );

  // --- Acknowledge Alert ---
  server.registerTool(
    "sophos_acknowledge_alert",
    {
      title: "Acknowledge Sophos Alert",
      description: `Acknowledge a Sophos Central alert, marking it as reviewed.

This is a write action that changes the alert status. The alert must have
"acknowledge" in its allowedActions list. Use sophos_get_alert first to check.

Args:
  - alert_id (string): The alert ID to acknowledge.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        alert_id: z.string().describe("Alert ID to acknowledge"),
        tenant_id: z
          .string()
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
    withErrorHandling(async ({ alert_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/common/v1/alerts/${alert_id}/actions`,
        {
          method: "POST",
          body: { action: "acknowledge" },
        }
      );
      return jsonResult({
        status: "acknowledged",
        alert_id,
        message: `Alert ${alert_id} has been acknowledged.`,
      });
    })
  );
}

function formatAlert(alert: SophosAlert) {
  return {
    id: alert.id,
    severity: alert.severity,
    category: alert.category,
    description: alert.description,
    type: alert.type,
    product: alert.product,
    raised_at: alert.raisedAt,
    managed_agent: alert.managedAgent
      ? { id: alert.managedAgent.id, type: alert.managedAgent.type }
      : null,
    person_id: alert.person?.id ?? null,
    tenant_id: alert.tenant.id,
    tenant_name: alert.tenant.name ?? null,
    allowed_actions: alert.allowedActions,
  };
}
