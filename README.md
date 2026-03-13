# Sophos Central MCP Server

MCP (Model Context Protocol) server for interacting with Sophos Central APIs. Supports partner, organisation, and single-tenant credential types with automatic region routing. **266 tools** covering 14 Sophos API namespaces.

## Quick Start

### Claude Desktop

No installation needed. Open your `claude_desktop_config.json` (File > Settings > Developer > Edit Config) and add the `sophos-central` block inside `mcpServers`:

```json
{
  "mcpServers": {
    "sophos-central": {
      "command": "npx",
      "args": ["-y", "sophos-central-mcp-server"],
      "env": {
        "SOPHOS_CLIENT_ID": "your-client-id",
        "SOPHOS_CLIENT_SECRET": "your-client-secret",
        "TRANSPORT": "stdio"
      }
    }
  }
}
```

> **If you already have other MCP servers configured**, don't replace the whole file — just add the `"sophos-central": { ... }` entry alongside your existing servers inside the `"mcpServers"` object.

Replace `your-client-id` and `your-client-secret` with your [Sophos Central API credentials](#creating-api-credentials). Restart Claude Desktop after saving — it will download and run the server automatically on first use.

### Claude Code

Run this once in your terminal. The `-e` flags save the credentials permanently to Claude Code's MCP config so you don't need to re-export them each session:

```bash
claude mcp add sophos-central \
  -e SOPHOS_CLIENT_ID="your-client-id" \
  -e SOPHOS_CLIENT_SECRET="your-client-secret" \
  -e TRANSPORT="stdio" \
  -- npx -y sophos-central-mcp-server
```


## Features

- **Universal caller support**: Works with partner, organisation, and tenant-level API credentials
- **Multi-tenant**: Partner/org callers can query across all managed tenants
- **Partner gap analysis**: Single-call sales opportunity report across all managed tenants — fetches health data in parallel and returns a compact ranked list of security gaps per customer
- **Auto region routing**: Discovers tenant data regions via `/whoami/v1` and routes requests to the correct regional API host
- **Token lifecycle**: Automatic OAuth2 token refresh before expiry
- **Rate limit handling**: Retry with backoff on 429 responses
- **Dual transport**: Streamable HTTP (for Claude Desktop / Claude Code) or stdio
- **Full API coverage**: 266 tools across endpoints, alerts, policies, firewalls, email, mobile, XDR, cases, SIEM, and more

## Prerequisites

- Node.js 20 or later
- Sophos Central API credentials (Client ID + Client Secret)

### Creating API Credentials

**Tenant-level**: In Sophos Central, go to **Settings > API Credentials Management** and create a new credential.

**Partner-level**: In the Sophos Partner Dashboard, create API credentials under **Settings > API Credentials**.

**Organisation-level**: In Sophos Central Enterprise, use **Global Settings > API Credentials Management**.

## Configuration

Copy `.env.example` to `.env` and set your credentials:

```
SOPHOS_CLIENT_ID=your-client-id
SOPHOS_CLIENT_SECRET=your-client-secret
PORT=3100
TRANSPORT=http
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SOPHOS_CLIENT_ID` | Yes | - | OAuth2 client ID |
| `SOPHOS_CLIENT_SECRET` | Yes | - | OAuth2 client secret |
| `SOPHOS_TENANT_ID` | No | - | Lock to a single tenant (useful for tenant-level creds) |
| `PORT` | No | 3100 | HTTP server port |
| `TRANSPORT` | No | http | `http` for streamable HTTP, `stdio` for subprocess mode |

## Tools

### Partner & Organisation (18 tools)

> These tools are only available with **partner or organisation-level** credentials. They operate across all managed tenants.

| Tool | Description |
|------|-------------|
| `sophos_list_tenants` | List all managed tenants with IDs, names, and data regions |
| `sophos_list_account_health` | Bulk health scores for all tenants, ranked worst-first |
| `sophos_partner_gap_analysis` | Security gap and upsell opportunity report across all tenants |
| `sophos_create_tenant` | Create a new managed tenant |
| `sophos_get_managed_tenant` | Get managed tenant details |
| `sophos_list_partner_roles` | List partner-level roles |
| `sophos_get_partner_role` | Get partner role detail |
| `sophos_create_partner_role` | Create a partner role |
| `sophos_delete_partner_role` | Delete a partner role |
| `sophos_list_partner_permission_sets` | List available partner permission sets |
| `sophos_list_partner_admins` | List partner administrators |
| `sophos_get_partner_admin` | Get partner admin detail |
| `sophos_create_partner_admin` | Create a partner admin |
| `sophos_delete_partner_admin` | Delete a partner admin |
| `sophos_list_partner_admin_role_assignments` | List admin role assignments |
| `sophos_add_partner_admin_role_assignment` | Add role assignment to admin |
| `sophos_delete_partner_admin_role_assignment` | Remove role assignment |
| `sophos_get_billing_usage` | Get billing usage summary |

### Alerts (4 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_alerts` | List alerts with severity/category/product/date filters |
| `sophos_get_alert` | Get full alert detail with allowed actions |
| `sophos_acknowledge_alert` | Mark an alert as reviewed |
| `sophos_search_alerts` | Advanced search with structured filters and sorting |

### Endpoints (18 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_endpoints` | List endpoints with health/OS/hostname/isolation filters |
| `sophos_get_endpoint` | Get full endpoint detail |
| `sophos_scan_endpoint` | Trigger an on-demand scan |
| `sophos_isolate_endpoint` | Network-isolate a compromised endpoint |
| `sophos_release_endpoint` | Release an endpoint from isolation |
| `sophos_delete_endpoint` | Delete a specific endpoint |
| `sophos_bulk_delete_endpoints` | Bulk delete multiple endpoints |
| `sophos_get_tamper_protection` | Get tamper protection status and password |
| `sophos_toggle_tamper_protection` | Enable/disable tamper protection |
| `sophos_get_adaptive_attack_protection` | Get adaptive attack protection status |
| `sophos_toggle_adaptive_attack_protection` | Enable/disable adaptive attack protection |
| `sophos_trigger_update_check` | Trigger a software update check |
| `sophos_request_forensic_logs` | Request forensic log upload |
| `sophos_get_forensic_log_status` | Get forensic log request status |
| `sophos_request_memory_dump` | Request memory dump from endpoint |
| `sophos_get_memory_dump_status` | Get memory dump request status |
| `sophos_bulk_isolate_endpoints` | Bulk isolate/release multiple endpoints |
| `sophos_get_endpoint_isolation_status` | Get endpoint isolation status |

### Endpoint Settings (32 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_installer_downloads` | List available installer packages |
| `sophos_get_installer_download` | Get specific installer download link |
| `sophos_list_blocked_addresses` | List blocked network addresses |
| `sophos_add_blocked_address` | Add a blocked network address |
| `sophos_delete_blocked_address` | Delete a blocked address |
| `sophos_list_local_sites` | List web control local site definitions |
| `sophos_add_local_site` | Add a local site for web control |
| `sophos_update_local_site` | Update a local site |
| `sophos_delete_local_site` | Delete a local site |
| `sophos_list_web_control_categories` | List web control categories |
| `sophos_get_tls_decryption_settings` | Get TLS decryption settings |
| `sophos_update_tls_decryption_settings` | Update TLS decryption settings |
| `sophos_get_global_tamper_protection` | Get global tamper protection settings |
| `sophos_update_global_tamper_protection` | Update global tamper protection |
| `sophos_list_detected_exploits` | List detected exploits |
| `sophos_get_detected_exploit` | Get exploit detail |
| `sophos_list_exploit_mitigation_categories` | List exploit mitigation categories |
| `sophos_get_exploit_mitigation_category` | Get category detail |
| `sophos_list_exploit_mitigation_apps` | List exploit mitigation applications |
| `sophos_get_exploit_mitigation_app` | Get application detail |
| `sophos_add_exploit_mitigation_app` | Add application to exploit mitigation |
| `sophos_update_exploit_mitigation_app` | Update exploit mitigation application |
| `sophos_list_ips_exclusions` | List IPS exclusions |
| `sophos_add_ips_exclusion` | Add IPS exclusion |
| `sophos_delete_ips_exclusion` | Delete IPS exclusion |
| `sophos_list_isolation_exclusions` | List isolation exclusions |
| `sophos_add_isolation_exclusion` | Add isolation exclusion |
| `sophos_delete_isolation_exclusion` | Delete isolation exclusion |
| `sophos_get_lockdown_settings` | Get server lockdown settings |
| `sophos_update_lockdown_settings` | Update server lockdown settings |
| `sophos_get_mtr_settings` | Get MDR/MTR settings |
| `sophos_update_mtr_settings` | Update MDR/MTR settings |

### Endpoint Migrations (7 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_migrations` | List endpoint migration jobs |
| `sophos_get_migration` | Get migration job details |
| `sophos_create_migration` | Create a new migration job |
| `sophos_delete_migration` | Delete a migration job |
| `sophos_list_migration_endpoints` | List endpoints in a migration |
| `sophos_list_recommended_packages` | List recommended software packages |
| `sophos_list_static_packages` | List static software packages |

### Policies (6 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_policies` | List endpoint policies with optional type filter |
| `sophos_get_policy` | Get full policy detail including all settings |
| `sophos_create_policy` | Create a new endpoint policy |
| `sophos_clone_policy` | Clone an existing policy under a new name |
| `sophos_update_policy` | Update policy name, enabled state, priority, or settings |
| `sophos_delete_policy` | Delete a policy |

### Endpoint Groups (7 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_endpoint_groups` | List endpoint groups |
| `sophos_get_endpoint_group` | Get group detail with optional member list |
| `sophos_create_endpoint_group` | Create a new endpoint group |
| `sophos_update_endpoint_group` | Rename or update a group |
| `sophos_delete_endpoint_group` | Delete an endpoint group |
| `sophos_add_endpoints_to_group` | Add endpoints to a group |
| `sophos_remove_endpoint_from_group` | Remove an endpoint from a group |

### Exclusions & Allow/Block Lists (9 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_exclusions` | List global scanning exclusions |
| `sophos_add_exclusion` | Add a scanning exclusion |
| `sophos_delete_exclusion` | Delete a scanning exclusion |
| `sophos_list_allowed_items` | List globally allowed items |
| `sophos_add_allowed_item` | Allow an item by SHA256, path, or certificate |
| `sophos_delete_allowed_item` | Remove an allowed item |
| `sophos_list_blocked_items` | List globally blocked items |
| `sophos_add_blocked_item` | Block an item by SHA256, path, or certificate |
| `sophos_delete_blocked_item` | Remove a blocked item |

### Account Health (3 tools)

| Tool | Description |
|------|-------------|
| `sophos_get_account_health` | Get tenant health check scores |
| `sophos_list_account_health` | Bulk health scores for all tenants (partner/org only) |
| `sophos_partner_gap_analysis` | Gap analysis across all tenants (partner/org only) |

### Directory Users & Groups (17 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_users` | List directory users |
| `sophos_get_user` | Get user detail |
| `sophos_create_user` | Create a directory user |
| `sophos_update_user` | Update a user |
| `sophos_delete_user` | Delete a user |
| `sophos_list_user_groups` | List directory user groups |
| `sophos_get_user_group` | Get user group detail |
| `sophos_create_user_group` | Create a user group |
| `sophos_update_user_group` | Update a user group |
| `sophos_delete_user_group` | Delete a user group |
| `sophos_list_user_group_members` | List members of a user group |
| `sophos_add_users_to_group` | Add users to a group |
| `sophos_remove_user_from_group` | Remove a user from a group |
| `sophos_list_user_group_endpoints` | List endpoints in a user group |
| `sophos_list_user_group_policies` | List policies assigned to a user group |
| `sophos_list_admins` | List admin accounts and roles |
| `sophos_list_roles` | List available admin roles |

### Admin Management (14 tools)

| Tool | Description |
|------|-------------|
| `sophos_get_admin` | Get admin detail |
| `sophos_create_admin` | Create an admin account |
| `sophos_delete_admin` | Delete an admin account |
| `sophos_list_admin_role_assignments` | List admin's role assignments |
| `sophos_add_admin_role_assignment` | Add role assignment to admin |
| `sophos_delete_admin_role_assignment` | Remove role assignment |
| `sophos_get_admin_role_assignment` | Get specific role assignment |
| `sophos_create_role` | Create an admin role |
| `sophos_get_role` | Get role detail |
| `sophos_update_role` | Update a role |
| `sophos_delete_role` | Delete a role |
| `sophos_list_permission_sets` | List available permission sets |
| `sophos_list_admin_authenticators` | List admin's authenticators |
| `sophos_reset_admin_password` | Reset an admin's password |

### Cases (9 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_cases` | List investigation cases |
| `sophos_get_case` | Get full case details |
| `sophos_create_case` | Create a new investigation case |
| `sophos_update_case` | Update case status, severity, assignee |
| `sophos_delete_case` | Delete a case |
| `sophos_list_case_detections` | List detections linked to a case |
| `sophos_get_case_detection` | Get specific detection detail |
| `sophos_list_case_impacted_entities` | List impacted entities for a case |
| `sophos_get_case_mitre_summary` | Get MITRE ATT&CK breakdown for a case |

### Detections (6 tools)

Async API — start a query, poll for completion, then fetch results.

| Tool | Description |
|------|-------------|
| `sophos_run_detections_query` | Start async query for individual detections |
| `sophos_get_detections_run` | Poll detection query status |
| `sophos_get_detections_results` | Fetch completed detection query results |
| `sophos_run_detection_groups_query` | Start async query for grouped detections |
| `sophos_get_detection_groups_run` | Poll detection groups query status |
| `sophos_get_detection_groups_results` | Fetch completed detection groups results |

### SIEM (2 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_siem_events` | Stream security events (cursor-based, last 24h default) |
| `sophos_list_siem_alerts` | Stream security alerts (cursor-based, last 24h default) |

### XDR Data Lake (9 tools)

Async API — submit SQL queries against historical telemetry.

| Tool | Description |
|------|-------------|
| `sophos_run_xdr_query` | Start async SQL query against the Data Lake |
| `sophos_get_xdr_query_run` | Poll XDR query run status |
| `sophos_get_xdr_query_results` | Fetch completed XDR query results |
| `sophos_list_xdr_query_runs` | List XDR query runs |
| `sophos_cancel_xdr_query_run` | Cancel a running XDR query |
| `sophos_list_xdr_query_categories` | List XDR query categories |
| `sophos_get_xdr_query_category` | Get XDR query category detail |
| `sophos_list_xdr_queries` | List saved XDR queries |
| `sophos_get_xdr_query` | Get saved XDR query detail |

### Live Discover (4 tools)

Async API — run OSquery SQL on live endpoints. Rate limited to 10 runs/minute, 500/day.

| Tool | Description |
|------|-------------|
| `sophos_list_live_discover_queries` | List available saved OSquery queries |
| `sophos_run_live_discover_query` | Run a saved or ad hoc query on live endpoints |
| `sophos_get_live_discover_run` | Poll Live Discover run status |
| `sophos_get_live_discover_results` | Fetch Live Discover results |

### Firewall (19 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_firewalls` | List managed firewalls |
| `sophos_get_firewall` | Get firewall detail |
| `sophos_update_firewall` | Update firewall properties |
| `sophos_delete_firewall` | Delete a firewall |
| `sophos_firewall_action` | Perform action (reboot, sync, upgrade check) |
| `sophos_check_firmware_upgrade` | Check for firmware upgrades |
| `sophos_start_firmware_upgrade` | Start a firmware upgrade |
| `sophos_cancel_firmware_upgrade` | Cancel a firmware upgrade |
| `sophos_list_firewall_groups` | List firewall groups |
| `sophos_get_firewall_group` | Get firewall group detail |
| `sophos_create_firewall_group` | Create a firewall group |
| `sophos_update_firewall_group` | Update a firewall group |
| `sophos_delete_firewall_group` | Delete a firewall group |
| `sophos_get_firewall_sync_status` | Get firewall sync status |
| `sophos_get_threat_feed_settings` | Get MDR threat feed settings |
| `sophos_update_threat_feed_settings` | Update threat feed settings |
| `sophos_list_threat_feed_indicators` | List threat feed indicators |
| `sophos_search_threat_feed_indicators` | Search threat feed indicators |
| `sophos_get_threat_feed_indicator` | Get specific threat indicator |

### Email Protection (30 tools)

| Tool | Description |
|------|-------------|
| `sophos_search_quarantine` | Search quarantined emails |
| `sophos_preview_quarantine_message` | Preview quarantined email content |
| `sophos_get_quarantine_urls` | Get URLs in quarantined email |
| `sophos_get_quarantine_attachments` | Get quarantined email attachment info |
| `sophos_release_quarantine_message` | Release quarantined email to recipient |
| `sophos_delete_quarantine_message` | Permanently delete quarantined email |
| `sophos_strip_quarantine_attachments` | Strip attachments and release |
| `sophos_reattach_quarantine_attachments` | Reattach stripped attachments |
| `sophos_download_quarantine_attachment` | Download specific attachment |
| `sophos_search_post_delivery_quarantine` | Search post-delivery quarantine |
| `sophos_preview_post_delivery_message` | Preview post-delivery quarantined message |
| `sophos_get_post_delivery_attachments` | Get post-delivery attachment info |
| `sophos_release_post_delivery_message` | Release post-delivery message |
| `sophos_delete_post_delivery_message` | Delete post-delivery message |
| `sophos_download_post_delivery_attachment` | Download post-delivery attachment |
| `sophos_clawback_message` | Clawback/recall a delivered message |
| `sophos_get_clawback_status` | Get clawback action status |
| `sophos_list_mailboxes` | List mailboxes |
| `sophos_create_mailbox` | Create a mailbox |
| `sophos_bulk_create_mailboxes` | Bulk create mailboxes |
| `sophos_get_mailbox` | Get mailbox detail |
| `sophos_update_mailbox` | Update a mailbox |
| `sophos_delete_mailbox` | Delete a mailbox |
| `sophos_list_mailbox_aliases` | List mailbox aliases |
| `sophos_add_mailbox_alias` | Add a mailbox alias |
| `sophos_delete_mailbox_alias` | Delete a mailbox alias |
| `sophos_list_mailbox_delegates` | List mailbox delegates |
| `sophos_add_mailbox_delegate` | Add a mailbox delegate |
| `sophos_delete_mailbox_delegate` | Remove a mailbox delegate |
| `sophos_get_email_settings` | Get email protection settings |

### Mobile Device Management (38 tools)

| Tool | Description |
|------|-------------|
| `sophos_get_mobile_auto_enrollment` | Get auto-enrollment settings |
| `sophos_update_mobile_auto_enrollment` | Update auto-enrollment settings |
| `sophos_list_mobile_os` | List supported mobile OS platforms |
| `sophos_list_mobile_devices` | List mobile devices with filters |
| `sophos_get_mobile_device` | Get device detail |
| `sophos_create_mobile_device` | Enroll a new mobile device |
| `sophos_update_mobile_device` | Update device properties |
| `sophos_delete_mobile_device` | Delete/unenroll a device |
| `sophos_list_mobile_device_properties` | Get device properties |
| `sophos_get_mobile_device_compliance` | Get compliance status |
| `sophos_get_mobile_device_scans` | Get scan results |
| `sophos_get_mobile_device_policies` | Get assigned policies |
| `sophos_get_mobile_device_apps` | Get installed apps |
| `sophos_get_mobile_device_location` | Get device location |
| `sophos_list_mobile_device_groups` | List device groups |
| `sophos_get_mobile_device_group` | Get device group detail |
| `sophos_create_mobile_device_group` | Create a device group |
| `sophos_update_mobile_device_group` | Update a device group |
| `sophos_delete_mobile_device_group` | Delete a device group |
| `sophos_sync_mobile_device` | Sync a device |
| `sophos_request_mobile_device_logs` | Request device logs |
| `sophos_scan_mobile_device` | Trigger device scan |
| `sophos_unenroll_mobile_device` | Unenroll a device |
| `sophos_send_mobile_device_message` | Send message to device |
| `sophos_locate_mobile_device` | Request device location update |
| `sophos_lock_mobile_device` | Lock device remotely |
| `sophos_wipe_mobile_device` | Wipe device remotely |
| `sophos_list_mobile_app_groups` | List app groups |
| `sophos_get_mobile_app_group` | Get app group detail |
| `sophos_create_mobile_app_group` | Create an app group |
| `sophos_update_mobile_app_group` | Update an app group |
| `sophos_delete_mobile_app_group` | Delete an app group |
| `sophos_list_mobile_policies` | List mobile policies |
| `sophos_get_mobile_policy` | Get mobile policy detail |
| `sophos_update_mobile_policy` | Update a mobile policy |
| `sophos_list_mobile_profiles` | List mobile profiles |
| `sophos_get_mobile_profile` | Get mobile profile detail |
| `sophos_update_mobile_profile` | Update a mobile profile |

### DNS Protection (5 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_dns_locations` | List DNS protection locations |
| `sophos_get_dns_location` | Get location detail |
| `sophos_create_dns_location` | Create a DNS location |
| `sophos_update_dns_location` | Update a DNS location |
| `sophos_delete_dns_location` | Delete a DNS location |

### Cloud Security (6 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_cloud_security_profiles` | List cloud security profiles |
| `sophos_get_cloud_security_profile` | Get profile detail |
| `sophos_create_cloud_security_profile` | Create a cloud security profile |
| `sophos_update_cloud_security_profile` | Update a profile |
| `sophos_delete_cloud_security_profile` | Delete a profile |
| `sophos_list_cloud_security_assets` | List cloud security assets |

### Wi-Fi (3 tools)

| Tool | Description |
|------|-------------|
| `sophos_list_wifi_mac_filters` | List Wi-Fi MAC filtering entries |
| `sophos_add_wifi_mac_filter` | Add a MAC filter entry |
| `sophos_delete_wifi_mac_filter` | Delete a MAC filter entry |

### User Activity (2 tools)

| Tool | Description |
|------|-------------|
| `sophos_create_attestation` | Create a user attestation/sign-off |
| `sophos_get_attestation` | Get attestation detail |

### Tenant context

For **partner/org** callers, every tenant-scoped tool requires a `tenant_id` parameter. Use `sophos_list_tenants` first to discover available tenant IDs.

For **tenant-level** callers, `tenant_id` is optional and defaults to the authenticated tenant.

## Architecture

```
Authenticate (OAuth2 client credentials)
    |
    v
/whoami/v1 -> Discover identity type (partner | organization | tenant)
    |
    v
If partner/org: enumerate tenants, cache {tenantId -> apiHost}
    |
    v
Register tools based on identity type
    |
    v
Per tool call: resolve tenant -> regional API host -> execute request
```

### Key decisions

- **Dynamic tool registration**: Only tools valid for the caller type are exposed to the LLM
- **Explicit tenant context**: Partner/org callers must specify `tenant_id` to prevent cross-tenant accidents
- **Stateless HTTP**: Each MCP request creates a fresh transport instance (no session affinity)
- **Localhost binding**: HTTP server binds to `127.0.0.1` only

## Project Structure

```
src/
├── index.ts                     # Entry point, server bootstrap
├── config/config.ts             # Environment config
├── auth/token-manager.ts        # OAuth2 token lifecycle
├── client/
│   ├── sophos-client.ts         # HTTP client with region routing
│   └── tenant-resolver.ts       # Whoami + tenant cache
├── tools/
│   ├── helpers.ts               # Shared response formatting
│   ├── tenants.ts               # Tenant listing (partner/org only)
│   ├── partner.ts               # Partner admin, roles, billing (partner/org only)
│   ├── alerts.ts                # Alert list, get, acknowledge, search
│   ├── endpoints.ts             # Endpoint CRUD, scan, isolate, tamper, forensics
│   ├── endpoint-settings.ts     # Installer, web control, exploit mitigation, IPS, etc.
│   ├── endpoint-migrations.ts   # Migration jobs, software packages
│   ├── health.ts                # Account health, gap analysis
│   ├── directory.ts             # Users, user groups, group membership
│   ├── admin-management.ts      # Admin CRUD, roles, permission sets
│   ├── policies.ts              # Policy CRUD, clone
│   ├── groups.ts                # Endpoint group CRUD, membership
│   ├── exclusions.ts            # Scanning exclusions, allowed/blocked items
│   ├── cases.ts                 # Investigation cases, detections, MITRE
│   ├── detections.ts            # Detection queries (async)
│   ├── siem.ts                  # SIEM events and alerts
│   ├── xdr.ts                   # XDR Data Lake queries (async)
│   ├── live-discover.ts         # Live Discover queries (async)
│   ├── firewall.ts              # Firewall CRUD, firmware, groups, threat feed
│   ├── email.ts                 # Quarantine, mailboxes, message actions
│   ├── mobile.ts                # Mobile devices, groups, actions, policies
│   ├── dns-protection.ts        # DNS locations
│   ├── cloud-security.ts        # Cloud security profiles, assets
│   ├── wifi.ts                  # Wi-Fi MAC filtering
│   └── user-activity.ts         # User attestations
└── types/sophos.ts              # Sophos API response types
```

## Security

- Credentials are read from environment variables only, never logged
- JWT tokens are held in memory with automatic refresh
- HTTP server binds to `127.0.0.1` (localhost only)
- Write actions have `destructiveHint` annotations so clients can warn users
- Partner/org callers require explicit `tenant_id` on every call

## License

MIT
