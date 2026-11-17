const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const normalizar = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
const perfisComerciais = ['ADMIN', 'GESTAO', 'COMERCIAL', 'CONSULTORA'];

function auditar(cadastros, usuarios) {
  const porNome = new Map();
  for (const usuario of usuarios) {
    const chave = normalizar(usuario.name);
    porNome.set(chave, [...(porNome.get(chave) || []), usuario]);
  }
  const registros = cadastros.map(cadastro => {
    const nome = cadastro.responsavelLegado?.trim() || '';
    const encontrados = nome ? porNome.get(normalizar(nome)) || [] : [];
    const candidato = encontrados.length === 1 ? encontrados[0] : null;
    const elegivel = candidato?.isActive && [candidato.role, ...(candidato.roles || [])].some(role => perfisComerciais.includes(role));
    const situacao = !nome ? 'sem_nome' : encontrados.length > 1 ? 'nome_ambiguo' : !candidato ? 'nao_encontrado' : !elegivel ? 'usuario_inelegivel' : 'correspondencia_unica';
    return { ...cadastro, responsavelLegado: nome || null, situacao, usuarioSugerido: elegivel ? { id: candidato.id, name: candidato.name } : null,
      candidatos: encontrados.map(item => ({ id: item.id, name: item.name, ativo: item.isActive })),
      divergeResponsavelInterno: Boolean(elegivel && cadastro.internalOwnerId && cadastro.internalOwnerId !== candidato.id) };
  });
  const resumo = { cadastros: registros.length, usuarios: usuarios.length };
  for (const item of registros) resumo[item.situacao] = (resumo[item.situacao] || 0) + 1;
  resumo.divergenciasComResponsavelInterno = registros.filter(item => item.divergeResponsavelInterno).length;
  return { geradoEm: new Date().toISOString(), resumo, registros };
}

async function main() {
  require('dotenv').config({ quiet: true });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, query_timeout: 20000, max: 1 });
  try {
    const usuarios = (await pool.query('SELECT id, name, role, roles, "isActive" FROM "User"')).rows;
    const cadastros = (await pool.query(`SELECT c.id, c."companyName", c."internalOwnerId",
      CASE WHEN jsonb_typeof(COALESCE(l.metadata, origem.metadata)::jsonb -> 'responsible') = 'string'
        THEN COALESCE(l.metadata, origem.metadata)::jsonb ->> 'responsible' ELSE NULL END AS "responsavelLegado"
      FROM "Client" c LEFT JOIN "Lead" l ON l."registrationId" = c.id
      LEFT JOIN "Lead" origem ON origem.id = c."sourceLeadId" ORDER BY c.id`)).rows;
    const report = auditar(cadastros, usuarios);
    const outputIndex = process.argv.indexOf('--output');
    const output = path.resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : '.tmp/auditoria-responsaveis-bi.json');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report.resumo, relatorio: output }));
  } finally { await pool.end(); }
}

module.exports = { auditar, normalizar };
if (require.main === module) main().catch(error => { console.error('Falha ao auditar responsáveis:', error.code || error.name); process.exitCode = 1; });
