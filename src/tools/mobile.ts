/**
 * Tools: sophos_get_mobile_auto_enrollment, sophos_update_mobile_auto_enrollment,
 *        sophos_list_mobile_os, sophos_list_mobile_devices, sophos_get_mobile_device,
 *        sophos_create_mobile_device, sophos_update_mobile_device, sophos_delete_mobile_device,
 *        sophos_list_mobile_device_properties, sophos_get_mobile_device_compliance,
 *        sophos_get_mobile_device_scans, sophos_get_mobile_device_policies,
 *        sophos_get_mobile_device_apps, sophos_get_mobile_device_location,
 *        sophos_list_mobile_device_groups, sophos_get_mobile_device_group,
 *        sophos_create_mobile_device_group, sophos_update_mobile_device_group,
 *        sophos_delete_mobile_device_group, sophos_sync_mobile_device,
 *        sophos_request_mobile_device_logs, sophos_scan_mobile_device,
 *        sophos_unenroll_mobile_device, sophos_send_mobile_device_message,
 *        sophos_locate_mobile_device, sophos_lock_mobile_device, sophos_wipe_mobile_device,
 *        sophos_list_mobile_app_groups, sophos_get_mobile_app_group,
 *        sophos_create_mobile_app_group, sophos_update_mobile_app_group,
 *        sophos_delete_mobile_app_group, sophos_list_mobile_policies,
 *        sophos_get_mobile_policy, sophos_update_mobile_policy,
 *        sophos_list_mobile_profiles, sophos_get_mobile_profile,
 *        sophos_update_mobile_profile
 * Interact with the Sophos Mobile API /mobile/v1
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerMobileTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // =====================================================================
  // Auto-Enrollment
  // =====================================================================

  // --- Get Auto-Enrollment Settings ---
  server.registerTool(
    "sophos_get_mobile_auto_enrollment",
    {
      title: "Get Mobile Auto-Enrollment Settings",
      description: `Get the auto-enrollment settings for Sophos Mobile.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Auto-enrollment configuration for the tenant.`,
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
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        "/mobile/v1/auto-enrollment"
      );
      return jsonResult(data);
    })
  );

  // --- Update Auto-Enrollment Settings ---
  server.registerTool(
    "sophos_update_mobile_auto_enrollment",
    {
      title: "Update Mobile Auto-Enrollment Settings",
      description: `Update the auto-enrollment settings for Sophos Mobile.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - enabled (boolean, optional): Enable or disable auto-enrollment.
  - settings (object, optional): Additional auto-enrollment settings.

Returns:
  Updated auto-enrollment configuration.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        enabled: z
          .boolean()
          .optional()
          .describe("Enable or disable auto-enrollment"),
        settings: z
          .record(z.unknown())
          .optional()
          .describe("Additional auto-enrollment settings"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, enabled, settings }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (enabled !== undefined) body.enabled = enabled;
      if (settings !== undefined) body.settings = settings;

      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        "/mobile/v1/auto-enrollment",
        { method: "PUT", body }
      );
      return jsonResult(data);
    })
  );

  // =====================================================================
  // Operating Systems
  // =====================================================================

  // --- List Operating Systems ---
  server.registerTool(
    "sophos_list_mobile_os",
    {
      title: "List Mobile Operating Systems",
      description: `List supported mobile operating systems in Sophos Mobile.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  List of supported mobile operating systems.`,
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
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        "/mobile/v1/operating-systems"
      );
      return jsonResult(data);
    })
  );

  // =====================================================================
  // Devices CRUD
  // =====================================================================

  // --- List Mobile Devices ---
  server.registerTool(
    "sophos_list_mobile_devices",
    {
      title: "List Mobile Devices",
      description: `List mobile devices managed by Sophos Mobile.

Supports filtering by search term, OS type, and compliance status.
Uses page-based pagination.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - search (string, optional): Search term to filter devices.
  - os_type (string, optional): Filter by OS type (e.g. "android", "ios").
  - compliance_status (string, optional): Filter by compliance status.
  - page (number, optional): Page number (default 1).
  - page_size (number, optional): Results per page (1-100, default 50).

Returns:
  Paginated list of mobile devices.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        search: z
          .string()
          .optional()
          .describe("Search term to filter devices"),
        os_type: z
          .string()
          .optional()
          .describe('Filter by OS type (e.g. "android", "ios")'),
        compliance_status: z
          .string()
          .optional()
          .describe("Filter by compliance status"),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Page number (default 1)"),
        page_size: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Results per page (default 50)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(
      async ({ tenant_id, search, os_type, compliance_status, page, page_size }) => {
        const tenantId = tenantResolver.resolveTenantId(tenant_id);
        const params: Record<string, string> = {
          page: String(page),
          pageSize: String(page_size),
        };
        if (search) params.search = search;
        if (os_type) params.osType = os_type;
        if (compliance_status) params.complianceStatus = compliance_status;

        const data = await client.tenantRequest<Record<string, unknown>>(
          tenantId,
          "/mobile/v1/devices",
          { params }
        );
        return jsonResult(data);
      }
    )
  );

  // --- Get Mobile Device ---
  server.registerTool(
    "sophos_get_mobile_device",
    {
      title: "Get Mobile Device Detail",
      description: `Get full details of a specific mobile device by ID.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Complete device details including OS, compliance, and enrollment status.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Create Mobile Device ---
  server.registerTool(
    "sophos_create_mobile_device",
    {
      title: "Create Mobile Device",
      description: `Enroll a new mobile device in Sophos Mobile.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - name (string): Device name.
  - os_type (string): Operating system type (e.g. "android", "ios").
  - owner (string, optional): Device owner identifier.

Returns:
  The newly created device record.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        name: z.string().describe("Device name"),
        os_type: z.string().describe('Operating system type (e.g. "android", "ios")'),
        owner: z.string().optional().describe("Device owner identifier"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, name, os_type, owner }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { name, osType: os_type };
      if (owner) body.owner = owner;

      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        "/mobile/v1/devices",
        { method: "POST", body }
      );
      return jsonResult(data);
    })
  );

  // --- Update Mobile Device ---
  server.registerTool(
    "sophos_update_mobile_device",
    {
      title: "Update Mobile Device",
      description: `Update a mobile device's properties in Sophos Mobile.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - name (string, optional): New device name.
  - group_id (string, optional): Device group ID to assign.

Returns:
  The updated device record.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        name: z.string().optional().describe("New device name"),
        group_id: z.string().optional().describe("Device group ID to assign"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ device_id, tenant_id, name, group_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (group_id !== undefined) body.groupId = group_id;

      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}`,
        { method: "PUT", body }
      );
      return jsonResult(data);
    })
  );

  // --- Delete Mobile Device ---
  server.registerTool(
    "sophos_delete_mobile_device",
    {
      title: "Delete Mobile Device",
      description: `Delete (unenroll) a mobile device from Sophos Mobile.

This permanently removes the device from management.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Confirmation of deletion.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID to delete"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}`,
        { method: "DELETE" }
      );
      return jsonResult(data ?? { deleted: true });
    })
  );

  // --- List Mobile Device Properties ---
  server.registerTool(
    "sophos_list_mobile_device_properties",
    {
      title: "Get Mobile Device Properties",
      description: `Get the properties of a specific mobile device.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Device property key-value pairs.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/properties`
      );
      return jsonResult(data);
    })
  );

  // =====================================================================
  // Device Details
  // =====================================================================

  // --- Get Device Compliance ---
  server.registerTool(
    "sophos_get_mobile_device_compliance",
    {
      title: "Get Mobile Device Compliance",
      description: `Get the compliance status of a specific mobile device.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Compliance status and any violations.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/compliance`
      );
      return jsonResult(data);
    })
  );

  // --- Get Device Scans ---
  server.registerTool(
    "sophos_get_mobile_device_scans",
    {
      title: "Get Mobile Device Scans",
      description: `Get scan results for a specific mobile device.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Scan history and results.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/scans`
      );
      return jsonResult(data);
    })
  );

  // --- Get Device Policies ---
  server.registerTool(
    "sophos_get_mobile_device_policies",
    {
      title: "Get Mobile Device Policies",
      description: `Get policies assigned to a specific mobile device.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  List of policies assigned to the device.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/policies`
      );
      return jsonResult(data);
    })
  );

  // --- Get Device Apps ---
  server.registerTool(
    "sophos_get_mobile_device_apps",
    {
      title: "Get Mobile Device Apps",
      description: `Get installed apps on a specific mobile device.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  List of installed applications.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/apps`
      );
      return jsonResult(data);
    })
  );

  // =====================================================================
  // Device Location
  // =====================================================================

  // --- Get Device Location ---
  server.registerTool(
    "sophos_get_mobile_device_location",
    {
      title: "Get Mobile Device Location",
      description: `Get the last known location of a specific mobile device.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Device location coordinates and timestamp.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/location`
      );
      return jsonResult(data);
    })
  );

  // =====================================================================
  // Device Groups CRUD
  // =====================================================================

  // --- List Device Groups ---
  server.registerTool(
    "sophos_list_mobile_device_groups",
    {
      title: "List Mobile Device Groups",
      description: `List mobile device groups in Sophos Mobile.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - page (number, optional): Page number (default 1).
  - page_size (number, optional): Results per page (1-100, default 50).

Returns:
  Paginated list of device groups.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Page number (default 1)"),
        page_size: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Results per page (default 50)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, page, page_size }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(page_size),
      };
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        "/mobile/v1/device-groups",
        { params }
      );
      return jsonResult(data);
    })
  );

  // --- Get Device Group ---
  server.registerTool(
    "sophos_get_mobile_device_group",
    {
      title: "Get Mobile Device Group",
      description: `Get details of a specific mobile device group.

Args:
  - group_id (string): The device group ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Device group details including name, description, and member count.`,
      inputSchema: {
        group_id: z.string().describe("Device group ID"),
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
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/device-groups/${group_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Create Device Group ---
  server.registerTool(
    "sophos_create_mobile_device_group",
    {
      title: "Create Mobile Device Group",
      description: `Create a new mobile device group in Sophos Mobile.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - name (string): Group name.
  - description (string, optional): Group description.

Returns:
  The newly created device group.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        name: z.string().describe("Group name"),
        description: z.string().optional().describe("Group description"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, name, description }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { name };
      if (description) body.description = description;

      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        "/mobile/v1/device-groups",
        { method: "POST", body }
      );
      return jsonResult(data);
    })
  );

  // --- Update Device Group ---
  server.registerTool(
    "sophos_update_mobile_device_group",
    {
      title: "Update Mobile Device Group",
      description: `Update a mobile device group in Sophos Mobile.

Args:
  - group_id (string): The device group ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - name (string, optional): New group name.
  - description (string, optional): New group description.

Returns:
  The updated device group.`,
      inputSchema: {
        group_id: z.string().describe("Device group ID"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        name: z.string().optional().describe("New group name"),
        description: z.string().optional().describe("New group description"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ group_id, tenant_id, name, description }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (description !== undefined) body.description = description;

      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/device-groups/${group_id}`,
        { method: "PUT", body }
      );
      return jsonResult(data);
    })
  );

  // --- Delete Device Group ---
  server.registerTool(
    "sophos_delete_mobile_device_group",
    {
      title: "Delete Mobile Device Group",
      description: `Delete a mobile device group from Sophos Mobile.

Args:
  - group_id (string): The device group ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Confirmation of deletion.`,
      inputSchema: {
        group_id: z.string().describe("Device group ID to delete"),
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
    withErrorHandling(async ({ group_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/device-groups/${group_id}`,
        { method: "DELETE" }
      );
      return jsonResult(data ?? { deleted: true });
    })
  );

  // =====================================================================
  // Device Actions
  // =====================================================================

  // --- Sync Device ---
  server.registerTool(
    "sophos_sync_mobile_device",
    {
      title: "Sync Mobile Device",
      description: `Trigger a sync on a mobile device.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Confirmation that sync was initiated.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/actions/sync`,
        { method: "POST", body: {} }
      );
      return jsonResult(data ?? { actionInitiated: true });
    })
  );

  // --- Request Device Logs ---
  server.registerTool(
    "sophos_request_mobile_device_logs",
    {
      title: "Request Mobile Device Logs",
      description: `Request logs from a mobile device.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Confirmation that log request was initiated.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/actions/request-logs`,
        { method: "POST", body: {} }
      );
      return jsonResult(data ?? { actionInitiated: true });
    })
  );

  // --- Scan Device ---
  server.registerTool(
    "sophos_scan_mobile_device",
    {
      title: "Scan Mobile Device",
      description: `Trigger a security scan on a mobile device.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Confirmation that scan was initiated.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/actions/scan`,
        { method: "POST", body: {} }
      );
      return jsonResult(data ?? { actionInitiated: true });
    })
  );

  // --- Unenroll Device ---
  server.registerTool(
    "sophos_unenroll_mobile_device",
    {
      title: "Unenroll Mobile Device",
      description: `Unenroll a mobile device from Sophos Mobile management.

This removes the device from active management.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Confirmation that unenroll was initiated.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/actions/unenroll`,
        { method: "POST", body: {} }
      );
      return jsonResult(data ?? { actionInitiated: true });
    })
  );

  // --- Send Message to Device ---
  server.registerTool(
    "sophos_send_mobile_device_message",
    {
      title: "Send Message to Mobile Device",
      description: `Send a message to a mobile device.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - message (string): The message text to send to the device.

Returns:
  Confirmation that message was sent.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        message: z.string().describe("Message text to send to the device"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ device_id, tenant_id, message }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/actions/send-message`,
        { method: "POST", body: { message } }
      );
      return jsonResult(data ?? { actionInitiated: true });
    })
  );

  // --- Locate Device ---
  server.registerTool(
    "sophos_locate_mobile_device",
    {
      title: "Locate Mobile Device",
      description: `Request a location update from a mobile device.

This triggers the device to report its current location.
Use sophos_get_mobile_device_location to retrieve the result.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Confirmation that locate request was sent.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
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
    withErrorHandling(async ({ device_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/actions/locate`,
        { method: "POST", body: {} }
      );
      return jsonResult(data ?? { actionInitiated: true });
    })
  );

  // --- Lock Device ---
  server.registerTool(
    "sophos_lock_mobile_device",
    {
      title: "Lock Mobile Device",
      description: `Remotely lock a mobile device.

This sends a lock command to the device, preventing access until unlocked.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - message (string, optional): Lock screen message to display.
  - pin (string, optional): PIN code to unlock the device.

Returns:
  Confirmation that lock command was sent.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        message: z.string().optional().describe("Lock screen message to display"),
        pin: z.string().optional().describe("PIN code to unlock the device"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ device_id, tenant_id, message, pin }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (message !== undefined) body.message = message;
      if (pin !== undefined) body.pin = pin;

      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/actions/lock`,
        { method: "POST", body }
      );
      return jsonResult(data ?? { actionInitiated: true });
    })
  );

  // --- Wipe Device ---
  server.registerTool(
    "sophos_wipe_mobile_device",
    {
      title: "Wipe Mobile Device",
      description: `Remotely wipe a mobile device.

WARNING: This will erase ALL data on the device. This action cannot be undone.
Use with extreme caution. The device will be factory-reset.

Args:
  - device_id (string): The mobile device ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - reason (string, optional): Reason for wiping the device.

Returns:
  Confirmation that wipe command was sent.`,
      inputSchema: {
        device_id: z.string().describe("Mobile device ID"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        reason: z.string().optional().describe("Reason for wiping the device"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ device_id, tenant_id, reason }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (reason !== undefined) body.reason = reason;

      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/devices/${device_id}/actions/wipe`,
        { method: "POST", body }
      );
      return jsonResult(data ?? { actionInitiated: true });
    })
  );

  // =====================================================================
  // App Groups
  // =====================================================================

  // --- List App Groups ---
  server.registerTool(
    "sophos_list_mobile_app_groups",
    {
      title: "List Mobile App Groups",
      description: `List mobile app groups in Sophos Mobile.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - page (number, optional): Page number (default 1).
  - page_size (number, optional): Results per page (1-100, default 50).

Returns:
  Paginated list of app groups.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Page number (default 1)"),
        page_size: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Results per page (default 50)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, page, page_size }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(page_size),
      };
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        "/mobile/v1/app-groups",
        { params }
      );
      return jsonResult(data);
    })
  );

  // --- Get App Group ---
  server.registerTool(
    "sophos_get_mobile_app_group",
    {
      title: "Get Mobile App Group",
      description: `Get details of a specific mobile app group.

Args:
  - group_id (string): The app group ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  App group details including name, type, and apps.`,
      inputSchema: {
        group_id: z.string().describe("App group ID"),
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
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/app-groups/${group_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Create App Group ---
  server.registerTool(
    "sophos_create_mobile_app_group",
    {
      title: "Create Mobile App Group",
      description: `Create a new mobile app group in Sophos Mobile.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - name (string): App group name.
  - type (string, optional): App group type.
  - apps (array, optional): List of apps with name and identifier.

Returns:
  The newly created app group.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        name: z.string().describe("App group name"),
        type: z.string().optional().describe("App group type"),
        apps: z
          .array(
            z.object({
              name: z.string().describe("App name"),
              identifier: z.string().describe("App identifier (bundle ID or package name)"),
            })
          )
          .optional()
          .describe("List of apps to include in the group"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, name, type, apps }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { name };
      if (type !== undefined) body.type = type;
      if (apps !== undefined) body.apps = apps;

      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        "/mobile/v1/app-groups",
        { method: "POST", body }
      );
      return jsonResult(data);
    })
  );

  // --- Update App Group ---
  server.registerTool(
    "sophos_update_mobile_app_group",
    {
      title: "Update Mobile App Group",
      description: `Update a mobile app group in Sophos Mobile.

Args:
  - group_id (string): The app group ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - name (string, optional): New app group name.
  - type (string, optional): New app group type.
  - apps (array, optional): Updated list of apps with name and identifier.

Returns:
  The updated app group.`,
      inputSchema: {
        group_id: z.string().describe("App group ID"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        name: z.string().optional().describe("New app group name"),
        type: z.string().optional().describe("New app group type"),
        apps: z
          .array(
            z.object({
              name: z.string().describe("App name"),
              identifier: z.string().describe("App identifier (bundle ID or package name)"),
            })
          )
          .optional()
          .describe("Updated list of apps"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ group_id, tenant_id, name, type, apps }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (type !== undefined) body.type = type;
      if (apps !== undefined) body.apps = apps;

      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/app-groups/${group_id}`,
        { method: "PUT", body }
      );
      return jsonResult(data);
    })
  );

  // --- Delete App Group ---
  server.registerTool(
    "sophos_delete_mobile_app_group",
    {
      title: "Delete Mobile App Group",
      description: `Delete a mobile app group from Sophos Mobile.

Args:
  - group_id (string): The app group ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Confirmation of deletion.`,
      inputSchema: {
        group_id: z.string().describe("App group ID to delete"),
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
    withErrorHandling(async ({ group_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/app-groups/${group_id}`,
        { method: "DELETE" }
      );
      return jsonResult(data ?? { deleted: true });
    })
  );

  // =====================================================================
  // Mobile Policies
  // =====================================================================

  // --- List Mobile Policies ---
  server.registerTool(
    "sophos_list_mobile_policies",
    {
      title: "List Mobile Policies",
      description: `List mobile policies in Sophos Mobile.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - page (number, optional): Page number (default 1).
  - page_size (number, optional): Results per page (1-100, default 50).

Returns:
  Paginated list of mobile policies.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Page number (default 1)"),
        page_size: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Results per page (default 50)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, page, page_size }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(page_size),
      };
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        "/mobile/v1/policies",
        { params }
      );
      return jsonResult(data);
    })
  );

  // --- Get Mobile Policy ---
  server.registerTool(
    "sophos_get_mobile_policy",
    {
      title: "Get Mobile Policy",
      description: `Get details of a specific mobile policy.

Args:
  - policy_id (string): The mobile policy ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Mobile policy details including configuration and assignments.`,
      inputSchema: {
        policy_id: z.string().describe("Mobile policy ID"),
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
    withErrorHandling(async ({ policy_id, tenant_id }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/policies/${policy_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Update Mobile Policy ---
  server.registerTool(
    "sophos_update_mobile_policy",
    {
      title: "Update Mobile Policy",
      description: `Update a mobile policy in Sophos Mobile.

Args:
  - policy_id (string): The mobile policy ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - settings (object): Policy settings to update.

Returns:
  The updated mobile policy.`,
      inputSchema: {
        policy_id: z.string().describe("Mobile policy ID"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        settings: z
          .record(z.unknown())
          .describe("Policy settings to update"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ policy_id, tenant_id, settings }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/policies/${policy_id}`,
        { method: "PUT", body: settings }
      );
      return jsonResult(data);
    })
  );

  // =====================================================================
  // Mobile Profiles
  // =====================================================================

  // --- List Mobile Profiles ---
  server.registerTool(
    "sophos_list_mobile_profiles",
    {
      title: "List Mobile Profiles",
      description: `List mobile profiles in Sophos Mobile.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - page (number, optional): Page number (default 1).
  - page_size (number, optional): Results per page (1-100, default 50).

Returns:
  Paginated list of mobile profiles.`,
      inputSchema: {
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .default(1)
          .describe("Page number (default 1)"),
        page_size: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(DEFAULT_PAGE_SIZE)
          .describe("Results per page (default 50)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, page, page_size }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(page_size),
      };
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        "/mobile/v1/profiles",
        { params }
      );
      return jsonResult(data);
    })
  );

  // --- Get Mobile Profile ---
  server.registerTool(
    "sophos_get_mobile_profile",
    {
      title: "Get Mobile Profile",
      description: `Get details of a specific mobile profile.

Args:
  - profile_id (string): The mobile profile ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.

Returns:
  Mobile profile details including configuration.`,
      inputSchema: {
        profile_id: z.string().describe("Mobile profile ID"),
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
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/profiles/${profile_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Update Mobile Profile ---
  server.registerTool(
    "sophos_update_mobile_profile",
    {
      title: "Update Mobile Profile",
      description: `Update a mobile profile in Sophos Mobile.

Args:
  - profile_id (string): The mobile profile ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - settings (object): Profile settings to update.

Returns:
  The updated mobile profile.`,
      inputSchema: {
        profile_id: z.string().describe("Mobile profile ID"),
        tenant_id: z
          .string()
          .uuid()
          .optional()
          .describe("Tenant ID. Required for partner/org callers."),
        settings: z
          .record(z.unknown())
          .describe("Profile settings to update"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ profile_id, tenant_id, settings }) => {
      const tenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        tenantId,
        `/mobile/v1/profiles/${profile_id}`,
        { method: "PUT", body: settings }
      );
      return jsonResult(data);
    })
  );
}
