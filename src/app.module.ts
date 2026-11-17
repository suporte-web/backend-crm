import { VisitasModule } from './visitas/visitas.module';
import { BiComercialModule } from './bi-comercial/bi-comercial.module';
import { AtendimentoSacModule } from './atendimento-sac/atendimento-sac.module';
import { Module } from '@nestjs/common';
import { CnpjModule } from './cnpj/cnpj.module';
import { MarketingMetricsModule } from './marketing-metrics/marketing-metrics.module';
import { InformativoModule } from './informativo/informativo.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clientes/clients.module';
import { CadastrosModule } from './cadastros/cadastros.module';
import { QuotesModule } from './quotes/quotes.module';
import { TrackingsModule } from './trackings/trackings.module';
import { TicketsModule } from './tickets/tickets.module';
import { MessagesModule } from './messages/messages.module';
import { FaqModule } from './faq/faq.module';
import { AiModule } from './ai/ai.module';
import { PortalContentModule } from './portal-content/portal-content.module';
import { OportunidadesModule } from './oportunidades/oportunidades.module';
import { LeadsModule } from './leads/leads.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PropostasModule } from './propostas/propostas.module';
import { ChatsModule } from './chats/chats.module';
import { EntradasModule } from './entradas/entradas.module';
import { HelpCenterModule } from './help-center/help-center.module';
import { EntregasPorPlacasModule } from './entregas-por-placas/entregas-por-placas.module';
import { SolicitacoesSiteModule } from './solicitacoes-site/solicitacoes-site.module';
import { SiteInstitucionalModule } from './site-institucional/site-institucional.module';
import { MarketingIntegrationsModule } from './marketing-integrations/marketing-integrations.module';
import { AppService } from './app.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CnpjModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    CadastrosModule,
    QuotesModule,
    TrackingsModule,
    TicketsModule,
    MessagesModule,
    FaqModule,
    AiModule,
    PortalContentModule,
    OportunidadesModule,
    LeadsModule,
    DeliveriesModule,
    AuditLogsModule,
    NotificationsModule,
    SuppliersModule,
    PropostasModule,
    ChatsModule,
    EntradasModule,
    AtendimentoSacModule,
    VisitasModule,
    BiComercialModule,
    HelpCenterModule,
    EntregasPorPlacasModule,
    SolicitacoesSiteModule,
    SiteInstitucionalModule,
    MarketingIntegrationsModule,
    MarketingMetricsModule,
    InformativoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
