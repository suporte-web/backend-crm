import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { AtendimentoSacService } from '../modules/atendimento-sac/atendimento-sac.service';
async function importar() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const prisma = app.get(PrismaService);
    const sac = app.get(AtendimentoSacService);
    const tickets = await prisma.ticket.findMany({
      where: {
        origem: 'SITE',
        formPayload: { path: ['canal'], equals: 'RECLAMACOES_ELOGIOS' },
        atendimentoSac: { is: null },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    for (const ticket of tickets) await sac.receberTicket(ticket.id, false);
    console.log(
      `${tickets.length} relato(s) anterior(es) vinculados ao SAC. Relatos e arquivos originais preservados.`,
    );
  } finally {
    await app.close();
  }
}
importar().catch(() => {
  console.error(
    'Falha ao importar relatos anteriores. Verifique a conexão e a migration do SAC.',
  );
  process.exitCode = 1;
});
