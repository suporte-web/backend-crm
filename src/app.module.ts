import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { TrackingsModule } from './modules/trackings/trackings.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { MessagesModule } from './modules/messages/messages.module';
import { FaqModule } from './modules/faq/faq.module';
import { AiModule } from './modules/ai/ai.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    QuotesModule,
    TrackingsModule,
    TicketsModule,
    MessagesModule,
    FaqModule,
    AiModule,
  ],
})
export class AppModule {}