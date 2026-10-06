import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketingProvider } from '@prisma/client';
import {
  GoogleApiError,
  GoogleProperty,
  GoogleReport,
  GoogleTokens,
  ReportQuery,
} from '../google-api.types';

export const analyticsScope =
  'https://www.googleapis.com/auth/analytics.readonly';

@Injectable()
export class GoogleAnalyticsProvider {
  readonly provider = MarketingProvider.GOOGLE_ANALYTICS;
  readonly displayName = 'Google Analytics 4';
  constructor(private readonly config: ConfigService) {}

  settings() {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    const frontend = this.config.get<string>('MARKETING_FRONTEND_URL');
    if (!clientId || !clientSecret || !redirectUri || !frontend) {
      throw new ServiceUnavailableException(
        'O Google Analytics precisa ser configurado pela equipe técnica.',
      );
    }
    try {
      for (const value of [redirectUri, frontend]) {
        const url = new URL(value);
        if (
          url.username ||
          url.password ||
          url.search ||
          url.hash ||
          (url.protocol !== 'https:' &&
            !(
              url.protocol === 'http:' &&
              ['localhost', '127.0.0.1'].includes(url.hostname)
            ))
        )
          throw new Error('Invalid URL');
      }
      if (
        !new URL(redirectUri).pathname.endsWith(
          '/marketing-integrations/google/callback',
        )
      )
        throw new Error('Invalid callback');
    } catch {
      throw new ServiceUnavailableException(
        'A integração precisa de URLs válidas configuradas pela equipe técnica.',
      );
    }
    return { clientId, clientSecret, redirectUri, frontend };
  }

  private endpoint(key: string) {
    const value = this.config.get<string>(key);
    if (!value)
      throw new ServiceUnavailableException(
        'As APIs do Google precisam ser configuradas pela equipe técnica.',
      );
    return value;
  }

  authorizationUrl(state: string, challenge: string) {
    const settings = this.settings();
    const url = new URL(this.endpoint('GOOGLE_OAUTH_AUTHORIZE_URL'));
    url.search = new URLSearchParams({
      client_id: settings.clientId,
      redirect_uri: settings.redirectUri,
      response_type: 'code',
      scope: analyticsScope,
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    return url.toString();
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new GoogleApiError(503);
    }
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const expired =
        !!data &&
        typeof data === 'object' &&
        'error' in data &&
        data.error === 'invalid_grant';
      throw new GoogleApiError(response.status, expired);
    }
    if (!data || typeof data !== 'object') throw new GoogleApiError(502);
    return data as T;
  }

  private async tokens(params: Record<string, string>) {
    const settings = this.settings();
    const tokens = await this.request<GoogleTokens>(
      this.endpoint('GOOGLE_OAUTH_TOKEN_URL'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          ...params,
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
        }),
      },
    );
    if (
      !tokens.access_token ||
      !Number.isFinite(tokens.expires_in) ||
      tokens.expires_in <= 0 ||
      (tokens.scope && !tokens.scope.split(' ').includes(analyticsScope))
    )
      throw new GoogleApiError(403);
    return tokens;
  }

  exchange(code: string, verifier: string) {
    return this.tokens({
      code,
      code_verifier: verifier,
      redirect_uri: this.settings().redirectUri,
      grant_type: 'authorization_code',
    });
  }
  refresh(refreshToken: string) {
    return this.tokens({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
  }

  async properties(accessToken: string): Promise<GoogleProperty[]> {
    type Summaries = {
      accountSummaries?: {
        account: string;
        displayName?: string;
        propertySummaries?: {
          property: string;
          displayName?: string;
          propertyType?: string;
        }[];
      }[];
      nextPageToken?: string;
    };
    const properties: GoogleProperty[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(
        `${this.endpoint('GOOGLE_ANALYTICS_ADMIN_API_URL').replace(/\/$/, '')}/accountSummaries`,
      );
      url.searchParams.set('pageSize', '200');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const data = await this.request<Summaries>(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      for (const account of data.accountSummaries ?? []) {
        for (const property of account.propertySummaries ?? []) {
          const propertyId = property.property.replace('properties/', '');
          if (!/^\d+$/.test(propertyId)) continue;
          properties.push({
            propertyId,
            propertyName: property.displayName ?? propertyId,
            accountId: account.account.replace('accounts/', ''),
            accountName: account.displayName ?? account.account,
          });
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
    return properties;
  }

  report(accessToken: string, propertyId: string, query: ReportQuery) {
    if (!/^\d+$/.test(propertyId)) throw new GoogleApiError(400);
    return this.request<GoogleReport>(
      `${this.endpoint('GOOGLE_ANALYTICS_DATA_API_URL').replace(/\/$/, '')}/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      },
    );
  }

  async revoke(token: string) {
    try {
      const response = await fetch(this.endpoint('GOOGLE_OAUTH_REVOKE_URL'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }),
        signal: AbortSignal.timeout(10000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
