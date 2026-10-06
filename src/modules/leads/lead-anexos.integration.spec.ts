import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadsService } from './leads.service';
import { LeadAnexosService } from './lead-anexos.service';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const banco =
  process.env.ANEXOS_TESTAR_BANCO === '1' ? describe : describe.skip;
banco('Anexos dos Leads com banco local e armazenamento reais', () => {
  let prisma: PrismaService;
  let dir: string;
  let anterior: string | undefined;
  beforeAll(async () => {
    const host = new URL(process.env.DATABASE_URL!).hostname;
    if (!['localhost', '127.0.0.1'].includes(host))
      throw new Error('Teste permitido somente no banco local');
    prisma = new PrismaService(new ConfigService());
    await prisma.onModuleInit();
    dir = await mkdtemp(join(tmpdir(), 'crm-lead-anexos-'));
    anterior = process.env.LEAD_ATTACHMENTS_UPLOAD_DIR;
    process.env.LEAD_ATTACHMENTS_UPLOAD_DIR = dir;
  });
  afterAll(async () => {
    if (anterior === undefined) delete process.env.LEAD_ATTACHMENTS_UPLOAD_DIR;
    else process.env.LEAD_ATTACHMENTS_UPLOAD_DIR = anterior;
    if (
      dir &&
      resolve(dir).startsWith(resolve(tmpdir()) + require('node:path').sep) &&
      dir.includes('crm-lead-anexos-')
    )
      await rm(dir, { recursive: true, force: true });
    await prisma?.onModuleDestroy();
  });
  it('salva mais de 20 arquivos, baixa o conteúdo correto e reverte dados de teste', async () => {
    const antes = await prisma.leadAnexo.count();
    await expect(
      prisma.$transaction(
        async (tx) => {
          const db = Object.assign(Object.create(tx), {
            $transaction: (fn: any) => fn(tx),
          }) as PrismaService;
          const usuario = await tx.user.create({
            data: {
              name: 'Teste anexos',
              email: `anexos-${randomUUID()}@example.invalid`,
              passwordHash: 'teste',
              role: 'COMERCIAL',
              roles: ['COMERCIAL'],
            },
          });
          const user = {
            sub: usuario.id,
            role: 'COMERCIAL',
            roles: ['COMERCIAL'],
          } as any;
          const lead = await tx.lead.create({
            data: { name: 'Teste anexos', convertidoParaCliente: true },
          });
          const outro = await tx.lead.create({ data: { name: 'Outro teste' } });
          const service = new LeadAnexosService(
            db,
            new LeadsService(db, {} as any),
          );
          const buffer = Buffer.from('%PDF-1.4\n%%EOF');
          const file = {
            buffer,
            size: buffer.length,
            originalname: '../../evidencia.pdf',
            mimetype: 'application/pdf',
          } as Express.Multer.File;
          for (let i = 0; i < 25; i++)
            await service.anexar(user, lead.id, file, `Comentário ${i}`);
          const lista = await service.listar(user, lead.id);
          expect(lista).toHaveLength(25);
          expect(lista[0].nome).toBe('evidencia.pdf');
          expect(lista[0]).not.toHaveProperty('arquivo');
          expect(
            (await service.baixar(user, lead.id, lista[0].id)).buffer,
          ).toEqual(buffer);
          await expect(
            service.baixar(user, outro.id, lista[0].id),
          ).rejects.toThrow('não encontrado');
          await expect(
            service.listar(
              { ...user, role: 'CLIENTE', roles: ['CLIENTE'] },
              lead.id,
            ),
          ).rejects.toThrow();
          await expect(
            service.anexar(user, lead.id, {
              ...file,
              buffer: Buffer.from('arquivo falso'),
            }),
          ).rejects.toThrow('PDF');
          await expect(
            service.anexar(user, lead.id, {
              ...file,
              size: 10 * 1024 * 1024 + 1,
            }),
          ).rejects.toThrow('10 MB');
          expect(await readdir(dir)).toHaveLength(25);
          expect(
            await tx.leadTimelineEvent.count({ where: { leadId: lead.id } }),
          ).toBe(25);
          await tx.lead.delete({ where: { id: lead.id } });
          expect(await tx.leadAnexo.count({ where: { leadId: lead.id } })).toBe(
            0,
          );
          throw new Error('ROLLBACK_ANEXOS_TESTE');
        },
        { timeout: 30000 },
      ),
    ).rejects.toThrow('ROLLBACK_ANEXOS_TESTE');
    expect(await prisma.leadAnexo.count()).toBe(antes);
  }, 45000);
});
