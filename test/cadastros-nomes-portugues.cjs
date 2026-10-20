// Compara o esquema traduzido com o contrato físico da migração já entregue.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const raiz = path.resolve(__dirname, '..');
const temporario = fs.mkdtempSync(
  path.join(os.tmpdir(), 'crm-esquema-portugues-'),
);
try {
  for (const nome of fs.readdirSync(path.join(raiz, 'prisma/schema'))) {
    if (!nome.endsWith('.prisma')) continue;
    let esquema = fs.readFileSync(
      path.join(raiz, 'prisma/schema', nome),
      'utf8',
    );
    for (const [atual, anterior] of Object.entries({
      modalidadeCadastro: 'registrationType',
      ModalidadeCadastro: 'RegistrationType',
      cadastroId: 'registrationId',
      leadCadastro: 'registrationLead',
    }))
      esquema = esquema.replaceAll(atual, anterior);
    esquema = esquema
      .replace(/(RegistrationType\s+)@default\(CLIENTE\)/, '$1@default(CLIENT)')
      .replace('CLIENTE @map("CLIENT")', 'CLIENT')
      .replace(/\s+@map\("registrationType"\)/g, '')
      .replace(/\s+@map\("registrationId"\)/g, '')
      .replace(/\s+@@map\("RegistrationType"\)/g, '')
      .replace('@unique(map: "Lead_registrationId_key")', '@unique')
      .replace(', map: "Client_registrationType_createdAt_idx"', '')
      .replace(', map: "Lead_registrationId_fkey"', '');
    fs.writeFileSync(path.join(temporario, nome), esquema);
  }
  const resultado = spawnSync(
    process.execPath,
    [
      path.join(raiz, 'node_modules/prisma/build/index.js'),
      'migrate',
      'diff',
      '--from-schema',
      temporario,
      '--to-schema',
      'prisma/schema',
      '--exit-code',
    ],
    { cwd: raiz, encoding: 'utf8' },
  );
  if (resultado.status !== 0) {
    throw new Error(
      resultado.stderr || resultado.stdout || 'Falha ao comparar os esquemas.',
    );
  }
  console.log(
    'Esquemas equivalentes: a tradução não altera tabelas, colunas, índices ou valores armazenados.',
  );
} finally {
  const absoluto = path.resolve(temporario);
  if (
    path.dirname(absoluto) !== path.resolve(os.tmpdir()) ||
    !path.basename(absoluto).startsWith('crm-esquema-portugues-')
  ) {
    throw new Error('Diretório temporário fora do local esperado.');
  }
  fs.rmSync(absoluto, { recursive: true, force: true });
}
