/**
 * Tools: Endpoint Settings — installer downloads, blocked addresses, web control,
 *        tamper protection, exploit mitigation, IPS/isolation exclusions,
 *        peripheral control, event journal, update management, lockdown, MTR.
 *
 * 38 tools covering the Sophos Central /endpoint/v1/settings/* and /endpoint/v1/downloads APIs.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import type { SophosPagedResponse } from "../types/sophos.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerEndpointSettingsTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // =========================================================================
  // INSTALLER DOWNLOADS
  // =========================================================================

  server.registerTool(
    "sophos_list_installer_downloads",
    {
      title: "List Sophos Installer Downloads",
      description: `List available Sophos endpoint installer packages for a tenant.

Returns download links for Windows, macOS, and Linux installers in various formats.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  List of available installer packages with download URLs.`,
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
        "/endpoint/v1/downloads",
        {}
      );
      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_get_installer_download",
    {
      title: "Get Sophos Installer Download",
      description: `Get a specific installer download link by ID.

Returns the download URL and metadata for a particular installer package.

Args:
  - download_id (string): The installer download ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        download_id: z.string().uuid().describe("Installer download ID"),
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
    withErrorHandling(async ({ download_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/endpoint/v1/downloads/${download_id}`,
        {}
      );
      return jsonResult(data);
    })
  );

  // =========================================================================
  // BLOCKED NETWORK ADDRESSES
  // =========================================================================

  server.registerTool(
    "sophos_list_blocked_addresses",
    {
      title: "List Sophos Blocked Network Addresses",
      description: `List blocked network addresses (IPs and domains) for a tenant.

These are network-level blocks applied across all endpoints.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of blocked addresses with type, value, and comment.`,
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
      const data = await client.tenantRequest<
        SophosPagedResponse<Record<string, unknown>>
      >(resolvedTenantId, "/endpoint/v1/settings/blocked-addresses", {
        params: { pageSize: String(limit), page: String(page) },
      });
      return jsonResult({
        total: data.pages?.total ?? data.pages?.items ?? data.items.length,
        page: data.pages?.current ?? page,
        items: data.items,
      });
    })
  );

  server.registerTool(
    "sophos_add_blocked_address",
    {
      title: "Add Sophos Blocked Network Address",
      description: `Add a blocked network address (IP or domain) across all endpoints.

Args:
  - type (string): Address type: "ip" or "domain".
  - value (string): The IP address or domain to block.
  - comment (string, optional): Reason for blocking.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        type: z.string().describe('Address type: "ip" or "domain"'),
        value: z.string().describe("IP address or domain to block"),
        comment: z.string().optional().describe("Reason for blocking"),
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
    withErrorHandling(async ({ type, value, comment, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { type, value };
      if (comment) body.comment = comment;

      const created = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/blocked-addresses",
        { method: "POST", body }
      );
      return jsonResult({ status: "created", address: created });
    })
  );

  server.registerTool(
    "sophos_delete_blocked_address",
    {
      title: "Delete Sophos Blocked Network Address",
      description: `Delete a blocked network address by ID.

Args:
  - address_id (string): Blocked address ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        address_id: z.string().uuid().describe("Blocked address ID to delete"),
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
    withErrorHandling(async ({ address_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/endpoint/v1/settings/blocked-addresses/${address_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        address_id,
        message: `Blocked address ${address_id} deleted.`,
      });
    })
  );

  // =========================================================================
  // WEB CONTROL - LOCAL SITES
  // =========================================================================

  server.registerTool(
    "sophos_list_local_sites",
    {
      title: "List Sophos Web Control Local Sites",
      description: `List local site definitions for web control.

Local sites allow you to categorize internal or custom URLs for web control policies.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of local sites with URL, category, and tags.`,
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
      const data = await client.tenantRequest<
        SophosPagedResponse<Record<string, unknown>>
      >(resolvedTenantId, "/endpoint/v1/settings/web-control/local-sites", {
        params: { pageSize: String(limit), page: String(page) },
      });
      return jsonResult({
        total: data.pages?.total ?? data.pages?.items ?? data.items.length,
        page: data.pages?.current ?? page,
        items: data.items,
      });
    })
  );

  server.registerTool(
    "sophos_add_local_site",
    {
      title: "Add Sophos Web Control Local Site",
      description: `Add a local site definition for web control.

Assigns a URL to a web control category so policies can allow/block/warn on it.

Args:
  - url (string): The URL pattern to categorize.
  - categoryId (number): Web control category ID (use sophos_list_web_control_categories to find IDs).
  - comment (string, optional): Description or notes.
  - tags (string[], optional): Tags for organizing sites.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        url: z.string().describe("URL pattern to categorize"),
        categoryId: z.number().int().describe("Web control category ID"),
        comment: z.string().optional().describe("Description or notes"),
        tags: z.array(z.string()).optional().describe("Tags for organizing sites"),
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
    withErrorHandling(async ({ url, categoryId, comment, tags, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { url, categoryId };
      if (comment) body.comment = comment;
      if (tags) body.tags = tags;

      const created = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/web-control/local-sites",
        { method: "POST", body }
      );
      return jsonResult({ status: "created", site: created });
    })
  );

  server.registerTool(
    "sophos_update_local_site",
    {
      title: "Update Sophos Web Control Local Site",
      description: `Update a local site definition for web control.

Modify the URL, category, comment, or tags of an existing local site.

Args:
  - site_id (string): Local site ID to update.
  - url (string, optional): Updated URL pattern.
  - categoryId (number, optional): Updated web control category ID.
  - comment (string, optional): Updated description.
  - tags (string[], optional): Updated tags.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        site_id: z.string().uuid().describe("Local site ID to update"),
        url: z.string().optional().describe("Updated URL pattern"),
        categoryId: z.number().int().optional().describe("Updated web control category ID"),
        comment: z.string().optional().describe("Updated description"),
        tags: z.array(z.string()).optional().describe("Updated tags"),
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
    withErrorHandling(async ({ site_id, url, categoryId, comment, tags, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (url !== undefined) body.url = url;
      if (categoryId !== undefined) body.categoryId = categoryId;
      if (comment !== undefined) body.comment = comment;
      if (tags !== undefined) body.tags = tags;

      const updated = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/endpoint/v1/settings/web-control/local-sites/${site_id}`,
        { method: "PATCH", body }
      );
      return jsonResult({ status: "updated", site: updated });
    })
  );

  server.registerTool(
    "sophos_delete_local_site",
    {
      title: "Delete Sophos Web Control Local Site",
      description: `Delete a local site definition from web control.

Args:
  - site_id (string): Local site ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        site_id: z.string().uuid().describe("Local site ID to delete"),
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
    withErrorHandling(async ({ site_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/endpoint/v1/settings/web-control/local-sites/${site_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        site_id,
        message: `Local site ${site_id} deleted.`,
      });
    })
  );

  // =========================================================================
  // WEB CONTROL - CATEGORIES
  // =========================================================================

  server.registerTool(
    "sophos_list_web_control_categories",
    {
      title: "List Sophos Web Control Categories",
      description: `List all web control categories available for classifying websites.

Returns category IDs and names used when adding local sites or configuring web policies.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  List of web control categories with IDs and names.`,
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
        "/endpoint/v1/settings/web-control/categories",
        {}
      );
      return jsonResult(data);
    })
  );

  // =========================================================================
  // WEB CONTROL - TLS DECRYPTION
  // =========================================================================

  server.registerTool(
    "sophos_get_tls_decryption_settings",
    {
      title: "Get Sophos TLS Decryption Settings",
      description: `Get the current TLS decryption settings for web control.

Returns whether TLS decryption is enabled and any configured rules/exclusions.

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
        "/endpoint/v1/settings/web-control/tls-decryption",
        {}
      );
      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_update_tls_decryption_settings",
    {
      title: "Update Sophos TLS Decryption Settings",
      description: `Update TLS decryption settings for web control.

Enable/disable TLS decryption and configure rules for which traffic is decrypted.

Args:
  - enabled (boolean, optional): Whether TLS decryption is enabled.
  - rules (array, optional): Array of TLS decryption rules.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        enabled: z.boolean().optional().describe("Whether TLS decryption is enabled"),
        rules: z
          .array(z.record(z.unknown()))
          .optional()
          .describe("Array of TLS decryption rules"),
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
    withErrorHandling(async ({ enabled, rules, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (enabled !== undefined) body.enabled = enabled;
      if (rules !== undefined) body.rules = rules;

      const updated = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/web-control/tls-decryption",
        { method: "PATCH", body }
      );
      return jsonResult({ status: "updated", settings: updated });
    })
  );

  // =========================================================================
  // GLOBAL TAMPER PROTECTION
  // =========================================================================

  server.registerTool(
    "sophos_get_global_tamper_protection",
    {
      title: "Get Sophos Global Tamper Protection",
      description: `Get the global tamper protection settings for a tenant.

Returns whether tamper protection is globally enabled or disabled.

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
        "/endpoint/v1/settings/tamper-protection",
        {}
      );
      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_update_global_tamper_protection",
    {
      title: "Update Sophos Global Tamper Protection",
      description: `Update the global tamper protection setting for a tenant.

WARNING: Disabling tamper protection makes endpoints vulnerable to malware that
attempts to disable or uninstall Sophos protection.

Args:
  - enabled (boolean): Whether tamper protection should be enabled.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        enabled: z.boolean().describe("Whether tamper protection should be enabled"),
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
    withErrorHandling(async ({ enabled, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const updated = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/tamper-protection",
        { method: "POST", body: { enabled } }
      );
      return jsonResult({ status: "updated", settings: updated });
    })
  );

  // =========================================================================
  // EXPLOIT MITIGATION - DETECTED EXPLOITS
  // =========================================================================

  server.registerTool(
    "sophos_list_detected_exploits",
    {
      title: "List Sophos Detected Exploits",
      description: `List detected exploits across endpoints in the tenant.

Returns exploit events that have been detected and mitigated by exploit protection.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of detected exploits with details.`,
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
      const data = await client.tenantRequest<
        SophosPagedResponse<Record<string, unknown>>
      >(
        resolvedTenantId,
        "/endpoint/v1/settings/exploit-mitigation/detected-exploits",
        { params: { pageSize: String(limit), page: String(page) } }
      );
      return jsonResult({
        total: data.pages?.total ?? data.pages?.items ?? data.items.length,
        page: data.pages?.current ?? page,
        items: data.items,
      });
    })
  );

  server.registerTool(
    "sophos_get_detected_exploit",
    {
      title: "Get Sophos Detected Exploit",
      description: `Get details of a specific detected exploit by ID.

Args:
  - exploit_id (string): Detected exploit ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        exploit_id: z.string().uuid().describe("Detected exploit ID"),
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
    withErrorHandling(async ({ exploit_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/endpoint/v1/settings/exploit-mitigation/detected-exploits/${exploit_id}`,
        {}
      );
      return jsonResult(data);
    })
  );

  // =========================================================================
  // EXPLOIT MITIGATION - CATEGORIES
  // =========================================================================

  server.registerTool(
    "sophos_list_exploit_mitigation_categories",
    {
      title: "List Sophos Exploit Mitigation Categories",
      description: `List exploit mitigation categories.

Returns the categories used to classify exploit mitigation techniques and applications.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of exploit mitigation categories.`,
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
      const data = await client.tenantRequest<
        SophosPagedResponse<Record<string, unknown>>
      >(
        resolvedTenantId,
        "/endpoint/v1/settings/exploit-mitigation/categories",
        { params: { pageSize: String(limit), page: String(page) } }
      );
      return jsonResult({
        total: data.pages?.total ?? data.pages?.items ?? data.items.length,
        page: data.pages?.current ?? page,
        items: data.items,
      });
    })
  );

  server.registerTool(
    "sophos_get_exploit_mitigation_category",
    {
      title: "Get Sophos Exploit Mitigation Category",
      description: `Get details of a specific exploit mitigation category by ID.

Args:
  - category_id (string): Exploit mitigation category ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        category_id: z.string().uuid().describe("Exploit mitigation category ID"),
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
    withErrorHandling(async ({ category_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/endpoint/v1/settings/exploit-mitigation/categories/${category_id}`,
        {}
      );
      return jsonResult(data);
    })
  );

  // =========================================================================
  // EXPLOIT MITIGATION - APPLICATIONS
  // =========================================================================

  server.registerTool(
    "sophos_list_exploit_mitigation_apps",
    {
      title: "List Sophos Exploit Mitigation Applications",
      description: `List applications configured for exploit mitigation.

Returns applications that have exploit mitigation protection applied.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of exploit mitigation applications.`,
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
      const data = await client.tenantRequest<
        SophosPagedResponse<Record<string, unknown>>
      >(
        resolvedTenantId,
        "/endpoint/v1/settings/exploit-mitigation/applications",
        { params: { pageSize: String(limit), page: String(page) } }
      );
      return jsonResult({
        total: data.pages?.total ?? data.pages?.items ?? data.items.length,
        page: data.pages?.current ?? page,
        items: data.items,
      });
    })
  );

  server.registerTool(
    "sophos_get_exploit_mitigation_app",
    {
      title: "Get Sophos Exploit Mitigation Application",
      description: `Get details of a specific exploit mitigation application by ID.

Args:
  - app_id (string): Exploit mitigation application ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        app_id: z.string().uuid().describe("Exploit mitigation application ID"),
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
    withErrorHandling(async ({ app_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/endpoint/v1/settings/exploit-mitigation/applications/${app_id}`,
        {}
      );
      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_add_exploit_mitigation_app",
    {
      title: "Add Sophos Exploit Mitigation Application",
      description: `Add an application to exploit mitigation protection.

Specify one or more executable paths to protect with exploit mitigation.

Args:
  - paths (string[]): Array of executable paths to protect.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        paths: z
          .array(z.string())
          .describe("Array of executable paths to protect"),
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
    withErrorHandling(async ({ paths, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const created = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/exploit-mitigation/applications",
        { method: "POST", body: { paths } }
      );
      return jsonResult({ status: "created", application: created });
    })
  );

  server.registerTool(
    "sophos_update_exploit_mitigation_app",
    {
      title: "Update Sophos Exploit Mitigation Application",
      description: `Update an exploit mitigation application configuration.

Modify paths or settings for an application under exploit mitigation.

Args:
  - app_id (string): Exploit mitigation application ID to update.
  - paths (string[], optional): Updated executable paths.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        app_id: z.string().uuid().describe("Exploit mitigation application ID to update"),
        paths: z
          .array(z.string())
          .optional()
          .describe("Updated executable paths"),
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
    withErrorHandling(async ({ app_id, paths, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (paths !== undefined) body.paths = paths;

      const updated = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/endpoint/v1/settings/exploit-mitigation/applications/${app_id}`,
        { method: "PATCH", body }
      );
      return jsonResult({ status: "updated", application: updated });
    })
  );

  // =========================================================================
  // IPS EXCLUSIONS (INTRUSION PREVENTION)
  // =========================================================================

  server.registerTool(
    "sophos_list_ips_exclusions",
    {
      title: "List Sophos IPS Exclusions",
      description: `List intrusion prevention system (IPS) exclusions.

Returns addresses excluded from IPS inspection. Use sparingly as exclusions
reduce network protection.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of IPS exclusions with direction, address, and comment.`,
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
      const data = await client.tenantRequest<
        SophosPagedResponse<Record<string, unknown>>
      >(
        resolvedTenantId,
        "/endpoint/v1/settings/exclusions/intrusion-prevention",
        { params: { pageSize: String(limit), page: String(page) } }
      );
      return jsonResult({
        total: data.pages?.total ?? data.pages?.items ?? data.items.length,
        page: data.pages?.current ?? page,
        items: data.items,
      });
    })
  );

  server.registerTool(
    "sophos_add_ips_exclusion",
    {
      title: "Add Sophos IPS Exclusion",
      description: `Add an intrusion prevention system (IPS) exclusion.

WARNING: IPS exclusions reduce network protection. Only add exclusions for
trusted addresses that are causing false positives.

Args:
  - direction (string): Traffic direction: "in", "out", or "both".
  - remoteAddress (string): Remote IP address or CIDR range to exclude.
  - comment (string, optional): Reason for the exclusion.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        direction: z.string().describe('Traffic direction: "in", "out", or "both"'),
        remoteAddress: z.string().describe("Remote IP address or CIDR range to exclude"),
        comment: z.string().optional().describe("Reason for the exclusion"),
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
    withErrorHandling(async ({ direction, remoteAddress, comment, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { direction, remoteAddress };
      if (comment) body.comment = comment;

      const created = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/exclusions/intrusion-prevention",
        { method: "POST", body }
      );
      return jsonResult({ status: "created", exclusion: created });
    })
  );

  server.registerTool(
    "sophos_delete_ips_exclusion",
    {
      title: "Delete Sophos IPS Exclusion",
      description: `Delete an IPS exclusion by ID, restoring IPS inspection for that address.

Args:
  - exclusion_id (string): IPS exclusion ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        exclusion_id: z.string().uuid().describe("IPS exclusion ID to delete"),
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
    withErrorHandling(async ({ exclusion_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/endpoint/v1/settings/exclusions/intrusion-prevention/${exclusion_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        exclusion_id,
        message: `IPS exclusion ${exclusion_id} deleted.`,
      });
    })
  );

  // =========================================================================
  // ISOLATION EXCLUSIONS
  // =========================================================================

  server.registerTool(
    "sophos_list_isolation_exclusions",
    {
      title: "List Sophos Isolation Exclusions",
      description: `List isolation exclusions — addresses that remain reachable when an endpoint is isolated.

These allow critical services (e.g. domain controllers, update servers) to remain
accessible even when an endpoint is network-isolated.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of isolation exclusions.`,
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
      const data = await client.tenantRequest<
        SophosPagedResponse<Record<string, unknown>>
      >(resolvedTenantId, "/endpoint/v1/settings/exclusions/isolation", {
        params: { pageSize: String(limit), page: String(page) },
      });
      return jsonResult({
        total: data.pages?.total ?? data.pages?.items ?? data.items.length,
        page: data.pages?.current ?? page,
        items: data.items,
      });
    })
  );

  server.registerTool(
    "sophos_add_isolation_exclusion",
    {
      title: "Add Sophos Isolation Exclusion",
      description: `Add an isolation exclusion so an address remains reachable during endpoint isolation.

Use this for critical infrastructure (domain controllers, update servers, etc.)
that must remain accessible even when an endpoint is isolated.

Args:
  - type (string): Address type: "ip" or "domain".
  - value (string): IP address or domain to allow during isolation.
  - comment (string, optional): Reason for the exclusion.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        type: z.string().describe('Address type: "ip" or "domain"'),
        value: z.string().describe("IP address or domain to allow during isolation"),
        comment: z.string().optional().describe("Reason for the exclusion"),
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
    withErrorHandling(async ({ type, value, comment, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { type, value };
      if (comment) body.comment = comment;

      const created = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/exclusions/isolation",
        { method: "POST", body }
      );
      return jsonResult({ status: "created", exclusion: created });
    })
  );

  server.registerTool(
    "sophos_delete_isolation_exclusion",
    {
      title: "Delete Sophos Isolation Exclusion",
      description: `Delete an isolation exclusion by ID.

Args:
  - exclusion_id (string): Isolation exclusion ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        exclusion_id: z.string().uuid().describe("Isolation exclusion ID to delete"),
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
    withErrorHandling(async ({ exclusion_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/endpoint/v1/settings/exclusions/isolation/${exclusion_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        exclusion_id,
        message: `Isolation exclusion ${exclusion_id} deleted.`,
      });
    })
  );

  // =========================================================================
  // PERIPHERAL CONTROL SETTINGS
  // =========================================================================

  server.registerTool(
    "sophos_get_peripheral_settings",
    {
      title: "Get Sophos Peripheral Control Settings",
      description: `Get peripheral control settings for a tenant.

Returns the current configuration for USB and peripheral device control.

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
        "/endpoint/v1/settings/peripheral-control",
        {}
      );
      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_update_peripheral_settings",
    {
      title: "Update Sophos Peripheral Control Settings",
      description: `Update peripheral control settings for a tenant.

Modify USB and peripheral device control configuration.

Args:
  - settings (object): Peripheral control settings object to apply.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        settings: z
          .record(z.unknown())
          .describe("Peripheral control settings object to apply"),
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
      const updated = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/peripheral-control",
        { method: "PATCH", body: settings }
      );
      return jsonResult({ status: "updated", settings: updated });
    })
  );

  // =========================================================================
  // EVENT JOURNAL SETTINGS
  // =========================================================================

  server.registerTool(
    "sophos_get_event_journal_settings",
    {
      title: "Get Sophos Event Journal Settings",
      description: `Get event journal (data collection) settings for a tenant.

Returns the current configuration for endpoint event data collection and journaling.

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
        "/endpoint/v1/settings/event-journal",
        {}
      );
      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_update_event_journal_settings",
    {
      title: "Update Sophos Event Journal Settings",
      description: `Update event journal (data collection) settings for a tenant.

Modify what endpoint event data is collected and journaled.

Args:
  - settings (object): Event journal settings object to apply.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        settings: z
          .record(z.unknown())
          .describe("Event journal settings object to apply"),
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
      const updated = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/event-journal",
        { method: "PATCH", body: settings }
      );
      return jsonResult({ status: "updated", settings: updated });
    })
  );

  // =========================================================================
  // UPDATE MANAGEMENT SETTINGS
  // =========================================================================

  server.registerTool(
    "sophos_get_update_management_settings",
    {
      title: "Get Sophos Update Management Settings",
      description: `Get update management settings for a tenant.

Returns the current configuration for how endpoint software updates are managed,
including scheduling, bandwidth controls, and update sources.

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
        "/endpoint/v1/settings/update-management",
        {}
      );
      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_update_update_management_settings",
    {
      title: "Update Sophos Update Management Settings",
      description: `Update the update management settings for a tenant.

Modify scheduling, bandwidth controls, or update source configuration.

Args:
  - settings (object): Update management settings object to apply.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        settings: z
          .record(z.unknown())
          .describe("Update management settings object to apply"),
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
      const updated = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/update-management",
        { method: "PATCH", body: settings }
      );
      return jsonResult({ status: "updated", settings: updated });
    })
  );

  // =========================================================================
  // LOCKDOWN SETTINGS
  // =========================================================================

  server.registerTool(
    "sophos_get_lockdown_settings",
    {
      title: "Get Sophos Server Lockdown Settings",
      description: `Get server lockdown settings for a tenant.

Returns the current configuration for server lockdown, which prevents unauthorized
applications from running on locked-down servers.

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
        "/endpoint/v1/settings/lockdown",
        {}
      );
      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_update_lockdown_settings",
    {
      title: "Update Sophos Server Lockdown Settings",
      description: `Update server lockdown settings for a tenant.

Modify the server lockdown configuration. Server lockdown prevents unauthorized
applications from running on locked-down servers.

Args:
  - settings (object): Lockdown settings object to apply.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        settings: z
          .record(z.unknown())
          .describe("Lockdown settings object to apply"),
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
      const updated = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/lockdown",
        { method: "PATCH", body: settings }
      );
      return jsonResult({ status: "updated", settings: updated });
    })
  );

  // =========================================================================
  // MTR (MDR) SETTINGS
  // =========================================================================

  server.registerTool(
    "sophos_get_mtr_settings",
    {
      title: "Get Sophos MDR/MTR Settings",
      description: `Get Managed Detection and Response (MDR/MTR) settings for a tenant.

Returns the current MDR configuration including notification preferences and
response settings.

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
        "/endpoint/v1/settings/mtr",
        {}
      );
      return jsonResult(data);
    })
  );

  server.registerTool(
    "sophos_update_mtr_settings",
    {
      title: "Update Sophos MDR/MTR Settings",
      description: `Update Managed Detection and Response (MDR/MTR) settings for a tenant.

Modify MDR configuration including notification preferences and response settings.

Args:
  - settings (object): MTR/MDR settings object to apply.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        settings: z
          .record(z.unknown())
          .describe("MTR/MDR settings object to apply"),
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
      const updated = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/endpoint/v1/settings/mtr",
        { method: "PATCH", body: settings }
      );
      return jsonResult({ status: "updated", settings: updated });
    })
  );
}
