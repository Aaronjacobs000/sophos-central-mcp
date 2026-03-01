/**
 * TypeScript type definitions for Sophos Central API responses.
 */

// --- Auth ---

export interface SophosTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  errorCode?: string;
  message?: string;
}

// --- Whoami ---

export type SophosIdType = "partner" | "organization" | "tenant";

export interface SophosWhoamiResponse {
  id: string;
  idType: SophosIdType;
  apiHosts: {
    global: string;
    dataRegion?: string;
  };
}

// --- Tenants ---

export interface SophosTenant {
  id: string;
  name: string;
  dataGeography: string;
  dataRegion: string;
  billingType: string;
  apiHost: string;
  status?: string;
  partner?: { id: string };
  organization?: { id: string };
}

export interface SophosTenantPage {
  pages: {
    current: number;
    size: number;
    total: number;
    maxSize: number;
  };
  items: SophosTenant[];
}

// --- Alerts ---

export interface SophosAlert {
  id: string;
  allowedActions: string[];
  category: string;
  description: string;
  groupKey: string;
  managedAgent?: {
    id: string;
    type: string;
  };
  person?: {
    id: string;
  };
  product: string;
  raisedAt: string;
  severity: string;
  tenant: {
    id: string;
    name?: string;
  };
  type: string;
}

export interface SophosAlertPage {
  pages: {
    current: number;
    size: number;
    total: number;
    maxSize: number;
    items?: number;
  };
  items: SophosAlert[];
}

// --- Endpoints ---

export interface SophosEndpoint {
  id: string;
  type: string;
  tenant: { id: string };
  hostname: string;
  health: {
    overall: string;
    threats: { status: string };
    services: {
      status: string;
      serviceDetails?: Array<{
        name: string;
        status: string;
      }>;
    };
  };
  os: {
    isServer: boolean;
    platform: string;
    name: string;
    majorVersion: number;
    minorVersion: number;
    build?: number;
  };
  ipv4Addresses?: string[];
  ipv6Addresses?: string[];
  macAddresses?: string[];
  associatedPerson?: {
    name?: string;
    viaLogin?: string;
    id?: string;
  };
  tamperProtectionEnabled: boolean;
  assignedProducts?: Array<{
    code: string;
    version: string;
    status: string;
  }>;
  lastSeenAt?: string;
  groupId?: string;
  groupName?: string;
  lockdown?: {
    status: string;
  };
  isolation?: {
    status: string;
  };
}

export interface SophosEndpointPage {
  pages: {
    fromKey?: string;
    nextKey?: string;
    size: number;
    maxSize: number;
    total?: number;
    current?: number;
    items?: number;
  };
  items: SophosEndpoint[];
}

// --- Account Health Check ---

export interface SophosHealthCheck {
  endpoint: {
    protection: {
      computer: { percentage: number; status: string };
      server?: { percentage: number; status: string };
    };
    policy?: Record<string, unknown>;
    exclusions?: Record<string, unknown>;
    tamperProtection?: Record<string, unknown>;
  };
}

// --- Generic Error ---

export interface SophosApiError {
  error: string;
  message: string;
  correlationId?: string;
  code?: string;
  createdAt?: string;
  requestId?: string;
  docUrl?: string;
}

// --- Generic paginated response wrapper ---

export interface SophosPagedResponse<T> {
  pages: {
    current?: number;
    size: number;
    total?: number;
    maxSize: number;
    items?: number;
    fromKey?: string;
    nextKey?: string;
  };
  items: T[];
}
