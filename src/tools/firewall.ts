/**
 * Tools: sophos_list_firewalls, sophos_get_firewall, sophos_update_firewall,
 *        sophos_delete_firewall, sophos_firewall_action,
 *        sophos_check_firmware_upgrade, sophos_start_firmware_upgrade,
 *        sophos_cancel_firmware_upgrade,
 *        sophos_list_firewall_groups, sophos_get_firewall_group,
 *        sophos_create_firewall_group, sophos_update_firewall_group,
 *        sophos_delete_firewall_group,
 *        sophos_get_firewall_sync_status,
 *        sophos_get_threat_feed_settings, sophos_update_threat_feed_settings,
 *        sophos_list_threat_feed_indicators, sophos_search_threat_feed_indicators,
 *        sophos_get_threat_feed_indicator
 * Interact with the Sophos Firewall Management API /firewall/v1/
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import type { SophosPagedResponse } from "../types/sophos.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerFirewallTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // ===== Firewalls =====

  // --- List Firewalls ---
  server.registerTool(
    "sophos_list_firewalls",
    {
      title: "List Sophos Firewalls",
      description: `List managed firewalls in a Sophos Central tenant.

Supports filtering by group and search string. Uses offset-based pagination.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - group_id (string, optional): Filter by firewall group ID.
  - search (string, optional): Search by firewall name or serial number.
  - limit (number, optional): Max results per page (1-100, default 50).
  - page (number, optional): Page number (default 1).`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        group_id: z
          .string()
          .optional()
          .describe("Filter by firewall group ID"),
        search: z
          .string()
          .optional()
          .describe("Search by firewall name or serial number"),
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
    withErrorHandling(async ({ tenant_id, group_id, search, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };

      if (group_id) params.groupId = group_id;
      if (search) params.search = search;

      const data = await client.tenantRequest<SophosPagedResponse<Record<string, unknown>>>(
        resolvedTenantId,
        "/firewall/v1/firewalls",
        { params }
      );

      return jsonResult({
        total: data.pages.total ?? data.pages.items ?? data.items.length,
        page: data.pages.current ?? page,
        firewalls: data.items,
      });
    })
  );

  // --- Get Firewall ---
  server.registerTool(
    "sophos_get_firewall",
    {
      title: "Get Sophos Firewall Detail",
      description: `Get full details of a specific managed firewall by ID.

Returns complete firewall information including status, firmware version,
group membership, and connectivity details.

Args:
  - firewall_id (string): The firewall ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        firewall_id: z.string().uuid().describe("Firewall ID to retrieve"),
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
    withErrorHandling(async ({ firewall_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/firewall/v1/firewalls/${firewall_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Update Firewall ---
  server.registerTool(
    "sophos_update_firewall",
    {
      title: "Update Sophos Firewall",
      description: `Update a managed firewall's name or group assignment.

Args:
  - firewall_id (string): The firewall ID to update.
  - name (string, optional): New firewall name.
  - group_id (string, optional): New group ID to assign the firewall to.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        firewall_id: z.string().uuid().describe("Firewall ID to update"),
        name: z.string().optional().describe("New firewall name"),
        group_id: z
          .string()
          .uuid()
          .optional()
          .describe("New group ID to assign the firewall to"),
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
    withErrorHandling(async ({ firewall_id, name, group_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (group_id !== undefined) body.groupId = group_id;

      if (Object.keys(body).length === 0) {
        return jsonResult({
          error: "No fields to update. Provide at least one of: name, group_id.",
        });
      }

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/firewall/v1/firewalls/${firewall_id}`,
        { method: "PATCH", body }
      );
      return jsonResult({ status: "updated", firewall: data });
    })
  );

  // --- Delete Firewall ---
  server.registerTool(
    "sophos_delete_firewall",
    {
      title: "Delete Sophos Firewall",
      description: `Delete a managed firewall from Sophos Central.

WARNING: This permanently removes the firewall record. The device will need
to be re-registered if you want to manage it again.

Args:
  - firewall_id (string): The firewall ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        firewall_id: z.string().uuid().describe("Firewall ID to delete"),
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
    withErrorHandling(async ({ firewall_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/firewall/v1/firewalls/${firewall_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        firewall_id,
        message: `Firewall ${firewall_id} has been deleted from Sophos Central.`,
      });
    })
  );

  // ===== Firewall Actions =====

  // --- Firewall Action ---
  server.registerTool(
    "sophos_firewall_action",
    {
      title: "Perform Sophos Firewall Action",
      description: `Perform an action on a managed firewall such as reboot, firmware upgrade
check, firmware upgrade, or configuration sync.

Args:
  - firewall_id (string): The firewall ID.
  - action (string): Action to perform: "reboot", "firmware-upgrade-check", "firmware-upgrade", "sync-config".
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        firewall_id: z.string().uuid().describe("Firewall ID"),
        action: z
          .enum(["reboot", "firmware-upgrade-check", "firmware-upgrade", "sync-config"])
          .describe("Action to perform on the firewall"),
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
    withErrorHandling(async ({ firewall_id, action, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/firewall/v1/firewalls/${firewall_id}/action`,
        { method: "POST", body: { action } }
      );
      return jsonResult({
        status: "action_submitted",
        firewall_id,
        action,
        result: data,
      });
    })
  );

  // ===== Firmware =====

  // --- Check Firmware Upgrade ---
  server.registerTool(
    "sophos_check_firmware_upgrade",
    {
      title: "Check Sophos Firewall Firmware Upgrade",
      description: `Check if a firmware upgrade is available for a managed firewall.

Args:
  - firewall_id (string): The firewall ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        firewall_id: z.string().uuid().describe("Firewall ID"),
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
    withErrorHandling(async ({ firewall_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/firewall/v1/firewalls/${firewall_id}/firmware/check`,
        { method: "POST", body: {} }
      );
      return jsonResult(data);
    })
  );

  // --- Start Firmware Upgrade ---
  server.registerTool(
    "sophos_start_firmware_upgrade",
    {
      title: "Start Sophos Firewall Firmware Upgrade",
      description: `Start a firmware upgrade on a managed firewall.

WARNING: This will upgrade the firewall firmware which may cause a brief
service interruption during reboot.

Args:
  - firewall_id (string): The firewall ID.
  - version (string, optional): Target firmware version. If omitted, upgrades to latest.
  - schedule_at (string, optional): ISO 8601 datetime to schedule the upgrade.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        firewall_id: z.string().uuid().describe("Firewall ID"),
        version: z
          .string()
          .optional()
          .describe("Target firmware version (omit for latest)"),
        schedule_at: z
          .string()
          .optional()
          .describe("ISO 8601 datetime to schedule the upgrade"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ firewall_id, version, schedule_at, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const body: Record<string, unknown> = {};
      if (version) body.version = version;
      if (schedule_at) body.scheduleAt = schedule_at;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/firewall/v1/firewalls/${firewall_id}/firmware/upgrade`,
        { method: "POST", body }
      );
      return jsonResult({
        status: "firmware_upgrade_initiated",
        firewall_id,
        result: data,
      });
    })
  );

  // --- Cancel Firmware Upgrade ---
  server.registerTool(
    "sophos_cancel_firmware_upgrade",
    {
      title: "Cancel Sophos Firewall Firmware Upgrade",
      description: `Cancel a scheduled or in-progress firmware upgrade on a managed firewall.

Args:
  - firewall_id (string): The firewall ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        firewall_id: z.string().uuid().describe("Firewall ID"),
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
    withErrorHandling(async ({ firewall_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/firewall/v1/firewalls/${firewall_id}/firmware/upgrade`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "firmware_upgrade_cancelled",
        firewall_id,
        message: `Firmware upgrade cancelled for firewall ${firewall_id}.`,
      });
    })
  );

  // ===== Firewall Groups =====

  // --- List Firewall Groups ---
  server.registerTool(
    "sophos_list_firewall_groups",
    {
      title: "List Sophos Firewall Groups",
      description: `List firewall groups in a Sophos Central tenant.

Firewall groups organise managed firewalls for policy and configuration management.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (1-100, default 50).
  - page (number, optional): Page number (default 1).`,
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

      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };

      const data = await client.tenantRequest<SophosPagedResponse<Record<string, unknown>>>(
        resolvedTenantId,
        "/firewall/v1/firewall-groups",
        { params }
      );

      return jsonResult({
        total: data.pages.total ?? data.pages.items ?? data.items.length,
        page: data.pages.current ?? page,
        groups: data.items,
      });
    })
  );

  // --- Get Firewall Group ---
  server.registerTool(
    "sophos_get_firewall_group",
    {
      title: "Get Sophos Firewall Group Detail",
      description: `Get full details of a firewall group by ID.

Returns group information including name, description, and member firewalls.

Args:
  - group_id (string): The firewall group ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        group_id: z.string().uuid().describe("Firewall group ID"),
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
    withErrorHandling(async ({ group_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/firewall/v1/firewall-groups/${group_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Create Firewall Group ---
  server.registerTool(
    "sophos_create_firewall_group",
    {
      title: "Create Sophos Firewall Group",
      description: `Create a new firewall group for organising managed firewalls.

Args:
  - name (string): Group name.
  - description (string, optional): Group description.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        name: z.string().describe("Firewall group name"),
        description: z
          .string()
          .optional()
          .describe("Firewall group description"),
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
    withErrorHandling(async ({ name, description, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const body: Record<string, unknown> = { name };
      if (description) body.description = description;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/firewall/v1/firewall-groups",
        { method: "POST", body }
      );
      return jsonResult({ status: "created", group: data });
    })
  );

  // --- Update Firewall Group ---
  server.registerTool(
    "sophos_update_firewall_group",
    {
      title: "Update Sophos Firewall Group",
      description: `Update an existing firewall group's name or description.

Args:
  - group_id (string): Group ID to update.
  - name (string, optional): New group name.
  - description (string, optional): New group description.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        group_id: z.string().uuid().describe("Firewall group ID to update"),
        name: z.string().optional().describe("New group name"),
        description: z.string().optional().describe("New group description"),
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
    withErrorHandling(async ({ group_id, name, description, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (description !== undefined) body.description = description;

      if (Object.keys(body).length === 0) {
        return jsonResult({
          error: "No fields to update. Provide at least one of: name, description.",
        });
      }

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/firewall/v1/firewall-groups/${group_id}`,
        { method: "PATCH", body }
      );
      return jsonResult({ status: "updated", group: data });
    })
  );

  // --- Delete Firewall Group ---
  server.registerTool(
    "sophos_delete_firewall_group",
    {
      title: "Delete Sophos Firewall Group",
      description: `Delete a firewall group.

WARNING: This removes the group. Firewalls in the group are NOT deleted
but will no longer be members of this group.

Args:
  - group_id (string): Group ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        group_id: z.string().uuid().describe("Firewall group ID to delete"),
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
    withErrorHandling(async ({ group_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/firewall/v1/firewall-groups/${group_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        group_id,
        message: `Firewall group ${group_id} has been deleted.`,
      });
    })
  );

  // ===== Firewall Sync Status =====

  // --- Get Firewall Sync Status ---
  server.registerTool(
    "sophos_get_firewall_sync_status",
    {
      title: "Get Sophos Firewall Sync Status",
      description: `Get the configuration sync status of a managed firewall.

Returns whether the firewall's configuration is in sync with Sophos Central.

Args:
  - firewall_id (string): The firewall ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        firewall_id: z.string().uuid().describe("Firewall ID"),
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
    withErrorHandling(async ({ firewall_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/firewall/v1/firewalls/${firewall_id}/sync-status`
      );
      return jsonResult(data);
    })
  );

  // ===== MDR Threat Feed =====

  // --- Get Threat Feed Settings ---
  server.registerTool(
    "sophos_get_threat_feed_settings",
    {
      title: "Get MDR Threat Feed Settings",
      description: `Get the MDR threat feed settings for a tenant's firewall integration.

Returns the current configuration for how threat indicators are pushed
to managed firewalls.

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
        "/firewall/v1/threat-feed/settings"
      );
      return jsonResult(data);
    })
  );

  // --- Update Threat Feed Settings ---
  server.registerTool(
    "sophos_update_threat_feed_settings",
    {
      title: "Update MDR Threat Feed Settings",
      description: `Update the MDR threat feed settings for a tenant's firewall integration.

Args:
  - settings (object): Settings object to update (passed directly to the API).
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        settings: z
          .record(z.unknown())
          .describe("Settings object to update"),
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
    withErrorHandling(async ({ settings, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/firewall/v1/threat-feed/settings",
        { method: "PATCH", body: settings }
      );
      return jsonResult({ status: "updated", settings: data });
    })
  );

  // --- List Threat Feed Indicators ---
  server.registerTool(
    "sophos_list_threat_feed_indicators",
    {
      title: "List MDR Threat Feed Indicators",
      description: `List threat feed indicators for a tenant's firewall integration.

Returns threat indicators (IPs, domains, URLs) that are pushed to managed
firewalls for blocking.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (1-100, default 50).
  - page (number, optional): Page number (default 1).`,
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

      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };

      const data = await client.tenantRequest<SophosPagedResponse<Record<string, unknown>>>(
        resolvedTenantId,
        "/firewall/v1/threat-feed/indicators",
        { params }
      );

      return jsonResult({
        total: data.pages.total ?? data.pages.items ?? data.items.length,
        page: data.pages.current ?? page,
        indicators: data.items,
      });
    })
  );

  // --- Search Threat Feed Indicators ---
  server.registerTool(
    "sophos_search_threat_feed_indicators",
    {
      title: "Search MDR Threat Feed Indicators",
      description: `Search threat feed indicators with filters and sorting.

Performs a server-side search across threat indicators using filter criteria.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - filter (object, optional): Filter criteria object.
  - sort (array, optional): Sort criteria array.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        filter: z
          .record(z.unknown())
          .optional()
          .describe("Filter criteria object"),
        sort: z
          .array(z.unknown())
          .optional()
          .describe("Sort criteria array"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, filter, sort }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

      const body: Record<string, unknown> = {};
      if (filter) body.filter = filter;
      if (sort) body.sort = sort;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/firewall/v1/threat-feed/indicators/search",
        { method: "POST", body }
      );
      return jsonResult(data);
    })
  );

  // --- Get Threat Feed Indicator ---
  server.registerTool(
    "sophos_get_threat_feed_indicator",
    {
      title: "Get MDR Threat Feed Indicator",
      description: `Get a specific threat feed indicator by ID.

Returns full details of a single threat indicator including type, value,
severity, and associated metadata.

Args:
  - indicator_id (string): The indicator ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        indicator_id: z.string().uuid().describe("Threat feed indicator ID"),
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
    withErrorHandling(async ({ indicator_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/firewall/v1/threat-feed/indicators/${indicator_id}`
      );
      return jsonResult(data);
    })
  );
}
