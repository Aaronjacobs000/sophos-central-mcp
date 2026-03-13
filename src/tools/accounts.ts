/**
 * Tools: sophos_list_api_credentials, sophos_create_api_credential,
 *        sophos_get_api_credential, sophos_delete_api_credential
 * Interact with the Sophos Accounts API /accounts/v1/
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";

export function registerAccountTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List API Credentials ---
  server.registerTool(
    "sophos_list_api_credentials",
    {
      title: "List API Credentials",
      description: `List API access credentials/tokens configured for a tenant.

Returns credential names, descriptions, roles, and creation dates.

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
        "/accounts/v1/api-credentials"
      );
      return jsonResult(data);
    })
  );

  // --- Create API Credential ---
  server.registerTool(
    "sophos_create_api_credential",
    {
      title: "Create API Credential",
      description: `Create a new API credential for programmatic access.

Args:
  - name (string): Credential name.
  - description (string, optional): Credential description.
  - role_id (string, optional): Role ID to assign to the credential.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        name: z.string().describe("Credential name"),
        description: z.string().optional().describe("Credential description"),
        role_id: z.string().optional().describe("Role ID to assign"),
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
    withErrorHandling(async ({ name, description, role_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { name };
      if (description) body.description = description;
      if (role_id) body.roleId = role_id;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/accounts/v1/api-credentials",
        { method: "POST", body }
      );
      return jsonResult({ status: "created", credential: data });
    })
  );

  // --- Get API Credential ---
  server.registerTool(
    "sophos_get_api_credential",
    {
      title: "Get API Credential Detail",
      description: `Get details of a specific API credential.

Args:
  - credential_id (string): The credential ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        credential_id: z.string().describe("API credential ID"),
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
    withErrorHandling(async ({ credential_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/accounts/v1/api-credentials/${credential_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Delete API Credential ---
  server.registerTool(
    "sophos_delete_api_credential",
    {
      title: "Delete API Credential",
      description: `Delete an API credential, revoking its access.

WARNING: Any integrations using this credential will stop working immediately.

Args:
  - credential_id (string): The credential ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        credential_id: z.string().describe("API credential ID to delete"),
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
    withErrorHandling(async ({ credential_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/accounts/v1/api-credentials/${credential_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        credential_id,
        message: `API credential ${credential_id} deleted.`,
      });
    })
  );
}
