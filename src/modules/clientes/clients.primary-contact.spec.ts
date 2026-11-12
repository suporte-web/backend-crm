import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';

it('mantém o primeiro contato como principal ao criar, adicionar outro e editar', async () => {
  const contatos: any[] = [];
  const sincronizarLead = jest.fn(async () => ({ count: 1 }));
  const tx = {
    clientContact: {
      create: jest.fn(async ({ data }: any) => {
        const contato = { id: `contato-${contatos.length + 1}`, ...data };
        contatos.push(contato);
        return { ...contato };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const contato = contatos.find(item => item.id === where.id);
        Object.assign(contato, data);
        return { ...contato };
      }),
    },
    lead: { updateMany: sincronizarLead },
  };
  const prisma = {
    $transaction: async (acao: any) => acao(tx),
    clientContact: { findFirst: async ({ where }: any) => contatos.find(item => item.id === where.id && item.clientId === where.clientId) },
    timelineEvent: { create: async () => ({}) },
  };
  const service: ClientsService = Reflect.construct(ClientsService, [prisma, {}, {}, {}]);
  jest.spyOn(service as any, 'getClientOrFail').mockImplementation(async () => ({ id: 'empresa', contacts: contatos.map(item => ({ ...item })) }));
  const user = { sub: 'comercial', email: 'comercial@example.test', role: UserRole.COMERCIAL };
  const primeiro = await service.createContact(user, 'empresa', { nomeContato: 'Maria', email: 'maria@example.test', telefone: '41999990000' });
  expect(primeiro.contact.isPrimary).toBe(true);
  const segundo = await service.createContact(user, 'empresa', { nomeContato: 'João', email: 'joao@example.test', telefone: '41888880000' });
  expect(segundo.contact.isPrimary).toBe(false);
  expect(sincronizarLead).toHaveBeenCalledTimes(1);
  await service.updateContact(user, 'empresa', primeiro.contact.id, { nomeContato: 'Maria Atualizada', email: 'maria.nova@example.test', telefone: '41777770000' });
  await service.updateContact(user, 'empresa', segundo.contact.id, { nomeContato: 'João Atualizado', email: 'joao.novo@example.test', telefone: '41666660000' });
  const recarregado = await service.findOne(user, 'empresa');
  expect(recarregado.contacts.filter(item => item.isPrimary)).toHaveLength(1);
  expect(recarregado.contacts.find(item => item.isPrimary)).toMatchObject({ id: primeiro.contact.id, name: 'Maria Atualizada', email: 'maria.nova@example.test', phone: '41777770000' });
  expect(sincronizarLead).toHaveBeenCalledTimes(2);
  expect(sincronizarLead).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: 'maria.nova@example.test', phone: '41777770000' }) }));
});

