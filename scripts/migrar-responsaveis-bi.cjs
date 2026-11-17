const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { auditar } = require('./auditar-responsaveis-bi.cjs');

async function main() {
  require('dotenv').config({ quiet: true });
  const aplicar = process.argv.includes('--apply');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, query_timeout: 20000, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const usuarios = (await client.query('SELECT id, name, role, roles, "isActive" FROM "User"')).rows;
    const cadastros = (await client.query(`SELECT c.id, c."companyName", c."internalOwnerId", c."responsavelId",
      CASE WHEN jsonb_typeof(COALESCE(l.metadata, origem.metadata)::jsonb -> 'responsible') = 'string'
        THEN COALESCE(l.metadata, origem.metadata)::jsonb ->> 'responsible' ELSE NULL END AS "responsavelLegado"
      FROM "Client" c LEFT JOIN "Lead" l ON l."registrationId" = c.id
      LEFT JOIN "Lead" origem ON origem.id = c."sourceLeadId" ORDER BY c.id FOR UPDATE OF c`)).rows;
    const report = auditar(cadastros, usuarios);
    const candidatos = report.registros.filter(item => !item.responsavelId && item.situacao === 'correspondencia_unica');
    let atualizados = 0;
    if (aplicar) for (const item of candidatos) {
      const result = await client.query('UPDATE "Client" SET "responsavelId" = $1, "updatedAt" = NOW() WHERE id = $2 AND "responsavelId" IS NULL', [item.usuarioSugerido.id, item.id]);
      if (!result.rowCount) continue;
      await client.query(`INSERT INTO "AuditLog" (id, category, action, message, details, "targetType", "targetId")
        VALUES ($1, 'CLIENT', 'CUSTOM', $2, $3::jsonb, 'Client', $4)`, [randomUUID(), 'Responsável comercial vinculado por correspondência única de nome.', JSON.stringify({ origem: 'migracao-responsaveis-bi', responsavelId: item.usuarioSugerido.id, nomeLegado: item.responsavelLegado }), item.id]);
      atualizados++;
    }
    await client.query(aplicar ? 'COMMIT' : 'ROLLBACK');
    const output = path.resolve('.tmp/migracao-responsaveis-bi.json');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ ...report, modo: aplicar ? 'aplicado' : 'simulacao', candidatos: candidatos.length, atualizados }, null, 2));
    console.log(JSON.stringify({ modo: aplicar ? 'aplicado' : 'simulacao', candidatos: candidatos.length, atualizados, resumo: report.resumo }));
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); await pool.end(); }
}
main().catch(error => { console.error('Falha ao migrar responsáveis:', error.code || error.name); process.exitCode = 1; });
