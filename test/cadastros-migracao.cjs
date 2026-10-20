// Executa a migração em tabelas isoladas e reverte tudo, inclusive o schema de teste.
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

async function executar() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(
    ['localhost', '127.0.0.1'].includes(url.hostname),
    'Teste permitido somente no banco local.',
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = await pool.connect();
  const schema = 'teste_cadastros_' + randomUUID().replaceAll('-', '');
  try {
    await db.query('BEGIN');
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(`SET LOCAL search_path TO "${schema}", public`);
    for (const tabela of ['Client', 'Lead', 'ClientContact']) {
      await db.query(
        `CREATE TABLE "${tabela}" (LIKE public."${tabela}" INCLUDING ALL)`,
      );
    }
    await db.query(
      'ALTER TABLE "Client" DROP COLUMN IF EXISTS "registrationType"',
    );
    await db.query('ALTER TABLE "Lead" DROP COLUMN IF EXISTS "registrationId"');
    await db.query(
      `INSERT INTO "Lead" (id, name, company, email, "createdAt", "updatedAt") VALUES ('lead-ativo','Maria','Empresa A','maria@example.invalid','2026-10-10','2026-10-11'), ('lead-convertido','João','Empresa B','joao@example.invalid','2026-10-09','2026-10-12')`,
    );
    await db.query(
      `INSERT INTO "Client" (id, "companyName", "sourceLeadId", "updatedAt") VALUES ('cliente-existente','Empresa B','lead-convertido',now())`,
    );
    await db.query(
      `UPDATE "Lead" SET "convertidoParaCliente"=true, metadata='{"clientId":"cliente-existente","personalizado":"preservar"}' WHERE id='lead-convertido'`,
    );
    const sql = readFileSync(
      'prisma/migrations/20261016120000_unificar_cadastros/migration.sql',
      'utf8',
    )
      .replace(/^BEGIN;\s*/, '')
      .replace(/COMMIT;\s*$/, '');
    await db.query(sql);
    const { rows } = await db.query(
      `SELECT l.id, l."registrationId", l.metadata, l."convertidoParaCliente", c."registrationType", c."createdAt" FROM "Lead" l JOIN "Client" c ON c.id=l."registrationId" ORDER BY l.id`,
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].registrationType, 'LEAD');
    assert.equal(rows[0].convertidoParaCliente, false);
    assert.equal(rows[0].createdAt.toISOString().slice(0, 10), '2026-10-10');
    assert.equal(rows[1].registrationId, 'cliente-existente');
    assert.equal(rows[1].registrationType, 'CLIENT');
    assert.equal(rows[1].metadata.personalizado, 'preservar');
    assert.equal(
      (await db.query('SELECT count(*)::int AS total FROM "ClientContact"'))
        .rows[0].total,
      1,
    );
    assert.equal(
      (await db.query('SELECT count(*)::int AS total FROM "Client"')).rows[0]
        .total,
      2,
    );
    console.log(
      'Migração validada: lead ativo preservado, cliente convertido reutilizado, contato e metadados mantidos.',
    );
  } finally {
    await db.query('ROLLBACK');
    db.release();
    await pool.end();
  }
}
executar().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
