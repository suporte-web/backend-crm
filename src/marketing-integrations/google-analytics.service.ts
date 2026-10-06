import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MarketingIntegration,
  MarketingIntegrationStatus as Status,
  MarketingProvider as Provider,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  GoogleApiError,
  GoogleProperty,
  GoogleReport,
  ReportQuery,
} from './google-api.types';
import { GoogleAnalyticsProvider } from './providers/google-analytics.provider';
import { TokenCipherService } from './token-cipher.service';

export const hashOAuth = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const provider = Provider.GOOGLE_ANALYTICS;

export function propertyIdOf(integration: MarketingIntegration) {
  const metadata = integration.metadata;
  return metadata &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    typeof metadata.propertyId === 'string'
    ? metadata.propertyId
    : null;
}

@Injectable()
export class GoogleAnalyticsService {
  private readonly refreshing = new Map<
    string,
    Promise<MarketingIntegration>
  >();
  constructor(
    private readonly prisma: PrismaService,
    private readonly google: GoogleAnalyticsProvider,
    private readonly cipher: TokenCipherService,
  ) {}

  async connect(userId: string) {
    const settings = this.google.settings();
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const encryptedVerifier = this.cipher.encrypt(verifier);
    await this.prisma.$transaction(async (tx) => {
      await tx.marketingOAuthSession.deleteMany({
        where: {
          OR: [{ provider, userId }, { expiresAt: { lt: new Date() } }],
        },
      });
      await tx.marketingOAuthSession.create({
        data: {
          provider,
          userId,
          stateHash: hashOAuth(state),
          codeVerifierEncrypted: encryptedVerifier,
          expiresAt: new Date(Date.now() + 10 * 60000),
        },
      });
      const current = await tx.marketingIntegration.findUnique({
        where: { provider },
      });
      await tx.marketingIntegration.upsert({
        where: { provider },
        create: { provider, status: Status.CONECTANDO, ativo: false },
        update:
          current?.accessTokenEncrypted && current.ativo
            ? {}
            : { status: Status.CONECTANDO, lastError: null, ativo: false },
      });
    });
    const url = new URL(settings.redirectUri);
    url.pathname = url.pathname.replace(/\/callback$/, '/authorize');
    url.search = new URLSearchParams({ ticket: state }).toString();
    return { url: url.toString() };
  }

  async authorize(ticket: string) {
    const session = await this.prisma.marketingOAuthSession.findUnique({
      where: { stateHash: hashOAuth(ticket) },
    });
    if (!session || session.expiresAt <= new Date() || session.startedAt)
      throw new BadRequestException(
        'A autorização expirou. Clique em Conectar novamente.',
      );
    const browser = randomBytes(32).toString('base64url');
    const started = await this.prisma.marketingOAuthSession.updateMany({
      where: { id: session.id, startedAt: null, expiresAt: { gt: new Date() } },
      data: { startedAt: new Date(), browserHash: hashOAuth(browser) },
    });
    if (!started.count)
      throw new BadRequestException('A autorização já foi iniciada.');
    const verifier = this.cipher.decrypt(session.codeVerifierEncrypted);
    return {
      browser,
      url: this.google.authorizationUrl(
        ticket,
        createHash('sha256').update(verifier).digest('base64url'),
      ),
    };
  }

  frontendRedirect(outcome: 'selecione' | 'erro' | 'cancelado') {
    const url = new URL(
      '/marketing/integracoes',
      this.google.settings().frontend,
    );
    url.searchParams.set('google', outcome);
    return url.toString();
  }

