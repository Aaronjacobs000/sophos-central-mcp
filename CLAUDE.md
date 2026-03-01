# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # Compile TypeScript to dist/
npm start           # Run the compiled server
npm run dev         # Watch mode (tsc --watch)
```

There are no tests. TypeScript compilation (`npm run build`) is the main verification step — fix all type errors before considering a change complete.

Run the server locally:
```bash
cp .env.example .env   # Then fill in credentials
npm run build && npm start
```

## Architecture

This is a **Model Context Protocol (MCP) server** that wraps the Sophos Central REST API, built with `@modelcontextprotocol/sdk`, Express (HTTP transport), and Zod (schema validation). TypeScript ESM (`"type": "module"`, `Node16` module resolution) — all imports must use `.js` extensions.

### Startup flow (`src/index.ts`)

1. Load config from env vars (`src/config/config.ts`)
2. `TokenManager` fetches an OAuth2 token from `https://id.sophos.com/api/v2/oauth2/token`
3. `TenantResolver.init()` calls `/whoami/v1` to discover caller identity type: `partner | organization | tenant`
4. For partner/org callers, `loadTenants()` paginates through all managed tenants and caches `tenantId → apiHost`
5. Tools are registered conditionally: `sophos_list_tenants` only for partner/org; all others always
6. Transport starts: streamable HTTP on `127.0.0.1:PORT/mcp` (stateless, new transport per request) or stdio

### Core classes

- **`TokenManager`** (`src/auth/token-manager.ts`): OAuth2 client credentials flow with in-memory token caching (60s early refresh, deduplicates concurrent refresh calls)
- **`TenantResolver`** (`src/client/tenant-resolver.ts`): Holds caller identity and `tenantId → TenantInfo` map. Key methods: `resolveTenantId(providedId?)` — enforces that partner/org callers must supply a tenant ID; `resolveApiHost(tenantId)` — returns the per-tenant regional API host
- **`SophosClient`** (`src/client/sophos-client.ts`): Two methods — `tenantRequest<T>(tenantId, path, opts)` and `globalRequest<T>(path, opts)`. Both inject auth headers and run `executeWithRetry` (2 retries, exponential backoff, respects `Retry-After` on 429, no retry on 401/403/404)

### Tool registration pattern

Each file in `src/tools/` exports a `register*Tools(server, client, tenantResolver)` function. Tools follow this pattern:

```typescript
server.registerTool(
  "sophos_tool_name",
  { title, description, inputSchema: { /* Zod fields */ }, annotations: { readOnlyHint, destructiveHint, ... } },
  withErrorHandling(async (args) => {
    const tenantId = tenantResolver.resolveTenantId(args.tenant_id);
    const data = await client.tenantRequest<ResponseType>(tenantId, "/api/path", { params, method, body });
    return jsonResult(formatData(data));
  })
);
```

Helper functions in `src/tools/helpers.ts`:
- `jsonResult(data)` — JSON-serialises and truncates at `CHARACTER_LIMIT` (25,000 chars) with a truncation notice
- `errorResult(error)` — formats errors as MCP error responses
- `withErrorHandling(handler)` — wraps handlers to catch and return errors cleanly

### Adding a new tool

1. Create (or add to) a file in `src/tools/`
2. Add Sophos API response types to `src/types/sophos.ts` if needed
3. Export a `register*Tools(server, client, tenantResolver)` function
4. Import and call it in `src/index.ts`
5. All tenant-scoped tools must call `tenantResolver.resolveTenantId(args.tenant_id)` first — this throws with a useful message for partner/org callers who omit `tenant_id`

### Pagination

- Endpoint APIs use cursor-based pagination (`pageFromKey` / `nextKey`)
- Most other APIs use offset-based pagination (`page` / `pageSize`)
- `DEFAULT_PAGE_SIZE = 50`, `MAX_PAGE_SIZE = 100` from `src/config/config.ts`

### Constants (`src/config/config.ts`)

| Constant | Value |
|---|---|
| `SOPHOS_AUTH_URL` | `https://id.sophos.com/api/v2/oauth2/token` |
| `SOPHOS_GLOBAL_API` | `https://api.central.sophos.com` |
| `CHARACTER_LIMIT` | `25000` |
| `DEFAULT_PAGE_SIZE` | `50` |
