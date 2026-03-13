/**
 * Tools: sophos_list_cloud_security_profiles, sophos_get_cloud_security_profile,
 *        sophos_create_cloud_security_profile, sophos_update_cloud_security_profile,
 *        sophos_delete_cloud_security_profile, sophos_list_cloud_security_assets
 * Interact with the Sophos Cloud Security API /cloud-security/v1/
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerCloudSecurityTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List Cloud Security Profiles ---
  server.registerTool(
    "sophos_list_cloud_security_profiles",
    {
      title: "List Cloud Security Profiles",
      description: `List cloud security profiles configured for a tenant.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of cloud security profiles.`,
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
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/cloud-security/v1/profiles",
        { params: { pageSize: String(limit), page: String(page) } }
      );
      return jsonResult(data);
    })
  );

  // --- Get Cloud Security Profile ---
  server.registerTool(
    "sophos_get_cloud_security_profile",
    {
      title: "Get Cloud Security Profile",
      description: `Get details of a specific cloud security profile.

Args:
  - profile_id (string): The profile ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        profile_id: z.string().describe("Cloud security profile ID"),
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
    withErrorHandling(async ({ profile_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/cloud-security/v1/profiles/${profile_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Create Cloud Security Profile ---
  server.registerTool(
    "sophos_create_cloud_security_profile",
    {
      title: "Create Cloud Security Profile",
      description: `Create a new cloud security profile.

Args:
  - name (string): Profile name.
  - description (string, optional): Profile description.
  - provider (string, optional): Cloud provider (e.g. "aws", "azure", "gcp").
  - settings (object, optional): Profile-specific settings.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        name: z.string().describe("Profile name"),
        description: z.string().optional().describe("Profile description"),
        provider: z
          .string()
          .optional()
          .describe('Cloud provider (e.g. "aws", "azure", "gcp")'),
        settings: z
          .record(z.unknown())
          .optional()
          .describe("Profile-specific settings"),
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
    withErrorHandling(async ({ name, description, provider, settings, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { name };
      if (description) body.description = description;
      if (provider) body.provider = provider;
      if (settings) body.settings = settings;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/cloud-security/v1/profiles",
        { method: "POST", body }
      );
      return jsonResult({ status: "created", profile: data });
    })
  );

  // --- Update Cloud Security Profile ---
  server.registerTool(
    "sophos_update_cloud_security_profile",
    {
      title: "Update Cloud Security Profile",
      description: `Update an existing cloud security profile (full replacement via PUT).

Args:
  - profile_id (string): The profile ID to update.
  - name (string): Updated profile name.
  - description (string, optional): Updated profile description.
  - provider (string, optional): Cloud provider.
  - settings (object, optional): Updated profile settings.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        profile_id: z.string().describe("Cloud security profile ID to update"),
        name: z.string().describe("Updated profile name"),
        description: z.string().optional().describe("Updated profile description"),
        provider: z.string().optional().describe("Cloud provider"),
        settings: z
          .record(z.unknown())
          .optional()
          .describe("Updated profile settings"),
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
    withErrorHandling(async ({ profile_id, name, description, provider, settings, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { name };
      if (description) body.description = description;
      if (provider) body.provider = provider;
      if (settings) body.settings = settings;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/cloud-security/v1/profiles/${profile_id}`,
        { method: "PUT", body }
      );
      return jsonResult({ status: "updated", profile: data });
    })
  );

  // --- Delete Cloud Security Profile ---
  server.registerTool(
    "sophos_delete_cloud_security_profile",
    {
      title: "Delete Cloud Security Profile",
      description: `Delete a cloud security profile.

WARNING: This permanently removes the cloud security profile.

Args:
  - profile_id (string): The profile ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        profile_id: z.string().describe("Cloud security profile ID to delete"),
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
    withErrorHandling(async ({ profile_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/cloud-security/v1/profiles/${profile_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        profile_id,
        message: `Cloud security profile ${profile_id} deleted.`,
      });
    })
  );

  // --- List Cloud Security Assets ---
  server.registerTool(
    "sophos_list_cloud_security_assets",
    {
      title: "List Cloud Security Assets",
      description: `List cloud security assets discovered across cloud environments.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - provider (string, optional): Filter by cloud provider (e.g. "aws", "azure", "gcp").
  - status (string, optional): Filter by asset status.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).

Returns:
  Paginated list of cloud security assets.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        provider: z
          .string()
          .optional()
          .describe('Filter by cloud provider (e.g. "aws", "azure", "gcp")'),
        status: z.string().optional().describe("Filter by asset status"),
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
    withErrorHandling(async ({ tenant_id, provider, status, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };
      if (provider) params.provider = provider;
      if (status) params.status = status;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/cloud-security/v1/assets",
        { params }
      );
      return jsonResult(data);
    })
  );
}
