import { ConfigService } from '@nestjs/config';
import { GoogleAnalyticsProvider } from './google-analytics.provider';
import { GoogleApiError } from '../google-api.types';

describe('Google Analytics REST APIs', () => {
  const config = new ConfigService({
    GOOGLE_CLIENT_ID: 'client',
    GOOGLE_CLIENT_SECRET: 'server-only-secret',
    GOOGLE_REDIRECT_URI:
      'http://localhost:3001/api/marketing-integrations/google/callback',
    GOOGLE_OAUTH_AUTHORIZE_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
    GOOGLE_OAUTH_TOKEN_URL: 'https://oauth2.googleapis.com/token',
    GOOGLE_OAUTH_REVOKE_URL: 'https://oauth2.googleapis.com/revoke',
    GOOGLE_ANALYTICS_ADMIN_API_URL:
      'https://analyticsadmin.googleapis.com/v1beta',
    GOOGLE_ANALYTICS_DATA_API_URL:
      'https://analyticsdata.googleapis.com/v1beta',
    MARKETING_FRONTEND_URL: 'http://localhost:3000',
  });
  const provider = new GoogleAnalyticsProvider(config);
  afterEach(() => jest.restoreAllMocks());

  it('exchanges authorization code only from the server, including PKCE verifier', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
      }),
    );
    await provider.exchange('code', 'verifier');
    const body = new URLSearchParams(
      fetch.mock.calls[0][1]?.body as URLSearchParams,
    );
    expect(body.get('client_secret')).toBe('server-only-secret');
    expect(body.get('code_verifier')).toBe('verifier');
    expect(body.get('redirect_uri')).toBe(config.get('GOOGLE_REDIRECT_URI'));
  });

  it('paginates admin property summaries and returns public identifiers only', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({
          accountSummaries: [
            {
              account: 'accounts/1',
              displayName: 'Pizzattolog',
              propertySummaries: [
                {
                  property: 'properties/123',
                  displayName: 'Site',
                  propertyType: 'PROPERTY_TYPE_ORDINARY',
                },
              ],
            },
          ],
          nextPageToken: 'next',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          accountSummaries: [
            {
              account: 'accounts/2',
              propertySummaries: [
                { property: 'properties/456', displayName: 'Outro site' },
              ],
            },
          ],
        }),
      );
    const properties = await provider.properties('private-access');
    expect(properties).toHaveLength(2);
    expect(properties[0]).toEqual({
      propertyId: '123',
      propertyName: 'Site',
      accountId: '1',
      accountName: 'Pizzattolog',
    });
    expect(JSON.stringify(properties)).not.toContain('private-access');
  });

  it('sends metrics to the GA4 Data API with bearer token only in backend headers', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ rows: [] }));
    await provider.report('private-access', '123', {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'sessions' }],
    });
    expect(fetch.mock.calls[0][0]).toBe(
      'https://analyticsdata.googleapis.com/v1beta/properties/123:runReport',
    );
    expect(fetch.mock.calls[0][1]?.headers).toEqual({
      Authorization: 'Bearer private-access',
      'Content-Type': 'application/json',
    });
    expect(fetch.mock.calls[0][1]?.body).not.toContain('private-access');
  });

  it('classifies revoked refresh tokens without propagating Google error bodies', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json(
          { error: 'invalid_grant', error_description: 'sensitive-details' },
          { status: 400 },
        ),
      );
    await expect(provider.refresh('private-refresh')).rejects.toMatchObject({
      expired: true,
    });
    try {
      await provider.refresh('private-refresh');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(GoogleApiError);
      expect((error as Error).message).not.toContain('sensitive-details');
    }
  });
});
