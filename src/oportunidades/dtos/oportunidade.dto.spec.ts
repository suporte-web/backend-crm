import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CriarOportunidadeDto } from './criar-oportunidade.dto';
import { AtualizarOportunidadeDto } from './atualizar-oportunidade.dto';

describe('Dados de oportunidades em português', () => {
  it.each([
    {
      clienteId: '123e4567-e89b-42d3-a456-426614174000',
      titulo: 'Proposta de transporte',
      valor: 1500,
    },
    {
      clientId: '123e4567-e89b-42d3-a456-426614174000',
      title: 'Proposta de transporte',
      value: 1500,
    },
  ])(
    'aceita nomes em português e preserva a compatibilidade da entrada anterior',
    async (entrada) => {
      const dados = plainToInstance(CriarOportunidadeDto, entrada);
      expect(
        await validate(dados, { whitelist: true, forbidNonWhitelisted: true }),
      ).toEqual([]);
      expect(dados).toMatchObject({
        clienteId: '123e4567-e89b-42d3-a456-426614174000',
        titulo: 'Proposta de transporte',
        valor: 1500,
      });
    },
  );

  it.each([
    {
      clienteId: '123e4567-e89b-42d3-a456-426614174000',
      titulo: 'Transporte',
      valor: '1500',
    },
    {
      clientId: '123e4567-e89b-42d3-a456-426614174000',
      title: 'Transporte',
      value: '1500',
    },
  ])(
    'mantém a conversão de valores numéricos recebidos como texto',
    async (entrada) => {
      const dados = plainToInstance(CriarOportunidadeDto, entrada);
      expect(
        await validate(dados, { whitelist: true, forbidNonWhitelisted: true }),
      ).toEqual([]);
      expect(dados.valor).toBe(1500);
    },
  );

  it('preserva a limpeza de um valor e a desativação do pré-contrato', async () => {
    const dados = plainToInstance(AtualizarOportunidadeDto, {
      valor: null,
      preContrato: false,
    });
    expect(
      await validate(dados, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
    expect(dados.valor).toBeNull();
    expect(dados.preContrato).toBe(false);
  });
});
