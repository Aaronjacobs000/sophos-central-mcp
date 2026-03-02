/**
 * Tools: sophos_list_endpoints, sophos_get_endpoint, sophos_scan_endpoint,
 *        sophos_isolate_endpoint, sophos_release_endpoint
 * Interact with the Sophos Endpoint API /endpoint/v1/endpoints
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import type { SophosEndpointPage, SophosEndpoint } from "../types/sophos.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerEndpointTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // --- List Endpoints ---
  server.registerTool(
    "sophos_list_endpoints",
    {
      title: "List Sophos Endpoints",
      description: `List endpoints (computers and servers) from a Sophos Central tenant.

Supports filtering by health status, hostname, OS platform, type, tamper 
protection status, and isolation status. Uses cursor-based pagination.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - health_status (string, optional): Filter by health: "good", "suspicious", "bad", "unknown".
  - hostname_contains (string, optional): Filter by hostname substring.
  - os_platform (string, optional): Filter by OS: "windows", "macOS", "linux".
  - type (string, optional): Filter by type: "computer", "server".
  - tamper_protection (boolean, optional): Filter by tamper protection status.
  - isolation_status (string, optional): Filter by isolation: "isolated", "notIsolated".
  - limit (number, optional): Max results per page (1-100, default 50).
  - cursor (string, optional): Pagination cursor from previous response.
  - fields (string, optional): Comma-separated field list to return only specific fields.

Returns:
  Paginated list of endpoints with health, OS, IP, hostname, assigned person, and protection details.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        health_status: z
          .string()
          .optional()
          .describe('Filter by health: "good", "suspicious", "bad", "unknown"'),
        hostname_contains: z
          .string()
          .optional()
          .describe("Filter by hostname substring"),
        os_platform: z
          .string()
          .optional()
          .describe('Filter by OS: "windows", "macOS", "linux"'),
        type: z
          .string()
          .optional()
          .describe('Filter by type: "computer", "server"'),
        tamper_protection: z
          .boolean()
          .optional()
          .describe("Filter by tamper protection enabled/disabled"),
        isolation_status: z
          .string()
          .optional()
          .describe('Filter by isolation: "isolated", "notIsolated"'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Max results per page (default 50)"),
        cursor: z
          .string()
          .optional()
          .describe("Pagination cursor (pageFromKey) from previous response"),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated field list for partial responses"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(
      async ({
        tenant_id,
        health_status,
        hostname_contains,
        os_platform,
        type,
        tamper_protection,
        isolation_status,
        limit,
        cursor,
        fields,
      }) => {
        const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);

        const params: Record<string, string> = {
          pageSize: String(limit),
        };

        if (cursor) params.pageFromKey = cursor;
        if (health_status) params.healthStatus = health_status;
        if (hostname_contains) params.hostnameContains = hostname_contains;
        if (os_platform) params.osPlatform = os_platform;
        if (type) params.type = type;
        if (tamper_protection !== undefined)
          params.tamperProtectionEnabled = String(tamper_protection);
        if (isolation_status) params.isolationStatus = isolation_status;
        if (fields) params.fields = fields;

        const data = await client.tenantRequest<SophosEndpointPage>(
          resolvedTenantId,
          "/endpoint/v1/endpoints",
          { params }
        );

        return jsonResult({
          count: data.items.length,
          total: data.pages.total ?? data.pages.items ?? null,
          next_cursor: data.pages.nextKey ?? null,
          endpoints: data.items.map(formatEndpoint),
        });
      }
    )
  );

  // --- Get Endpoint ---
  server.registerTool(
    "sophos_get_endpoint",
    {
      title: "Get Sophos Endpoint Detail",
      description: `Get full details of a specific endpoint by ID.

Returns complete information including health status, OS details, IP addresses,
assigned person, tamper protection status, assigned products, isolation state,
and service details.

Args:
  - endpoint_id (string): The endpoint ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        endpoint_id: z.string().uuid().describe("Endpoint ID to retrieve"),
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
    withErrorHandling(async ({ endpoint_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const endpoint = await client.tenantRequest<SophosEndpoint>(
        resolvedTenantId,
        `/endpoint/v1/endpoints/${endpoint_id}`
      );
      return jsonResult(formatEndpointDetailed(endpoint));
    })
  );

  // --- Scan Endpoint ---
  server.registerTool(
    "sophos_scan_endpoint",
    {
      title: "Start Sophos Endpoint Scan",
      description: `Trigger an antivirus scan on a specific endpoint.

This is a write action that initiates an on-demand scan on the target device.
The scan runs asynchronously; this tool returns immediately after submitting the request.

Args:
  - endpoint_id (string): The endpoint ID to scan.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        endpoint_id: z.string().uuid().describe("Endpoint ID to scan"),
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
    withErrorHandling(async ({ endpoint_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest(
        resolvedTenantId,
        `/endpoint/v1/endpoints/${endpoint_id}/scans`,
        { method: "POST", body: {} }
      );
      return jsonResult({
        status: "scan_initiated",
        endpoint_id,
        message: `Scan initiated on endpoint ${endpoint_id}. The scan runs asynchronously on the device.`,
      });
    })
  );

  // --- Isolate Endpoint ---
  server.registerTool(
    "sophos_isolate_endpoint",
    {
      title: "Isolate Sophos Endpoint",
      description: `Network-isolate a specific endpoint, preventing all network communication 
except to Sophos Central.

WARNING: This is a disruptive action. The isolated endpoint will lose all 
network connectivity except its management connection to Sophos Central. 
Use this for containment of compromised devices.

Args:
  - endpoint_id (string): The endpoint ID to isolate.
  - comment (string, optional): Reason for isolation.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        endpoint_id: z.string().uuid().describe("Endpoint ID to isolate"),
        comment: z
          .string()
          .optional()
          .describe("Reason for isolation"),
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
    withErrorHandling(async ({ endpoint_id, comment, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { enabled: true };
      if (comment) body.comment = comment;

      await client.tenantRequest(
        resolvedTenantId,
        `/endpoint/v1/endpoints/${endpoint_id}/isolation`,
        { method: "PATCH", body }
      );
      return jsonResult({
        status: "isolated",
        endpoint_id,
        message: `Endpoint ${endpoint_id} has been network-isolated.`,
      });
    })
  );

  // --- Release Endpoint ---
  server.registerTool(
    "sophos_release_endpoint",
    {
      title: "Release Sophos Endpoint from Isolation",
      description: `Remove network isolation from an endpoint, restoring full connectivity.

Args:
  - endpoint_id (string): The endpoint ID to release.
  - comment (string, optional): Reason for releasing isolation.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        endpoint_id: z.string().uuid().describe("Endpoint ID to release"),
        comment: z
          .string()
          .optional()
          .describe("Reason for releasing isolation"),
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
    withErrorHandling(async ({ endpoint_id, comment, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { enabled: false };
      if (comment) body.comment = comment;

      await client.tenantRequest(
        resolvedTenantId,
        `/endpoint/v1/endpoints/${endpoint_id}/isolation`,
        { method: "PATCH", body }
      );
      return jsonResult({
        status: "released",
        endpoint_id,
        message: `Endpoint ${endpoint_id} has been released from isolation.`,
      });
    })
  );
}

function formatEndpoint(ep: SophosEndpoint) {
  return {
    id: ep.id,
    hostname: ep.hostname,
    type: ep.type,
    health: ep.health.overall,
    threat_status: ep.health.threats.status,
    os: `${ep.os.platform} ${ep.os.name} ${ep.os.majorVersion}.${ep.os.minorVersion}`,
    is_server: ep.os.isServer,
    ipv4: ep.ipv4Addresses ?? [],
    person: ep.associatedPerson?.name ?? null,
    tamper_protection: ep.tamperProtectionEnabled,
    group: ep.groupName ?? null,
    last_seen: ep.lastSeenAt ?? null,
    isolation: ep.isolation?.status ?? null,
  };
}

function formatEndpointDetailed(ep: SophosEndpoint) {
  return {
    ...formatEndpoint(ep),
    tenant_id: ep.tenant.id,
    group_id: ep.groupId ?? null,
    ipv6: ep.ipv6Addresses ?? [],
    mac_addresses: ep.macAddresses ?? [],
    person_login: ep.associatedPerson?.viaLogin ?? null,
    person_id: ep.associatedPerson?.id ?? null,
    service_details: ep.health.services.serviceDetails ?? [],
    services_status: ep.health.services.status,
    assigned_products:
      ep.assignedProducts?.map((p) => ({
        code: p.code,
        version: p.version,
        status: p.status,
      })) ?? [],
    lockdown_status: ep.lockdown?.status ?? null,
    os_build: ep.os.build ?? null,
  };
}
