/**
 * Tools: sophos_list_policies, sophos_get_policy, sophos_update_policy, sophos_clone_policy
 * Interact with the Sophos Endpoint API /endpoint/v1/policies
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import type { SophosPagedResponse } from "../types/sophos.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

interface SophosPolicy {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  enforced: boolean;
  createdAt?: string;
  updatedAt?: string;
  appliesTo?: {
    usersAndGroups?: Array<{ id: string; name?: string; type: string }>;
    endpoints?: Array<{ id: string; name?: string; type: string }>;
    endpointGroups?: Array<{ id: string; name?: string }>;
  };
  settings?: Record<string, unknown>;
  lockedByManagingAccount?: boolean;
}

export function registerPolicyTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List Policies ---
  server.registerTool(
    "sophos_list_policies",
    {
      title: "List Sophos Endpoint Policies",
      description: `List endpoint protection policies for a Sophos Central tenant.

Returns all configured policies including threat protection, peripheral control, 
application control, data loss prevention, web control, update management, and more.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - policy_type (string, optional): Filter by type e.g. "threat-protection", 
    "peripheral-control", "application-control", "data-loss-prevention", 
    "web-control", "update-management", "windows-firewall", "server-threat-protection",
    "server-lockdown".
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of policies with: id, name, type, enabled, priority, enforced,
  appliesTo (users/groups/endpoints/endpoint groups).`,
      inputSchema: {
        tenant_id: z
          .string()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        policy_type: z
          .string()
          .optional()
          .describe(
            'Filter by policy type e.g. "threat-protection", "peripheral-control", "web-control"'
          ),
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
    withErrorHandling(async ({ tenant_id, policy_type, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };

      if (policy_type) params.policyType = policy_type;

      const data = await client.tenantRequest<SophosPagedResponse<SophosPolicy>>(
        resolvedTenantId,
        "/endpoint/v1/policies",
        { params }
      );

      return jsonResult({
        total: data.pages.total ?? data.pages.items ?? data.items.length,
        page: data.pages.current ?? page,
        policies: data.items.map(formatPolicy),
      });
    })
  );

  // --- Get Policy ---
  server.registerTool(
    "sophos_get_policy",
    {
      title: "Get Sophos Policy Detail",
      description: `Get full details of a specific endpoint policy including all settings.

Returns the complete policy configuration, assignments, and individual settings.

Args:
  - policy_id (string): The policy ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        policy_id: z.string().describe("Policy ID to retrieve"),
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
    withErrorHandling(async ({ policy_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const policy = await client.tenantRequest<SophosPolicy>(
        resolvedTenantId,
        `/endpoint/v1/policies/${policy_id}`
      );
      return jsonResult(formatPolicyDetailed(policy));
    })
  );

  // --- Update Policy ---
  server.registerTool(
    "sophos_update_policy",
    {
      title: "Update Sophos Policy",
      description: `Update an endpoint policy's properties or settings.

WARNING: This modifies the policy configuration which affects all assigned 
endpoints. Changes take effect on next agent check-in.

Supports updating: name, enabled state, priority, enforcement, and individual 
settings. Pass only the fields you want to change.

Args:
  - policy_id (string): The policy ID to update.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - name (string, optional): New policy name.
  - enabled (boolean, optional): Enable/disable the policy.
  - priority (number, optional): Policy priority (lower = higher priority).
  - enforced (boolean, optional): Whether policy settings are enforced (cannot be overridden by lower-priority policies).
  - settings (object, optional): Policy settings object to merge. Only include settings you want to change.`,
      inputSchema: {
        policy_id: z.string().describe("Policy ID to update"),
        tenant_id: z
          .string()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        name: z.string().optional().describe("New policy name"),
        enabled: z.boolean().optional().describe("Enable or disable the policy"),
        priority: z
          .number()
          .int()
          .optional()
          .describe("Policy priority (lower = higher priority)"),
        enforced: z
          .boolean()
          .optional()
          .describe("Whether policy settings are enforced"),
        settings: z
          .record(z.unknown())
          .optional()
          .describe("Policy settings to update (partial merge)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(
      async ({ policy_id, tenant_id, name, enabled, priority, enforced, settings }) => {
        const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (enabled !== undefined) body.enabled = enabled;
        if (priority !== undefined) body.priority = priority;
        if (enforced !== undefined) body.enforced = enforced;
        if (settings !== undefined) body.settings = settings;

        if (Object.keys(body).length === 0) {
          return jsonResult({
            error: "No fields to update. Provide at least one of: name, enabled, priority, enforced, settings.",
          });
        }

        const updated = await client.tenantRequest<SophosPolicy>(
          resolvedTenantId,
          `/endpoint/v1/policies/${policy_id}`,
          { method: "PATCH", body }
        );

        return jsonResult({
          status: "updated",
          policy: formatPolicy(updated),
        });
      }
    )
  );

  // --- Clone Policy ---
  server.registerTool(
    "sophos_clone_policy",
    {
      title: "Clone Sophos Policy",
      description: `Create a new policy by cloning an existing one.

Creates a copy of the source policy with a new name. The cloned policy starts 
as disabled and inherits all settings from the source. Useful for creating 
variants of existing policies.

Args:
  - source_policy_id (string): The policy ID to clone.
  - name (string): Name for the new cloned policy.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        source_policy_id: z.string().describe("Policy ID to clone from"),
        name: z.string().describe("Name for the cloned policy"),
        tenant_id: z
          .string()
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
    withErrorHandling(async ({ source_policy_id, name, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const created = await client.tenantRequest<SophosPolicy>(
        resolvedTenantId,
        `/endpoint/v1/policies/${source_policy_id}/clone`,
        { method: "POST", body: { name } }
      );

      return jsonResult({
        status: "cloned",
        policy: formatPolicy(created),
      });
    })
  );
}

function formatPolicy(p: SophosPolicy) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    enabled: p.enabled,
    priority: p.priority,
    enforced: p.enforced,
    locked_by_partner: p.lockedByManagingAccount ?? false,
    created_at: p.createdAt ?? null,
    updated_at: p.updatedAt ?? null,
    applies_to: {
      users_and_groups: p.appliesTo?.usersAndGroups?.length ?? 0,
      endpoints: p.appliesTo?.endpoints?.length ?? 0,
      endpoint_groups: p.appliesTo?.endpointGroups?.length ?? 0,
    },
  };
}

function formatPolicyDetailed(p: SophosPolicy) {
  return {
    ...formatPolicy(p),
    applies_to_detail: {
      users_and_groups:
        p.appliesTo?.usersAndGroups?.map((u) => ({
          id: u.id,
          name: u.name ?? null,
          type: u.type,
        })) ?? [],
      endpoints:
        p.appliesTo?.endpoints?.map((e) => ({
          id: e.id,
          name: e.name ?? null,
          type: e.type,
        })) ?? [],
      endpoint_groups:
        p.appliesTo?.endpointGroups?.map((g) => ({
          id: g.id,
          name: g.name ?? null,
        })) ?? [],
    },
    settings: p.settings ?? {},
  };
}
