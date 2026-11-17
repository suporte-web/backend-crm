const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { criarAdmin } = require('./criar-admin.cjs');

test('cria administrador ativo com hash compatível com o login e troca obrigatória', async () => {
  let saved;
  const prisma = { user: {
    findFirst: async () => null,
    create: async ({ data, select }) => {
      saved = data;
      assert.equal(select.passwordHash, undefined);
      return { id: 'admin', name: data.name, email: data.email, role: data.role };
    },
  } };
  await criarAdmin(prisma, { nome: ' Leonardo ', email: ' Admin@Example.com ', senha: 'SenhaDeTeste123!' });
  assert.equal(saved.name, 'Leonardo');
  assert.equal(saved.email, 'admin@example.com');
  assert.equal(saved.role, 'ADMIN');
  assert.deepEqual(saved.roles, ['ADMIN']);
  assert.equal(saved.isActive, true);
  assert.equal(saved.mustChangePassword, true);
  assert.equal(await bcrypt.compare('SenhaDeTeste123!', saved.passwordHash), true);
  assert.equal(saved.senha, undefined);
});

test('não sobrescreve nem promove usuário com e-mail existente', async () => {
  const prisma = { user: {
    findFirst: async ({ where }) => {
      assert.equal(where.email.mode, 'insensitive');
      return { id: 'existing' };
    },
    create: async () => assert.fail('Não deve criar conta duplicada'),
  } };
  await assert.rejects(criarAdmin(prisma, { nome: 'Admin', email: 'admin@example.com', senha: 'SenhaTeste123' }), /já está cadastrado/);
});

test('rejeita dados inválidos antes de consultar o banco', async () => {
  const prisma = { user: { findFirst: async () => assert.fail('Não deve consultar o banco') } };
  for (const dados of [
    { nome: '', email: 'admin@example.com', senha: 'SenhaTeste123' },
    { nome: 'Admin', email: 'invalido', senha: 'SenhaTeste123' },
    { nome: 'Admin', email: 'admin@example.com', senha: '123' },
    { nome: 'Admin', email: 'admin@example.com', senha: 'á'.repeat(37) },
  ]) await assert.rejects(criarAdmin(prisma, dados));
});
