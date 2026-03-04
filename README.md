# Sophos Central MCP Server

MCP (Model Context Protocol) server for interacting with Sophos Central APIs. Supports partner, organisation, and single-tenant credential types with automatic region routing.

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
- **Auto region routing**: Discovers tenant data regions via `/whoami/v1` and routes requests to the correct regional API host
- **Token lifecycle**: Automatic OAuth2 token refresh before expiry
- **Rate limit handling**: Retry with backoff on 429 responses
- **Dual transport**: Streamable HTTP (for Claude Desktop / Claude Code) or stdio

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

### SOC Monitoring

| Tool | Description |
|------|-------------|
| `sophos_list_tenants` | List managed tenants (partner/org only) |
| `sophos_list_account_health` | Bulk health scores across all tenants, ranked worst-first (partner/org only) |
| `sophos_partner_gap_analysis` | Security gap and upsell opportunity analysis across all tenants — compact, actionable summary sorted by most opportunities first (partner/org only) |
| `sophos_list_alerts` | List alerts with severity/category/product/date filters |
| `sophos_get_alert` | Get full alert detail with allowed actions |
| `sophos_acknowledge_alert` | Mark an alert as reviewed |
| `sophos_list_endpoints` | List endpoints with health/OS/hostname/isolation filters |
| `sophos_get_endpoint` | Get full endpoint detail |
| `sophos_scan_endpoint` | Trigger an on-demand scan |
| `sophos_isolate_endpoint` | Network-isolate a compromised endpoint |
| `sophos_release_endpoint` | Release an endpoint from isolation |
| `sophos_get_account_health` | Get tenant health check scores |
| `sophos_list_users` | List directory users |
| `sophos_list_admins` | List admin accounts and roles |
| `sophos_list_roles` | List available admin roles |

### Admin Automation

| Tool | Description |
|------|-------------|
| `sophos_list_policies` | List endpoint policies with optional type filter |
| `sophos_get_policy` | Get full policy detail including all settings |
| `sophos_clone_policy` | Clone an existing policy under a new name |
| `sophos_update_policy` | Update policy name, enabled state, priority, or settings |
| `sophos_list_endpoint_groups` | List endpoint groups |
| `sophos_get_endpoint_group` | Get group detail with optional member endpoint list |
| `sophos_create_endpoint_group` | Create a new endpoint group |
| `sophos_update_endpoint_group` | Rename or update a group's description |
| `sophos_delete_endpoint_group` | Delete an endpoint group |
| `sophos_add_endpoints_to_group` | Add endpoints to a group |
| `sophos_remove_endpoint_from_group` | Remove an endpoint from a group |
| `sophos_list_exclusions` | List global scanning exclusions |
| `sophos_add_exclusion` | Add a scanning exclusion (path, process, web, PUA, AMSI) |
| `sophos_delete_exclusion` | Delete a scanning exclusion |
| `sophos_list_allowed_items` | List globally allowed items |
| `sophos_add_allowed_item` | Allow an item by SHA256, path, or certificate signer |
| `sophos_delete_allowed_item` | Remove an allowed item |
| `sophos_list_blocked_items` | List globally blocked items |
| `sophos_add_blocked_item` | Block an item by SHA256, path, or certificate signer |
| `sophos_delete_blocked_item` | Remove a blocked item |

### Investigation

#### Cases

| Tool | Description |
|------|-------------|
| `sophos_list_cases` | List investigation cases with pagination |
| `sophos_get_case` | Get full case details |
| `sophos_create_case` | Create a new self-managed investigation case |
| `sophos_update_case` | Update case status, severity, assignee, or overview |
| `sophos_list_case_detections` | List detections linked to a case |
| `sophos_get_case_mitre_summary` | Get MITRE ATT&CK tactic/technique breakdown for a case |

#### Detections

Async API — start a query, poll for completion, then fetch results.

| Tool | Description |
|------|-------------|
| `sophos_run_detections_query` | Start an async query for individual XDR/EDR detections |
| `sophos_get_detections_run` | Poll the status of a detections query run |
| `sophos_get_detections_results` | Fetch results from a completed detections query |
| `sophos_run_detection_groups_query` | Start an async query for grouped detections |
| `sophos_get_detection_groups_run` | Poll the status of a detection groups query run |
| `sophos_get_detection_groups_results` | Fetch results from a completed detection groups query |

#### SIEM Events

| Tool | Description |
|------|-------------|
| `sophos_list_siem_events` | Stream security events via cursor-based pagination (last 24h) |
| `sophos_list_siem_alerts` | Stream security alerts via cursor-based pagination (last 24h) |

#### XDR Data Lake

Async API — submit a SQL query against historical telemetry, poll for completion, then fetch results.

| Tool | Description |
|------|-------------|
| `sophos_run_xdr_query` | Start an async SQL query against the Sophos Data Lake |
| `sophos_get_xdr_query_run` | Poll the status of an XDR query run |
| `sophos_get_xdr_query_results` | Fetch paginated results from a completed XDR query |

#### Live Discover

Async API — run OSquery SQL on live endpoints in real time. Rate limited to 10 runs/minute, 500/day.

| Tool | Description |
|------|-------------|
| `sophos_list_live_discover_queries` | List available saved OSquery queries |
| `sophos_run_live_discover_query` | Run a saved or ad hoc OSquery against live endpoints |
| `sophos_get_live_discover_run` | Poll the status of a Live Discover query run |
| `sophos_get_live_discover_results` | Fetch paginated results from a completed Live Discover run |

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
├── index.ts                  # Entry point, server bootstrap
├── config/config.ts          # Environment config
├── auth/token-manager.ts     # OAuth2 token lifecycle
├── client/
│   ├── sophos-client.ts      # HTTP client with region routing
│   └── tenant-resolver.ts    # Whoami + tenant cache
├── tools/
│   ├── helpers.ts            # Shared response formatting
│   ├── tenants.ts            # sophos_list_tenants, sophos_list_account_health
│   ├── alerts.ts             # sophos_list_alerts, get, acknowledge
│   ├── endpoints.ts          # sophos_list/get/scan/isolate/release
│   ├── health.ts             # sophos_get_account_health
│   ├── directory.ts          # sophos_list_users, list_admins, list_roles
│   ├── policies.ts           # sophos_list/get/clone/update_policy
│   ├── groups.ts             # sophos_list/get/create/update/delete_endpoint_group, add/remove endpoints
│   ├── exclusions.ts         # sophos_list/add/delete exclusions, allowed items, blocked items
│   ├── cases.ts              # sophos_list/get/create/update_case, list_case_detections, mitre_summary
│   ├── detections.ts         # sophos_run/get/results for detections and detection-groups
│   ├── siem.ts               # sophos_list_siem_events, sophos_list_siem_alerts
│   ├── xdr.ts                # sophos_run/get/results for XDR Data Lake queries
│   └── live-discover.ts      # sophos_list_queries, run/get/results for Live Discover
└── types/sophos.ts           # Sophos API response types
```

## Security

- Credentials are read from environment variables only, never logged
- JWT tokens are held in memory with automatic refresh
- HTTP server binds to `127.0.0.1` (localhost only)
- Write actions have `destructiveHint` annotations so clients can warn users
- Partner/org callers require explicit `tenant_id` on every call

## License

MIT
