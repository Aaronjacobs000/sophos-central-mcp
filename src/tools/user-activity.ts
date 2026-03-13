/**
 * Tools: sophos_create_attestation, sophos_get_attestation
 * Interact with the Sophos User Activity API /user-activity/v1/
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";

export function registerUserActivityTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- Create Attestation ---
  server.registerTool(
    "sophos_create_attestation",
    {
      title: "Create User Attestation",
      description: `Create a user attestation/sign-off record.

Args:
  - type (string): Attestation type.
  - user_id (string, optional): User ID associated with the attestation.
  - details (object, optional): Additional attestation details.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        type: z.string().describe("Attestation type"),
        user_id: z
          .string()
          .optional()
          .describe("User ID associated with the attestation"),
        details: z
          .record(z.unknown())
          .optional()
          .describe("Additional attestation details"),
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
    withErrorHandling(async ({ type, user_id, details, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { type };
      if (user_id) body.userId = user_id;
      if (details) body.details = details;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/user-activity/v1/attestations",
        { method: "POST", body }
      );
      return jsonResult({ status: "created", attestation: data });
    })
  );

  // --- Get Attestation ---
  server.registerTool(
    "sophos_get_attestation",
    {
      title: "Get Attestation Detail",
      description: `Get details of a specific user attestation.

Args:
  - attestation_id (string): The attestation ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        attestation_id: z.string().describe("Attestation ID"),
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
    withErrorHandling(async ({ attestation_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/user-activity/v1/attestations/${attestation_id}`
      );
      return jsonResult(data);
    })
  );
}
