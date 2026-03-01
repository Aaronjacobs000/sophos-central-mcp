/**
 * Environment-based configuration for Sophos Central MCP Server.
 * Credentials are read from environment variables only.
 */

export interface SophosConfig {
  clientId: string;
  clientSecret: string;
  tenantId?: string;
  port: number;
  transport: "http" | "stdio";
}

export function loadConfig(): SophosConfig {
  const clientId = process.env.SOPHOS_CLIENT_ID;
  const clientSecret = process.env.SOPHOS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing required environment variables: SOPHOS_CLIENT_ID and SOPHOS_CLIENT_SECRET must be set."
    );
  }

  return {
    clientId,
    clientSecret,
    tenantId: process.env.SOPHOS_TENANT_ID || undefined,
    port: parseInt(process.env.PORT || "3100", 10),
    transport: (process.env.TRANSPORT as "http" | "stdio") || "http",
  };
}

// Sophos Central global API endpoints
export const SOPHOS_AUTH_URL = "https://id.sophos.com/api/v2/oauth2/token";
export const SOPHOS_GLOBAL_API = "https://api.central.sophos.com";

// Response size limits
export const CHARACTER_LIMIT = 25000;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
