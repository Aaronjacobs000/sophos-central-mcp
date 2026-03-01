/**
 * Manages OAuth2 client credentials authentication with Sophos Central.
 * Handles token acquisition and transparent refresh before expiry.
 */

import { SOPHOS_AUTH_URL } from "../config/config.js";
import type { SophosTokenResponse } from "../types/sophos.js";

export class TokenManager {
  private accessToken: string | null = null;
  private expiresAt: number = 0;
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  /**
   * Returns a valid access token, refreshing if needed.
   * Deduplicates concurrent refresh requests.
   */
  async getToken(): Promise<string> {
    // If token is valid for at least 60 more seconds, return it
    if (this.accessToken && Date.now() < this.expiresAt - 60_000) {
      return this.accessToken;
    }

    // Deduplicate concurrent refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchToken();
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async fetchToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: "token",
    });

    const response = await fetch(SOPHOS_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Sophos auth failed (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as SophosTokenResponse;

    if (data.errorCode) {
      throw new Error(
        `Sophos auth error: ${data.errorCode} - ${data.message}`
      );
    }

    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + data.expires_in * 1000;

    console.error(
      `[sophos-auth] Token acquired, expires in ${data.expires_in}s`
    );
    return this.accessToken;
  }
}
