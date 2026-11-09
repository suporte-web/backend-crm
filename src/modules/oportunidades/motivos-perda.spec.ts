import { resolverPerda, MOTIVOS_PERDA, historicoPerda } from './motivos-perda';
import { BadRequestException } from '@nestjs/common';
import { DadosPerdaDto } from './dto/dados-perda.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CriarOportunidadeDto } from './dto/criar-oportunidade.dto';
import { AtualizarEtapaOportunidadeDto } from './dto/atualizar-etapa-oportunidade.dto';
import { AtualizarOportunidadeDto } from './dto/atualizar-oportunidade.dto';
import { UpdateOpportunityStatusDto } from '../clientes/dto/update-oportunidade-status.dto';

describe('Catálogo e validação de perdas', () => {
  it('possui exatamente 14 códigos únicos e somente dois exigem observação', () => {
    expect(MOTIVOS_PERDA).toHaveLength(14);
    expect(new Set(MOTIVOS_PERDA.map((x) => x.codigo)).size).toBe(14);
    expect(
      MOTIVOS_PERDA.filter((x) => x.exigeObservacao).map((x) => x.codigo),
    ).toEqual(['LIMITACAO_OPERACIONAL', 'OUTRO']);
  });
  it.each(['OPEN', 'WON'])(
    '%s dispensa motivo e limpa os dados atuais, mantendo-os no histórico',
    (status) => {
      const previous = {
        status: 'LOST',
        motivoPerda: 'OUTRO',
        lostReason: 'Outro motivo',
        observacaoPerda: 'Projeto sem previsão',
      };
      const next = resolverPerda(status, {}, previous);
      expect(next).toEqual({
        lostReason: null,
        motivoPerda: null,
        observacaoPerda: null,
      });
      expect(historicoPerda(previous, next)).toMatchObject({
        motivoPerdaAnterior: 'OUTRO',
        observacaoPerdaAnterior: 'Projeto sem previsão',
        motivoPerda: null,
      });
    },
  );
  it.each([undefined, null, '', ' ', 'qualquer texto', 'INVALIDO'])(
    'bloqueia motivo inválido: %s',
    (motivoPerda) => {
      expect(() => resolverPerda('LOST', { motivoPerda })).toThrow(
        BadRequestException,
      );
    },
  );
  it.each(['LIMITACAO_OPERACIONAL', 'OUTRO'])(
    '%s exige descrição, inclusive sem espaços em branco',
    (motivoPerda) => {
      for (const observacaoPerda of [undefined, null, '', '   '])
        expect(() =>
          resolverPerda('LOST', { motivoPerda, observacaoPerda }),
        ).toThrow(BadRequestException);
      expect(
        resolverPerda('LOST', {
          motivoPerda,
          observacaoPerda: '  Sem veículo adequado  ',
        }),
      ).toMatchObject({
        motivoPerda: motivoPerda,
        observacaoPerda: 'Sem veículo adequado',
      });
    },
  );
  it.each(MOTIVOS_PERDA.filter((x) => !x.exigeObservacao))(
    'aceita $codigo com observação opcional',
    (reason) => {
      expect(
        resolverPerda('LOST', { motivoPerda: reason.codigo }).observacaoPerda,
      ).toBeNull();
      expect(
        resolverPerda('LOST', {
          motivoPerda: reason.rotulo,
          observacaoPerda: 'Detalhes',
        }),
      ).toEqual({
        motivoPerda: reason.codigo,
        lostReason: reason.rotulo,
        observacaoPerda: 'Detalhes',
      });
    },
  );
  it('não classifica texto livre de registro antigo e exige escolha na edição', () => {
    expect(() =>
      resolverPerda(
        'LOST',
        {},
        { status: 'LOST', lostReason: 'Sem interesse' },
      ),
    ).toThrow(BadRequestException);
    expect(
      resolverPerda(
        'LOST',
        { motivoPerda: 'CONCORRENTE' },
        { status: 'LOST', lostReason: 'Sem interesse' },
      ).motivoPerda,
    ).toBe('CONCORRENTE');
  });
  it('preserva a classificação em atualização parcial sem mascarar limpeza explícita', () => {
    const previous = {
      status: 'LOST',
      motivoPerda: 'OUTRO',
      observacaoPerda: 'Detalhes',
    };
    expect(resolverPerda('LOST', {}, previous).observacaoPerda).toBe(
      'Detalhes',
    );
    expect(() =>
      resolverPerda('LOST', { motivoPerda: null }, previous),
    ).toThrow(BadRequestException);
    expect(() =>
      resolverPerda('LOST', { observacaoPerda: '' }, previous),
    ).toThrow(BadRequestException);
    expect(() =>
      resolverPerda('LOST', { observacaoPerda: 'a'.repeat(2001) }, previous),
    ).toThrow(BadRequestException);
  });
  it.each([
    CriarOportunidadeDto,
    AtualizarOportunidadeDto,
    AtualizarEtapaOportunidadeDto,
    UpdateOpportunityStatusDto,
  ])('preserva aliases de motivo e observações no DTO %s', async (dto) => {
    const value = plainToInstance<DadosPerdaDto, Record<string, string>>(dto, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Proposta',
      stage: 'PERDIDO',
      status: 'LOST',
      lostReason: 'OUTRO',
      observacaoPerda: 'Justificativa',
    });
    expect(value.motivoPerda).toBe('OUTRO');
    expect(value.observacaoPerda).toBe('Justificativa');
    expect(await validate(value)).toEqual([]);
  });
});
