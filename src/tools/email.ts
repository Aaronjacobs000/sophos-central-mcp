/**
 * Tools: sophos_search_quarantine, sophos_preview_quarantine_message,
 *        sophos_get_quarantine_urls, sophos_get_quarantine_attachments,
 *        sophos_release_quarantine_message, sophos_delete_quarantine_message,
 *        sophos_strip_quarantine_attachments, sophos_reattach_quarantine_attachments,
 *        sophos_download_quarantine_attachment,
 *        sophos_search_post_delivery_quarantine, sophos_preview_post_delivery_message,
 *        sophos_get_post_delivery_attachments, sophos_release_post_delivery_message,
 *        sophos_delete_post_delivery_message, sophos_download_post_delivery_attachment,
 *        sophos_clawback_message, sophos_get_clawback_status,
 *        sophos_list_mailboxes, sophos_create_mailbox, sophos_bulk_create_mailboxes,
 *        sophos_get_mailbox, sophos_update_mailbox, sophos_delete_mailbox,
 *        sophos_list_mailbox_aliases, sophos_add_mailbox_alias, sophos_delete_mailbox_alias,
 *        sophos_list_mailbox_delegates, sophos_add_mailbox_delegate, sophos_delete_mailbox_delegate,
 *        sophos_get_email_settings
 * Interact with the Sophos Email API /email/v1/
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SophosClient } from "../client/sophos-client.js";
import type { TenantResolver } from "../client/tenant-resolver.js";
import { jsonResult, withErrorHandling } from "./helpers.js";
import { DEFAULT_PAGE_SIZE } from "../config/config.js";

export function registerEmailTools(
  server: McpServer,
  client: SophosClient,
  tenantResolver: TenantResolver
): void {
  // =========================================================================
  // Quarantine (9 tools)
  // =========================================================================

  // --- Search Quarantine ---
  server.registerTool(
    "sophos_search_quarantine",
    {
      title: "Search Quarantined Emails",
      description: `Search quarantined emails in Sophos Email with optional filters.

Searches the quarantine using filters such as sender, recipient, subject,
date range, and quarantine reason. Results are paginated.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - from (string, optional): Filter by sender email address.
  - to (string, optional): Filter by recipient email address.
  - subject (string, optional): Filter by email subject.
  - date_from (string, optional): ISO 8601 start date for date range filter.
  - date_to (string, optional): ISO 8601 end date for date range filter.
  - reason (string, optional): Filter by quarantine reason e.g. "spam", "malware", "bulkEmail".
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).`,
      inputSchema: {
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
        from: z.string().optional().describe("Filter by sender email address"),
        to: z.string().optional().describe("Filter by recipient email address"),
        subject: z.string().optional().describe("Filter by email subject"),
        date_from: z.string().optional().describe("ISO 8601 start date for date range filter"),
        date_to: z.string().optional().describe("ISO 8601 end date for date range filter"),
        reason: z.string().optional().describe('Filter by quarantine reason e.g. "spam", "malware", "bulkEmail"'),
        limit: z.number().int().min(1).max(100).optional().default(DEFAULT_PAGE_SIZE).describe("Max results per page (default 50)"),
        page: z.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, from, to, subject, date_from, date_to, reason, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const filter: Record<string, unknown> = {};
      if (from) filter.from = from;
      if (to) filter.to = to;
      if (subject) filter.subject = subject;
      if (date_from || date_to) {
        const dateRange: Record<string, string> = {};
        if (date_from) dateRange.from = date_from;
        if (date_to) dateRange.to = date_to;
        filter.dateRange = dateRange;
      }
      if (reason) filter.reason = reason;

      const body: Record<string, unknown> = { limit, page };
      if (Object.keys(filter).length > 0) body.filter = filter;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/email/v1/quarantine/search",
        { method: "POST", body }
      );
      return jsonResult(data);
    })
  );

  // --- Preview Quarantine Message ---
  server.registerTool(
    "sophos_preview_quarantine_message",
    {
      title: "Preview Quarantined Email",
      description: `Preview the content of a quarantined email by message ID.

Returns the email headers, body preview, and metadata without releasing
the message from quarantine.

Args:
  - message_id (string): The quarantined message ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Quarantined message ID"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/quarantine/${message_id}/preview`
      );
      return jsonResult(data);
    })
  );

  // --- Get Quarantine URLs ---
  server.registerTool(
    "sophos_get_quarantine_urls",
    {
      title: "Get Quarantined Email URLs",
      description: `Get the URLs found in a quarantined email.

Returns a list of URLs extracted from the quarantined message body and headers.

Args:
  - message_id (string): The quarantined message ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Quarantined message ID"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/quarantine/${message_id}/urls`
      );
      return jsonResult(data);
    })
  );

  // --- Get Quarantine Attachments ---
  server.registerTool(
    "sophos_get_quarantine_attachments",
    {
      title: "Get Quarantined Email Attachments",
      description: `Get attachment information for a quarantined email.

Returns metadata about attachments (filename, size, content type) without
downloading the attachment content.

Args:
  - message_id (string): The quarantined message ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Quarantined message ID"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/quarantine/${message_id}/attachments`
      );
      return jsonResult(data);
    })
  );

  // --- Release Quarantine Message ---
  server.registerTool(
    "sophos_release_quarantine_message",
    {
      title: "Release Quarantined Email",
      description: `Release a quarantined email to its intended recipient.

This delivers the previously quarantined message to the recipient's inbox.
Optionally specify a different recipient address.

Args:
  - message_id (string): The quarantined message ID to release.
  - recipient_address (string, optional): Override recipient email address.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Quarantined message ID to release"),
        recipient_address: z.string().optional().describe("Override recipient email address"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, recipient_address, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (recipient_address) body.recipientAddress = recipient_address;

      await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/quarantine/${message_id}/release`,
        { method: "POST", body }
      );
      return jsonResult({
        status: "released",
        message_id,
        message: `Quarantined message ${message_id} has been released.`,
      });
    })
  );

  // --- Delete Quarantine Message ---
  server.registerTool(
    "sophos_delete_quarantine_message",
    {
      title: "Delete Quarantined Email",
      description: `Permanently delete a quarantined email.

WARNING: This permanently removes the quarantined message. It cannot be recovered.

Args:
  - message_id (string): The quarantined message ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Quarantined message ID to delete"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/quarantine/${message_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        message_id,
        message: `Quarantined message ${message_id} has been permanently deleted.`,
      });
    })
  );

  // --- Strip Quarantine Attachments ---
  server.registerTool(
    "sophos_strip_quarantine_attachments",
    {
      title: "Strip Attachments and Release Quarantined Email",
      description: `Strip attachments from a quarantined email and release the message.

Removes all attachments from the quarantined email and delivers the message
body to the recipient without the attachments.

Args:
  - message_id (string): The quarantined message ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Quarantined message ID"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/quarantine/${message_id}/strip-attachments`,
        { method: "POST", body: {} }
      );
      return jsonResult({
        status: "stripped_and_released",
        message_id,
        message: `Attachments stripped and message ${message_id} released.`,
      });
    })
  );

  // --- Reattach Quarantine Attachments ---
  server.registerTool(
    "sophos_reattach_quarantine_attachments",
    {
      title: "Reattach Quarantine Attachments",
      description: `Reattach previously stripped attachments to a quarantined email.

Restores attachments that were previously stripped from the quarantined message.

Args:
  - message_id (string): The quarantined message ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Quarantined message ID"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/quarantine/${message_id}/reattach`,
        { method: "POST", body: {} }
      );
      return jsonResult({
        status: "reattached",
        message_id,
        message: `Attachments reattached to quarantined message ${message_id}.`,
      });
    })
  );

  // --- Download Quarantine Attachment ---
  server.registerTool(
    "sophos_download_quarantine_attachment",
    {
      title: "Download Quarantine Attachment",
      description: `Download a specific attachment from a quarantined email.

Returns the attachment content for a specific attachment ID within a
quarantined message.

Args:
  - message_id (string): The quarantined message ID.
  - attachment_id (string): The attachment ID to download.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Quarantined message ID"),
        attachment_id: z.string().describe("Attachment ID to download"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, attachment_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/quarantine/${message_id}/attachments/${attachment_id}/download`
      );
      return jsonResult(data);
    })
  );

  // =========================================================================
  // Post-Delivery Quarantine (6 tools)
  // =========================================================================

  // --- Search Post-Delivery Quarantine ---
  server.registerTool(
    "sophos_search_post_delivery_quarantine",
    {
      title: "Search Post-Delivery Quarantined Emails",
      description: `Search post-delivery quarantined emails in Sophos Email.

Searches emails that were quarantined after initial delivery to the recipient,
typically due to retrospective threat detection.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - from (string, optional): Filter by sender email address.
  - to (string, optional): Filter by recipient email address.
  - subject (string, optional): Filter by email subject.
  - date_from (string, optional): ISO 8601 start date for date range filter.
  - date_to (string, optional): ISO 8601 end date for date range filter.
  - reason (string, optional): Filter by quarantine reason.
  - limit (number, optional): Max results per page (default 50).
  - page (number, optional): Page number (default 1).`,
      inputSchema: {
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
        from: z.string().optional().describe("Filter by sender email address"),
        to: z.string().optional().describe("Filter by recipient email address"),
        subject: z.string().optional().describe("Filter by email subject"),
        date_from: z.string().optional().describe("ISO 8601 start date for date range filter"),
        date_to: z.string().optional().describe("ISO 8601 end date for date range filter"),
        reason: z.string().optional().describe("Filter by quarantine reason"),
        limit: z.number().int().min(1).max(100).optional().default(DEFAULT_PAGE_SIZE).describe("Max results per page (default 50)"),
        page: z.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, from, to, subject, date_from, date_to, reason, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const filter: Record<string, unknown> = {};
      if (from) filter.from = from;
      if (to) filter.to = to;
      if (subject) filter.subject = subject;
      if (date_from || date_to) {
        const dateRange: Record<string, string> = {};
        if (date_from) dateRange.from = date_from;
        if (date_to) dateRange.to = date_to;
        filter.dateRange = dateRange;
      }
      if (reason) filter.reason = reason;

      const body: Record<string, unknown> = { limit, page };
      if (Object.keys(filter).length > 0) body.filter = filter;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/email/v1/post-delivery-quarantine/search",
        { method: "POST", body }
      );
      return jsonResult(data);
    })
  );

  // --- Preview Post-Delivery Message ---
  server.registerTool(
    "sophos_preview_post_delivery_message",
    {
      title: "Preview Post-Delivery Quarantined Email",
      description: `Preview the content of a post-delivery quarantined email.

Returns headers, body preview, and metadata for a message that was
quarantined after delivery.

Args:
  - message_id (string): The post-delivery quarantined message ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Post-delivery quarantined message ID"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/post-delivery-quarantine/${message_id}/preview`
      );
      return jsonResult(data);
    })
  );

  // --- Get Post-Delivery Attachments ---
  server.registerTool(
    "sophos_get_post_delivery_attachments",
    {
      title: "Get Post-Delivery Quarantine Attachments",
      description: `Get attachment information for a post-delivery quarantined email.

Returns metadata about attachments (filename, size, content type) for a
message that was quarantined after delivery.

Args:
  - message_id (string): The post-delivery quarantined message ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Post-delivery quarantined message ID"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/post-delivery-quarantine/${message_id}/attachments`
      );
      return jsonResult(data);
    })
  );

  // --- Release Post-Delivery Message ---
  server.registerTool(
    "sophos_release_post_delivery_message",
    {
      title: "Release Post-Delivery Quarantined Email",
      description: `Release a post-delivery quarantined email back to the recipient.

Restores the previously quarantined message to the recipient's mailbox.

Args:
  - message_id (string): The post-delivery quarantined message ID to release.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Post-delivery quarantined message ID to release"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/post-delivery-quarantine/${message_id}/release`,
        { method: "POST", body: {} }
      );
      return jsonResult({
        status: "released",
        message_id,
        message: `Post-delivery quarantined message ${message_id} has been released.`,
      });
    })
  );

  // --- Delete Post-Delivery Message ---
  server.registerTool(
    "sophos_delete_post_delivery_message",
    {
      title: "Delete Post-Delivery Quarantined Email",
      description: `Permanently delete a post-delivery quarantined email.

WARNING: This permanently removes the post-delivery quarantined message.
It cannot be recovered.

Args:
  - message_id (string): The post-delivery quarantined message ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Post-delivery quarantined message ID to delete"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/post-delivery-quarantine/${message_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        message_id,
        message: `Post-delivery quarantined message ${message_id} has been permanently deleted.`,
      });
    })
  );

  // --- Download Post-Delivery Attachment ---
  server.registerTool(
    "sophos_download_post_delivery_attachment",
    {
      title: "Download Post-Delivery Quarantine Attachment",
      description: `Download a specific attachment from a post-delivery quarantined email.

Returns the attachment content for a specific attachment ID within a
post-delivery quarantined message.

Args:
  - message_id (string): The post-delivery quarantined message ID.
  - attachment_id (string): The attachment ID to download.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Post-delivery quarantined message ID"),
        attachment_id: z.string().describe("Attachment ID to download"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, attachment_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/post-delivery-quarantine/${message_id}/attachments/${attachment_id}/download`
      );
      return jsonResult(data);
    })
  );

  // =========================================================================
  // Message Actions (2 tools)
  // =========================================================================

  // --- Clawback Message ---
  server.registerTool(
    "sophos_clawback_message",
    {
      title: "Clawback Delivered Email",
      description: `Clawback (recall) a delivered email message from the recipient's mailbox.

WARNING: This removes the message from the recipient's mailbox. Use this
for messages identified as malicious or sent in error after delivery.

Args:
  - message_id (string): The delivered message ID to clawback.
  - reason (string, optional): Reason for the clawback action.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        message_id: z.string().describe("Delivered message ID to clawback"),
        reason: z.string().optional().describe("Reason for the clawback action"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ message_id, reason, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { messageId: message_id };
      if (reason) body.reason = reason;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/email/v1/message-actions/clawback",
        { method: "POST", body }
      );
      return jsonResult(data);
    })
  );

  // --- Get Clawback Status ---
  server.registerTool(
    "sophos_get_clawback_status",
    {
      title: "Get Clawback Action Status",
      description: `Get the status of a clawback (recall) action.

Check whether a previously initiated clawback has completed, is in progress,
or has failed.

Args:
  - action_id (string): The clawback action ID returned by sophos_clawback_message.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        action_id: z.string().describe("Clawback action ID"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ action_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/message-actions/clawback/${action_id}`
      );
      return jsonResult(data);
    })
  );

  // =========================================================================
  // Mailboxes (13 tools)
  // =========================================================================

  // --- List Mailboxes ---
  server.registerTool(
    "sophos_list_mailboxes",
    {
      title: "List Sophos Email Mailboxes",
      description: `List mailboxes managed by Sophos Email protection.

Returns a paginated list of mailboxes with optional search filtering.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.
  - search (string, optional): Search by email address or name.
  - limit (number, optional): Max results per page (1-100, default 50).
  - page (number, optional): Page number (default 1).`,
      inputSchema: {
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
        search: z.string().optional().describe("Search by email address or name"),
        limit: z.number().int().min(1).max(100).optional().default(DEFAULT_PAGE_SIZE).describe("Max results per page (default 50)"),
        page: z.number().int().min(1).optional().default(1).describe("Page number (default 1)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ tenant_id, search, limit, page }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const params: Record<string, string> = {
        pageSize: String(limit),
        page: String(page),
      };
      if (search) params.search = search;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/email/v1/mailboxes",
        { params }
      );
      return jsonResult(data);
    })
  );

  // --- Create Mailbox ---
  server.registerTool(
    "sophos_create_mailbox",
    {
      title: "Create Sophos Email Mailbox",
      description: `Create a new mailbox in Sophos Email protection.

Registers a new email address for protection by Sophos Email.

Args:
  - email_address (string): The email address for the mailbox.
  - first_name (string, optional): First name of the mailbox owner.
  - last_name (string, optional): Last name of the mailbox owner.
  - type (string, optional): Mailbox type e.g. "user", "shared", "group".
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        email_address: z.string().describe("Email address for the mailbox"),
        first_name: z.string().optional().describe("First name of the mailbox owner"),
        last_name: z.string().optional().describe("Last name of the mailbox owner"),
        type: z.string().optional().describe('Mailbox type e.g. "user", "shared", "group"'),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ email_address, first_name, last_name, type, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = { emailAddress: email_address };
      if (first_name) body.firstName = first_name;
      if (last_name) body.lastName = last_name;
      if (type) body.type = type;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/email/v1/mailboxes",
        { method: "POST", body }
      );
      return jsonResult(data);
    })
  );

  // --- Bulk Create Mailboxes ---
  server.registerTool(
    "sophos_bulk_create_mailboxes",
    {
      title: "Bulk Create Sophos Email Mailboxes",
      description: `Bulk create multiple mailboxes in Sophos Email protection.

Registers multiple email addresses for protection in a single request.

Args:
  - mailboxes (array): Array of mailbox objects with emailAddress (required), firstName, lastName.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mailboxes: z.array(z.object({
          emailAddress: z.string().describe("Email address"),
          firstName: z.string().optional().describe("First name"),
          lastName: z.string().optional().describe("Last name"),
        })).min(1).describe("Array of mailbox objects to create"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ mailboxes, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        "/email/v1/mailboxes/bulk",
        { method: "POST", body: { mailboxes } }
      );
      return jsonResult(data);
    })
  );

  // --- Get Mailbox ---
  server.registerTool(
    "sophos_get_mailbox",
    {
      title: "Get Sophos Email Mailbox Detail",
      description: `Get full details of a specific mailbox by ID.

Returns complete mailbox information including email address, owner details,
type, and protection status.

Args:
  - mailbox_id (string): The mailbox ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mailbox_id: z.string().describe("Mailbox ID to retrieve"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ mailbox_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/mailboxes/${mailbox_id}`
      );
      return jsonResult(data);
    })
  );

  // --- Update Mailbox ---
  server.registerTool(
    "sophos_update_mailbox",
    {
      title: "Update Sophos Email Mailbox",
      description: `Update an existing mailbox in Sophos Email protection.

Update mailbox properties such as owner name or mailbox type.

Args:
  - mailbox_id (string): The mailbox ID to update.
  - first_name (string, optional): Updated first name.
  - last_name (string, optional): Updated last name.
  - type (string, optional): Updated mailbox type.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mailbox_id: z.string().describe("Mailbox ID to update"),
        first_name: z.string().optional().describe("Updated first name"),
        last_name: z.string().optional().describe("Updated last name"),
        type: z.string().optional().describe("Updated mailbox type"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ mailbox_id, first_name, last_name, type, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const body: Record<string, unknown> = {};
      if (first_name !== undefined) body.firstName = first_name;
      if (last_name !== undefined) body.lastName = last_name;
      if (type !== undefined) body.type = type;

      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/mailboxes/${mailbox_id}`,
        { method: "PATCH", body }
      );
      return jsonResult(data);
    })
  );

  // --- Delete Mailbox ---
  server.registerTool(
    "sophos_delete_mailbox",
    {
      title: "Delete Sophos Email Mailbox",
      description: `Delete a mailbox from Sophos Email protection.

WARNING: This removes the mailbox from Sophos Email protection. The underlying
email account is not affected, but email protection will stop for this address.

Args:
  - mailbox_id (string): The mailbox ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mailbox_id: z.string().describe("Mailbox ID to delete"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ mailbox_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/mailboxes/${mailbox_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        mailbox_id,
        message: `Mailbox ${mailbox_id} has been deleted from Sophos Email protection.`,
      });
    })
  );

  // --- List Mailbox Aliases ---
  server.registerTool(
    "sophos_list_mailbox_aliases",
    {
      title: "List Mailbox Aliases",
      description: `List email aliases for a specific mailbox.

Returns all alias email addresses associated with the mailbox.

Args:
  - mailbox_id (string): The mailbox ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mailbox_id: z.string().describe("Mailbox ID"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ mailbox_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/mailboxes/${mailbox_id}/aliases`
      );
      return jsonResult(data);
    })
  );

  // --- Add Mailbox Alias ---
  server.registerTool(
    "sophos_add_mailbox_alias",
    {
      title: "Add Mailbox Alias",
      description: `Add an email alias to a mailbox.

Creates a new alias email address that routes to the specified mailbox.

Args:
  - mailbox_id (string): The mailbox ID to add the alias to.
  - alias (string): The alias email address to add.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mailbox_id: z.string().describe("Mailbox ID to add alias to"),
        alias: z.string().describe("Alias email address to add"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ mailbox_id, alias, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/mailboxes/${mailbox_id}/aliases`,
        { method: "POST", body: { alias } }
      );
      return jsonResult(data);
    })
  );

  // --- Delete Mailbox Alias ---
  server.registerTool(
    "sophos_delete_mailbox_alias",
    {
      title: "Delete Mailbox Alias",
      description: `Delete an email alias from a mailbox.

Removes the specified alias email address from the mailbox.

Args:
  - mailbox_id (string): The mailbox ID.
  - alias_id (string): The alias ID to delete.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mailbox_id: z.string().describe("Mailbox ID"),
        alias_id: z.string().describe("Alias ID to delete"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ mailbox_id, alias_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/mailboxes/${mailbox_id}/aliases/${alias_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        mailbox_id,
        alias_id,
        message: `Alias ${alias_id} has been deleted from mailbox ${mailbox_id}.`,
      });
    })
  );

  // --- List Mailbox Delegates ---
  server.registerTool(
    "sophos_list_mailbox_delegates",
    {
      title: "List Mailbox Delegates",
      description: `List delegates for a specific mailbox.

Returns all users who have delegate access to the mailbox.

Args:
  - mailbox_id (string): The mailbox ID.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mailbox_id: z.string().describe("Mailbox ID"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ mailbox_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/mailboxes/${mailbox_id}/delegates`
      );
      return jsonResult(data);
    })
  );

  // --- Add Mailbox Delegate ---
  server.registerTool(
    "sophos_add_mailbox_delegate",
    {
      title: "Add Mailbox Delegate",
      description: `Add a delegate to a mailbox.

Grants delegate access to the specified mailbox for another user.

Args:
  - mailbox_id (string): The mailbox ID to add the delegate to.
  - delegate_id (string): The delegate user ID to add.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mailbox_id: z.string().describe("Mailbox ID to add delegate to"),
        delegate_id: z.string().describe("Delegate user ID to add"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ mailbox_id, delegate_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      const data = await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/mailboxes/${mailbox_id}/delegates`,
        { method: "POST", body: { delegateId: delegate_id } }
      );
      return jsonResult(data);
    })
  );

  // --- Delete Mailbox Delegate ---
  server.registerTool(
    "sophos_delete_mailbox_delegate",
    {
      title: "Remove Mailbox Delegate",
      description: `Remove a delegate from a mailbox.

Revokes delegate access to the specified mailbox for the given user.

Args:
  - mailbox_id (string): The mailbox ID.
  - delegate_id (string): The delegate ID to remove.
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        mailbox_id: z.string().describe("Mailbox ID"),
        delegate_id: z.string().describe("Delegate ID to remove"),
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async ({ mailbox_id, delegate_id, tenant_id }) => {
      const resolvedTenantId = tenantResolver.resolveTenantId(tenant_id);
      await client.tenantRequest<Record<string, unknown>>(
        resolvedTenantId,
        `/email/v1/mailboxes/${mailbox_id}/delegates/${delegate_id}`,
        { method: "DELETE" }
      );
      return jsonResult({
        status: "deleted",
        mailbox_id,
        delegate_id,
        message: `Delegate ${delegate_id} has been removed from mailbox ${mailbox_id}.`,
      });
    })
  );

  // --- Get Email Settings ---
  server.registerTool(
    "sophos_get_email_settings",
    {
      title: "Get Sophos Email Protection Settings",
      description: `Get the email protection settings for the tenant.

Returns the current Sophos Email protection configuration including
spam, malware, and policy settings.

Args:
  - tenant_id (string, optional): Tenant ID. Required for partner/org callers.`,
      inputSchema: {
        tenant_id: z.string().uuid().optional().describe("Tenant ID. Required for partner/org callers."),
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
        "/email/v1/settings"
      );
      return jsonResult(data);
    })
  );
}
