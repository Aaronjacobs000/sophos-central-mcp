# Sophos Central MCP Server

MCP (Model Context Protocol) server for interacting with Sophos Central APIs. Supports partner, organisation, and single-tenant credential types with automatic region routing.

## Quick Start

No installation needed. Add the following to your `claude_desktop_config.json` (Claude Desktop) or equivalent MCP client config:

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

Replace `your-client-id` and `your-client-secret` with your [Sophos Central API credentials](#creating-api-credentials). Claude Desktop will download and run the server automatically on first use.

### Claude Code

```bash
export SOPHOS_CLIENT_ID="xxx"
export SOPHOS_CLIENT_SECRET="yyy"
export TRANSPORT="stdio"
claude mcp add sophos-central -- npx -y sophos-central-mcp-server
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
│   ├── tenants.ts            # sophos_list_tenants
│   ├── alerts.ts             # sophos_list_alerts, get, acknowledge
│   ├── endpoints.ts          # sophos_list/get/scan/isolate/release
│   ├── health.ts             # sophos_get_account_health
│   └── directory.ts          # sophos_list_users, list_admins
└── types/sophos.ts           # Sophos API response types
```

## Roadmap

- **Phase 2 (Admin automation)**: Policies, endpoint groups, global exclusions, admin role management
- **Phase 3 (Investigation)**: XDR Data Lake queries, Live Discover, detections, cases, SIEM events

## Security

- Credentials are read from environment variables only, never logged
- JWT tokens are held in memory with automatic refresh
- HTTP server binds to `127.0.0.1` (localhost only)
- Write actions have `destructiveHint` annotations so clients can warn users
- Partner/org callers require explicit `tenant_id` on every call

## License

MIT
