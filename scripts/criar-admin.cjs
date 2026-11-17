const { Writable } = require('node:stream');
const { createInterface } = require('node:readline/promises');
const bcrypt = require('bcrypt');

async function criarAdmin(prisma, { nome, email, senha }) {
  const name = nome?.trim();
  const normalizedEmail = email?.trim().toLowerCase();
  if (!name) throw new Error('Informe o nome.');
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Informe um e-mail válido.');
  }
  if (typeof senha !== 'string' || senha.length < 6 || Buffer.byteLength(senha, 'utf8') > 72) {
    throw new Error('A senha deve ter pelo menos 6 caracteres e no máximo 72 bytes.');
  }
  const existing = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) throw new Error('Este e-mail já está cadastrado. Nenhuma conta foi alterada.');
  return prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(senha, 10),
      role: 'ADMIN',
      roles: ['ADMIN'],
      isActive: true,
      mustChangePassword: true,
    },
    select: { id: true, name: true, email: true, role: true },
  });
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Uso: npm run usuario:criar-admin');
    console.log('Solicita nome, e-mail e senha oculta. Usa DATABASE_URL do ambiente ou do .env.');
    console.log('Cria um ADMIN ativo e exige troca de senha no primeiro acesso. Não altera contas existentes.');
    return;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Execute este comando em um terminal interativo.');
  }
  require('dotenv/config');
  if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL no .env.');
  let ocultar = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!ocultar) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const terminal = createInterface({ input: process.stdin, output, terminal: true });
  let dados;
  try {
    const nome = await terminal.question('Nome: ');
    const email = await terminal.question('E-mail: ');
    process.stdout.write('Senha (oculta): ');
    ocultar = true;
    const senha = await terminal.question('');
    process.stdout.write('\nConfirme a senha: ');
    const confirmacao = await terminal.question('');
    process.stdout.write('\n');
    if (senha !== confirmacao) throw new Error('As senhas não coincidem.');
    dados = { nome, email, senha };
  } finally {
    terminal.close();
  }
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const user = await criarAdmin(prisma, dados);
    console.log(`Administrador criado: ${user.name} <${user.email}>`);
    console.log('Faça login no CRM. A troca de senha será solicitada no primeiro acesso.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(error => {
    if (error.code === 'P2002') console.error('Este e-mail já está cadastrado. Nenhuma conta foi alterada.');
    else if (error.code === 'P1001' || error.code?.startsWith('ECONN')) console.error('Não foi possível conectar ao banco. Confira DATABASE_URL.');
    else if (error.constructor?.name?.startsWith('Prisma')) console.error('Não foi possível criar o administrador. Confira a conexão e as migrações do banco.');
    else console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { criarAdmin };