  async callback(
    state: string,
    browser: string,
    code?: string,
    denied?: string,
  ) {
    const session = await this.prisma.marketingOAuthSession.findUnique({
      where: { stateHash: hashOAuth(state) },
    });
    if (
      !session?.startedAt ||
      !browser ||
      session.browserHash !== hashOAuth(browser) ||
      session.expiresAt <= new Date() ||
      session.consumedAt
    ) {
      throw new BadRequestException(
        'Não foi possível validar a autorização. Conecte novamente.',
      );
    }
    const claimed = await this.prisma.marketingOAuthSession.updateMany({
      where: {
        id: session.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (!claimed.count)
      throw new BadRequestException('Autorização já utilizada.');
    try {
      if (denied || !code)
        throw new BadRequestException('Autorização cancelada.');
      const tokens = await this.google.exchange(
        code,
        this.cipher.decrypt(session.codeVerifierEncrypted),
      );
      if (!tokens.refresh_token)
        throw new BadRequestException(
          'Autorize novamente para permitir sincronização automática.',
        );
      await this.google.properties(tokens.access_token);
      const updated = await this.prisma.marketingOAuthSession.updateMany({
        where: { id: session.id },
        data: {
          accessTokenEncrypted: this.cipher.encrypt(tokens.access_token),
          refreshTokenEncrypted: this.cipher.encrypt(tokens.refresh_token),
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          expiresAt: new Date(Date.now() + 20 * 60000),
        },
      });
      if (!updated.count)
        throw new ConflictException('A conexão foi cancelada.');
      return 'selecione' as const;
    } catch {
      await this.prisma.marketingOAuthSession.deleteMany({
        where: { id: session.id },
      });
      await this.prisma.marketingIntegration.updateMany({
        where: { provider, ativo: false, status: Status.CONECTANDO },
        data: {
          status: Status.ERRO,
          lastError: denied
            ? 'Autorização cancelada. Clique em Conectar para tentar novamente.'
            : 'Não foi possível concluir a autorização do Google. Tente conectar novamente.',
        },
      });
      return denied ? ('cancelado' as const) : ('erro' as const);
    }
  }

  private pending(userId: string) {
    return this.prisma.marketingOAuthSession.findFirst({
      where: {
        provider,
        userId,
        consumedAt: { not: null },
        accessTokenEncrypted: { not: null },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async properties(userId: string) {
    await this.prisma.marketingOAuthSession.deleteMany({
      where: { provider, expiresAt: { lt: new Date() } },
    });
    const session = await this.pending(userId);
    if (!session?.accessTokenEncrypted)
      return { pending: false, properties: [] };
    try {
      return {
        pending: true,
        properties: await this.google.properties(
          this.cipher.decrypt(session.accessTokenEncrypted),
        ),
      };
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível listar as propriedades. Conecte novamente ou tente em instantes.',
      );
    }
  }

  async selectProperty(userId: string, propertyId: string) {
    const session = await this.pending(userId);
    if (
      !session?.accessTokenEncrypted ||
      !session.refreshTokenEncrypted ||
      !session.tokenExpiresAt ||
      session.tokenExpiresAt <= new Date()
    ) {
      throw new BadRequestException(
        'A seleção expirou. Clique em Conectar novamente.',
      );
    }
    const access = this.cipher.decrypt(session.accessTokenEncrypted);
    let property: GoogleProperty | undefined;
    try {
      property = (await this.google.properties(access)).find(
        (item) => item.propertyId === propertyId,
      );
      if (!property)
        throw new BadRequestException(
          'Selecione uma propriedade disponível para a conta autorizada.',
        );
      await this.google.report(access, propertyId, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'totalUsers' }],
        limit: 1,
      });
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException(
        'Não foi possível acessar esta propriedade. Verifique a permissão da conta e as APIs do Google.',
      );
    }
    const selected = property;
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.marketingOAuthSession.deleteMany({
        where: { id: session.id, userId, expiresAt: { gt: new Date() } },
      });
      if (!claimed.count)
        throw new ConflictException('A seleção já foi concluída ou cancelada.');
      const data = {
        status: Status.CONECTADO,
        ativo: true,
        accountId: selected.accountId,
        accountName: `${selected.accountName} / ${selected.propertyName}`,
        accessTokenEncrypted: session.accessTokenEncrypted,
        refreshTokenEncrypted: session.refreshTokenEncrypted,
        expiresAt: session.tokenExpiresAt,
        metadata: {
          propertyId: selected.propertyId,
          propertyName: selected.propertyName,
        },
        lastSyncAt: new Date(),
        lastError: null,
      };
      await tx.marketingIntegration.upsert({
        where: { provider },
        create: { provider, ...data },
        update: data,
      });
    });
    return { message: 'Google Analytics conectado com sucesso.' };
  }

  private async refreshed(current: MarketingIntegration) {
    if (!current.refreshTokenEncrypted) throw new GoogleApiError(401, true);
    const tokens = await this.google.refresh(
      this.cipher.decrypt(current.refreshTokenEncrypted),
    );
    await this.prisma.marketingIntegration.updateMany({
      where: {
        id: current.id,
        ativo: true,
        accessTokenEncrypted: current.accessTokenEncrypted,
      },
      data: {
        accessTokenEncrypted: this.cipher.encrypt(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token
          ? this.cipher.encrypt(tokens.refresh_token)
          : current.refreshTokenEncrypted,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    const latest = await this.prisma.marketingIntegration.findUniqueOrThrow({
      where: { provider },
    });
    if (!latest.ativo || !latest.accessTokenEncrypted)
      throw new ConflictException('Integração desconectada.');
    return latest;
  }

  private async connection(forceRefresh = false) {
    const current = await this.prisma.marketingIntegration.findUnique({
      where: { provider },
    });
    if (
      !current?.ativo ||
      !current.accessTokenEncrypted ||
      !propertyIdOf(current)
    )
      throw new BadRequestException(
        'Google Analytics ainda não conectado. Configure em Marketing > Integrações.',
      );
    if (
      !forceRefresh &&
      current.expiresAt &&
      current.expiresAt.getTime() > Date.now() + 60000
    )
      return current;
    let promise = this.refreshing.get(current.id);
    if (!promise) {
      promise = this.refreshed(current);
      this.refreshing.set(current.id, promise);
    }
    try {
      return await promise;
    } finally {
      if (this.refreshing.get(current.id) === promise)
        this.refreshing.delete(current.id);
    }
  }

  async report(query: ReportQuery) {
    let connection: MarketingIntegration | undefined;
    try {
      connection =
        (await this.prisma.marketingIntegration.findUnique({
          where: { provider },
        })) ?? undefined;
      connection = await this.connection();
      let report: GoogleReport;
      try {
        report = await this.google.report(
          this.cipher.decrypt(connection.accessTokenEncrypted!),
          propertyIdOf(connection)!,
          query,
        );
      } catch (error: unknown) {
        if (!(error instanceof GoogleApiError) || error.status !== 401)
          throw error;
        connection = await this.connection(true);
        report = await this.google.report(
          this.cipher.decrypt(connection.accessTokenEncrypted!),
          propertyIdOf(connection)!,
          query,
        );
      }
      await this.prisma.marketingIntegration.updateMany({
        where: {
          id: connection.id,
          ativo: true,
          accessTokenEncrypted: connection.accessTokenEncrypted,
        },
        data: {
          status: Status.CONECTADO,
          lastSyncAt: new Date(),
          lastError: null,
        },
      });
      return report;
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      )
        throw error;
      const expired =
        error instanceof GoogleApiError &&
        (error.expired || error.status === 401);
      const message = expired
        ? 'A autorização expirou ou foi revogada. Conecte o Google Analytics novamente.'
        : 'Não foi possível consultar o Google Analytics. Verifique as permissões e tente novamente em instantes.';
      if (connection)
        await this.prisma.marketingIntegration.updateMany({
          where: {
            id: connection.id,
            ativo: true,
            accessTokenEncrypted: connection.accessTokenEncrypted,
          },
          data: {
            status: expired ? Status.EXPIRADO : Status.ERRO,
            lastError: message,
          },
        });
      throw new ServiceUnavailableException(message);
    }
  }

  async test() {
    await this.report({
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'totalUsers' }],
      limit: 1,
    });
    return { message: 'Conexão com o Google Analytics testada com sucesso.' };
  }

  async disconnect() {
    const current = await this.prisma.marketingIntegration.findUnique({
      where: { provider },
    });
    let refresh: string | undefined;
    try {
      if (current?.refreshTokenEncrypted)
        refresh = this.cipher.decrypt(current.refreshTokenEncrypted);
    } catch {
      /* Limpar mesmo se a chave foi alterada. */
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.marketingOAuthSession.deleteMany({ where: { provider } });
      await tx.marketingIntegration.updateMany({
        where: { provider },
        data: {
          status: Status.NAO_CONFIGURADO,
          ativo: false,
          accountId: null,
          accountName: null,
          accessTokenEncrypted: null,
          refreshTokenEncrypted: null,
          expiresAt: null,
          metadata: {},
          lastSyncAt: null,
          lastError: null,
        },
      });
    });
    const revoked = refresh ? await this.google.revoke(refresh) : true;
    return {
      message: revoked
        ? 'Google Analytics desconectado.'
        : 'Integração removida do CRM. Não foi possível revogar a autorização no Google; remova o acesso também na sua conta Google.',
    };
  }
}
