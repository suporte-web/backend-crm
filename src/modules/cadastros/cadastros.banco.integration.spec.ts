import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const banco =
  process.env.CADASTROS_TESTAR_BANCO === '1' ? describe : describe.skip;

banco('Cadastros com banco local e tabelas isoladas', () => {
  it('grava endereço e dados bancários como texto pelo Prisma', async () => {
    const url = process.env.DATABASE_URL!;
    if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
      throw new Error('Teste permitido somente no banco local.');
    const esquema = `teste_cadastros_${randomUUID().replaceAll('-', '')}`;
    const pool = new Pool({ connectionString: url });
    const prisma = new PrismaClient({
      adapter: new PrismaPg(pool, { schema: esquema }),
    });
    const reversao = new Error('REVERTER_TESTE_CADASTROS');
    try {
      await expect(
        prisma.$transaction(
          async (tx) => {
            await tx.$executeRawUnsafe(`CREATE SCHEMA "${esquema}"`);
            await tx.$executeRawUnsafe(
              `SET LOCAL search_path TO "${esquema}", public`,
            );
            await tx.$executeRawUnsafe(
              `CREATE DOMAIN "${esquema}"."RegistrationType" AS public."RegistrationType"`,
            );
            for (const tabela of ['Client']) {
              await tx.$executeRawUnsafe(
                `CREATE TABLE "${esquema}"."${tabela}" (LIKE public."${tabela}" INCLUDING ALL)`,
              );
            }
            // Reproduz o banco divergente sem tocar nas tabelas da aplicação.
            await tx.$executeRawUnsafe(
              `ALTER TABLE "Client" ALTER COLUMN address TYPE jsonb USING to_jsonb(address), ALTER COLUMN "bankDetails" TYPE jsonb USING to_jsonb("bankDetails")`,
            );
            await tx.$executeRawUnsafe(`INSERT INTO "Client" (id, address, "bankDetails", "updatedAt") VALUES
          ('texto', '"Rua São João"', '"Agência 123"', now()),
          ('objeto', '{"rua":"São João","numero":123}', '{"conta":"456"}', now()),
          ('vazio', null, 'null', now())`);
            const correcao = readFileSync(
              resolve(
                __dirname,
                '../../..',
                'prisma/migrations/20261016160000_corrigir_campos_texto_cadastro/migration.sql',
              ),
              'utf8',
            );
            await tx.$executeRawUnsafe(correcao);
            // A segunda execução em colunas TEXT deve ser inofensiva.
            await tx.$executeRawUnsafe(correcao);
            const antigos = await tx.client.findMany({
              orderBy: { id: 'asc' },
            });
            expect(antigos.find((item) => item.id === 'texto')).toMatchObject({
              address: 'Rua São João',
              bankDetails: 'Agência 123',
            });
            expect(
              JSON.parse(
                antigos.find((item) => item.id === 'objeto')!.address!,
              ),
            ).toEqual({ rua: 'São João', numero: 123 });
            expect(
              JSON.parse(
                antigos.find((item) => item.id === 'objeto')!.bankDetails!,
              ),
            ).toEqual({ conta: '456' });
            expect(antigos.find((item) => item.id === 'vazio')).toMatchObject({
              address: null,
              bankDetails: null,
            });
            const vinculado = await tx.client.create({
              data: { companyName: 'Empresa de teste' },
            });
            const cadastro = await tx.client.update({
              where: { id: vinculado.id },
              data: {
                address: 'Rua São João, 123',
                bankDetails: 'Banco de teste, agência 123',
                city: 'São Paulo',
                registrationDate: new Date('2026-10-16'),
              },
            });
            expect(cadastro.address).toBe('Rua São João, 123');
            expect(cadastro.bankDetails).toBe('Banco de teste, agência 123');
            expect(
              await tx.client.create({
                data: {
                  companyName: 'Outro cadastro',
                  address: '',
                  bankDetails: 'Conta 789',
                },
              }),
            ).toMatchObject({ address: '', bankDetails: 'Conta 789' });
            throw reversao;
          },
          { timeout: 30000 },
        ),
      ).rejects.toBe(reversao);
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  }, 45000);
});
