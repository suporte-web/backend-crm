import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { KmmDatabaseService } from '../../deliveries/database/kmm-database.service';
import { PostgresDeliveriesService } from '../../deliveries/database/postgres-deliveries.service';
import { ConsultarMonitoramentoEntregasPorPlacasDto } from './consultar-monitoramento-entregas-por-placas.dto';
import { ConsultarEntregasPorPlacaDto } from './consultar-entregas-por-placas.dto';
import { buildEntregasPorPlacaQuery } from '../sql/entregas.sql';
import {
  isPlacaMonitorada,
  listarAliasesPlacasMonitoramento,
  normalizarPlacaMonitoramento,
  obterPlacaCanonicalMonitoramento,
} from '../config/placas-monitoramento.config';
import {
  buildConhecimentosPorRomaneiosKmmQuery,
  buildConhecimentosMonitoramentoKmmQuery,
  buildCtrcsSswPorNfQuery,
  buildEventosOperacaoMonitoramentoKmmQuery,
  buildEventosRomaneioOperacaoKmmQuery,
  buildNotasConhecimentosKmmQuery,
  buildPessoasFisicasKmmQuery,
} from '../sql/monitoramento-kmm-ssw.sql';

type EntregaPorPlacaRow = {
  cgc_pag: string | null;
  data_ref: string | null;
  seq_ctrc: string;
  ser_ctrc: string;
  nro_ctrc: string;
  seq_manifesto: string | null;
  data_entrega: string | null;
  hora_entrega: string | null;
  data_prev_ent: string | null;
  nome_cli_dest: string | null;
  data_ult_ocor: string | null;
  ult_ocor: string | null;
  sigla_fil_emit: string | null;
  ocorrencia: string | null;
  cidade_origem: string | null;
  cidade_dest: string | null;
  uf_dest: string | null;
  placa_cavalo: string | null;
  nome_motorista: string | null;
};

type KmmConhecimentoMonitoramentoRow = QueryResultRow & {
  placa: string;
  romaneio: string;
  conhecimento_id: string;
  date_update: string | Date;
};

type KmmConhecimentoCandidatoRow = KmmConhecimentoMonitoramentoRow & {
  origemDateUpdate: boolean;
  origemEventoDia: boolean;
};

type KmmNotaConhecimentoRow = QueryResultRow & {
  conhecimento_id: string;
  nf_minima: string | number;
};

type KmmEnriquecimentoEventoRow = QueryResultRow & {
  placa: string;
  romaneio: string;
  data_inclusao: string | null;
  hora_inclusao: string | null;
  primeiro_evento: string | Date | null;
  ultimo_evento: string | Date | null;
  nome_motorista: string | null;
};

type KmmEventoOperacaoRow = QueryResultRow & {
  romaneio: string;
  controle_evo_id: string;
  placa: string | null;
  data_evento: string | Date;
  cod_pessoa: string | null;
  num_evento: string | number | null;
};

type KmmPessoaFisicaRow = QueryResultRow & {
  cod_pessoa: string;
  nome: string;
};

type SswCtrcRow = QueryResultRow & {
  seq_ctrc: string | number;
  ser_ctrc: string;
  nro_ctrc: string | number;
  nro_nf_min: string | number;
  ult_ocor: string | null;
  data_ult_ocor: string | Date | null;
  hora_ult_ocor: string | null;
  data_entrega: string | Date | null;
  hora_entrega: string | null;
};

type MonitoramentoEntregasPorPlacasRow = {
  romaneio: string;
  seq_manifesto: string | number | null;
  ser_manifesto: string | null;
  nro_manifesto: string | number | null;
  data_inclusao: string | null;
  hora_inclusao: string | null;
  placa_cavalo: string | null;
  placa_carreta: string | null;
  placa_carreta2: string | null;
  marca: string | null;
  modelo: string | null;
  nome_motorista: string | null;
  data_monitoramento: string | null;
  qtd_ctrcs: number;
  entregues: number;
  faltam: number;
  em_atraso: number;
  rotas: string | null;
  ultima_ocorrencia: string | null;
  data_ultima_ocorrencia: string | null;
  percentual_entregue: number;
  status_rota: 'Finalizada' | 'Em andamento';
};

type DocumentoRota = {
  conhecimentoId: string;
  nfMinima: number | null;
};

type RotaKmm = {
  placa: string;
  placaCanonical: string;
  romaneio: string;
  dataInclusao: string | null;
  horaInclusao: string | null;
  nomeMotorista: string | null;
  origemDateUpdate: boolean;
  origemEventoDia: boolean;
  temEventoNoDia: boolean;
  temAtividadeSswNoDia: boolean;
  documentos: Map<string, DocumentoRota>;
};

@Injectable()
export class EntregasPorPlacasService {
  private readonly logger = new Logger(EntregasPorPlacasService.name);

  constructor(
    private readonly postgresDeliveriesService: PostgresDeliveriesService,
    private readonly kmmDatabaseService: KmmDatabaseService,
  ) {}

  async buscarPorPlaca(dto: ConsultarEntregasPorPlacaDto) {
    try {
      const query = buildEntregasPorPlacaQuery(dto.placa);

      const entregas =
        await this.postgresDeliveriesService.query<EntregaPorPlacaRow>(
          query.text,
          query.values,
        );

      return {
        success: true,
        placa: dto.placa,
        total: entregas.length,
        data: entregas,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao consultar entregas da placa ${dto.placa}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        'Nao foi possivel consultar as entregas pela placa.',
      );
    }
  }

async buscarMonitoramento(
  dto: ConsultarMonitoramentoEntregasPorPlacasDto,
) {
  const inicio = Date.now();

  try {
    console.log('==============================================');
    console.log('[MONITORAMENTO] 01 - INICIO');
    console.log('[MONITORAMENTO] DTO:', dto);

    const data = this.resolverDataMonitoramento(dto.data);

    console.log('[MONITORAMENTO] 02 - DATA RESOLVIDA:', data);

    // =========================================================
    // FONTE A - CONHECIMENTOS POR DATE_UPDATE
    // =========================================================

    console.log(
      '[MONITORAMENTO] 03 - ANTES buildConhecimentosMonitoramentoKmmQuery',
    );

    const conhecimentosQuery =
      buildConhecimentosMonitoramentoKmmQuery(data);

    console.log(
      '[MONITORAMENTO] 04 - QUERY FONTE A MONTADA',
    );
    console.log(
      '[MONITORAMENTO] 04.1 - VALUES:',
      conhecimentosQuery.values,
    );

    console.log(
      '[MONITORAMENTO] 05 - ANTES executar FONTE A no KMM',
    );

    const inicioFonteA = Date.now();

    const conhecimentosKmm =
     await this.kmmDatabaseService.query<KmmConhecimentoMonitoramentoRow>(
    conhecimentosQuery.text,
    conhecimentosQuery.values,
  );

console.log(
  '[TEMPO] FONTE A:',
  `${Date.now() - inicioFonteA}ms`,
);

    // =========================================================
    // FILTRO DAS PLACAS MONITORADAS
    // =========================================================

    const conhecimentosMonitorados =
      this.aplicarFiltroPlacasMonitoradas(conhecimentosKmm);

    console.log(
      '[MONITORAMENTO] 07 - CONHECIMENTOS APOS FILTRO:',
      conhecimentosMonitorados.length,
    );

    const conhecimentosDateUpdate =
      conhecimentosMonitorados.map((conhecimento) => ({
        ...conhecimento,
        origemDateUpdate: true,
        origemEventoDia: false,
      }));

    // =========================================================
    // FONTE B - EVENTOS DO DIA
    // =========================================================

    console.log(
      '[MONITORAMENTO] 08 - ANTES buscarEventosDiaKmm / FONTE B',
    );

    const inicioFonteB = Date.now();

    const eventosDia = await this.buscarEventosDiaKmm(data);

    console.log(
      '[TEMPO] FONTE B EVENTOS:',
      `${Date.now() - inicioFonteB}ms`,
    );

    // =========================================================
    // CONHECIMENTOS DOS ROMANEIOS ENCONTRADOS NA FONTE B
    // =========================================================

    console.log(
      '[MONITORAMENTO] 10 - ANTES buscarConhecimentosEventosDiaKmm',
    );

   const inicioConhecimentosFonteB = Date.now();

  const conhecimentosEventoDia =
  await this.buscarConhecimentosEventosDiaKmm(eventosDia);

  console.log(
  '[TEMPO] CONHECIMENTOS FONTE B:',
  `${Date.now() - inicioConhecimentosFonteB}ms`,
);

    // =========================================================
    // UNE FONTE A + FONTE B
    // =========================================================

    console.log(
      '[MONITORAMENTO] 12 - ANTES unir conhecimentos A + B',
    );

    const conhecimentosCandidatos =
      this.aplicarFiltroPlaca(
        this.unirConhecimentosCandidatos(
          conhecimentosDateUpdate,
          conhecimentosEventoDia,
          eventosDia,
        ),
        dto,
      );

    console.log(
      '[MONITORAMENTO] 13 - CONHECIMENTOS CANDIDATOS:',
      conhecimentosCandidatos.length,
    );

    const conhecimentoIds =
      this.obterConhecimentoIds(conhecimentosCandidatos);

    console.log(
      '[MONITORAMENTO] 14 - IDS DE CONHECIMENTO:',
      conhecimentoIds.length,
    );

    // =========================================================
    // NOTAS KMM
    // =========================================================

    console.log(
      '[MONITORAMENTO] 15 - ANTES buscarNotasKmm',
    );

    const inicioNotasKmm = Date.now();

    const notasKmm = await this.buscarNotasKmm(conhecimentoIds);

    console.log(
    '[TEMPO] NOTAS KMM:',
    `${Date.now() - inicioNotasKmm}ms`,
  );

    // =========================================================
    // ROTAS
    // =========================================================

    const rotas =
      this.obterRotasDistintas(conhecimentosCandidatos);

    console.log(
      '[MONITORAMENTO] 17 - ROTAS DISTINTAS:',
      rotas.length,
    );

    // =========================================================
    // ENRIQUECIMENTO KMM
    // =========================================================

    console.log(
      '[MONITORAMENTO] 18 - ANTES buscarEnriquecimentosKmm',
    );

    const inicioEnriquecimentos = Date.now();

    const enriquecimentos =
    await this.buscarEnriquecimentosKmm(data, rotas);

    console.log(
      '[TEMPO] ENRIQUECIMENTOS:',
      `${Date.now() - inicioEnriquecimentos}ms`,
    );

    // =========================================================
    // MAPAS
    // =========================================================

    console.log(
      '[MONITORAMENTO] 20 - MONTANDO MAPAS',
    );

    const notasPorConhecimento =
      this.mapearNotasPorConhecimento(notasKmm);

    const enriquecimentosPorRota =
      this.mapearEnriquecimentosPorRota(enriquecimentos);

    const nfs =
      this.obterNfsDistintas(notasKmm);

    console.log(
      '[MONITORAMENTO] 21 - NFS DISTINTAS:',
      nfs.length,
    );

    // =========================================================
    // SSW
    // =========================================================

    console.log(
      '[MONITORAMENTO] 22 - ANTES buscarCtrcsSsw',
    );

    const inicioCtrcsSsw = Date.now();

    const ctrcsSsw = await this.buscarCtrcsSsw(nfs);

      console.log(
        '[TEMPO] CTRCS SSW:',
        `${Date.now() - inicioCtrcsSsw}ms`,
      );

    // =========================================================
    // AGRUPAMENTO
    // =========================================================

    console.log(
      '[MONITORAMENTO] 24 - ANTES agruparCtrcsPorNf',
    );

    const ctrcsPorNf =
      this.agruparCtrcsPorNf(ctrcsSsw);

    console.log(
      '[MONITORAMENTO] 25 - CTRCS AGRUPADOS. NFS:',
      ctrcsPorNf.size,
    );

    // =========================================================
    // MONTAGEM FINAL
    // =========================================================

    console.log(
      '[MONITORAMENTO] 26 - ANTES montarLinhasMonitoramento',
    );

    const dataRows =
      this.montarLinhasMonitoramento(
        conhecimentosCandidatos,
        notasPorConhecimento,
        enriquecimentosPorRota,
        ctrcsPorNf,
        data,
        dto,
      );

    console.log(
      '[MONITORAMENTO] 27 - LINHAS MONTADAS:',
      dataRows.length,
    );

    console.log(
      '[MONITORAMENTO] 28 - FINALIZADO EM:',
      `${Date.now() - inicio}ms`,
    );

    console.log('==============================================');

    return {
      success: true,
      data,
      filtros: {
        placa: dto.placa,
        motorista: dto.motorista,
      },
      resumo: this.montarResumoMonitoramento(dataRows),
      dataRows,
    };
  } catch (error) {
    console.error('==============================================');
    console.error('[MONITORAMENTO] ERRO CAPTURADO');
    console.error(
      '[MONITORAMENTO] TEMPO ATE O ERRO:',
      `${Date.now() - inicio}ms`,
    );

    if (error instanceof Error) {
      console.error('[MONITORAMENTO] NAME:', error.name);
      console.error('[MONITORAMENTO] MESSAGE:', error.message);
      console.error('[MONITORAMENTO] STACK:', error.stack);
    } else {
      console.error('[MONITORAMENTO] ERRO:', error);
    }

    console.error('==============================================');

    this.logger.error(
      'Erro ao consultar monitoramento de entregas por placas',
      error instanceof Error ? error.stack : String(error),
    );

    throw new InternalServerErrorException(
      'Nao foi possivel consultar o monitoramento de entregas por placas.',
    );
  }
}

  private resolverDataMonitoramento(data?: string) {
    if (data?.trim()) {
      return data.trim();
    }

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  private aplicarFiltroPlaca<T extends { placa: string }>(
    conhecimentos: T[],
    dto: ConsultarMonitoramentoEntregasPorPlacasDto,
  ) {
    if (!dto.placa?.trim()) {
      return conhecimentos;
    }

    const placaFiltro = this.normalizarPlaca(dto.placa);

    return conhecimentos.filter((conhecimento) =>
      this.getPlacasBusca(conhecimento.placa).some((placa) =>
        placa.includes(placaFiltro),
      ),
    );
  }

  private aplicarFiltroPlacasMonitoradas<
    T extends KmmConhecimentoMonitoramentoRow,
  >(conhecimentos: T[]) {
    return conhecimentos.filter((conhecimento) =>
      isPlacaMonitorada(conhecimento.placa),
    );
  }

  private contarRotas(conhecimentos: KmmConhecimentoMonitoramentoRow[]) {
    return this.obterRotasDistintas(conhecimentos).length;
  }

private async buscarEventosDiaKmm(data: string) {
  console.log('----------------------------------------------');
  console.log('[FONTE B] 01 - ENTROU buscarEventosDiaKmm');
  console.log('[FONTE B] 02 - DATA:', data);

  const placas = listarAliasesPlacasMonitoramento();

  console.log('[FONTE B] 03 - QUANTIDADE DE PLACAS:', placas.length);
  console.log('[FONTE B] 04 - PLACAS:', placas);

  if (!placas.length) {
    console.log('[FONTE B] 05 - NENHUMA PLACA, RETORNANDO []');
    return [];
  }

  console.log('[FONTE B] 06 - ANTES DE MONTAR QUERY');

  const query = buildEventosOperacaoMonitoramentoKmmQuery(
    data,
    placas,
  );

  console.log('[FONTE B] 07 - QUERY MONTADA');
  console.log('[FONTE B] 08 - VALUES:', query.values);
  console.log('[FONTE B] 09 - SQL:');
  console.log(query.text);

  console.log('[FONTE B] 10 - ANTES DE EXECUTAR QUERY KMM');

  try {
    const resultado =
      await this.kmmDatabaseService.query<KmmEventoOperacaoRow>(
        query.text,
        query.values,
      );

    console.log(
      '[FONTE B] 11 - QUERY EXECUTADA COM SUCESSO. REGISTROS:',
      resultado.length,
    );

    console.log('----------------------------------------------');

    return resultado;
  } catch (error) {
    console.error('----------------------------------------------');
    console.error('[FONTE B] ERRO AO EXECUTAR QUERY');

    if (error instanceof Error) {
      console.error('[FONTE B] NAME:', error.name);
      console.error('[FONTE B] MESSAGE:', error.message);
      console.error('[FONTE B] STACK:', error.stack);
    } else {
      console.error('[FONTE B] ERRO:', error);
    }

    console.error('----------------------------------------------');

    throw error;
  }
}

  private async buscarConhecimentosEventosDiaKmm(
    eventosDia: KmmEventoOperacaoRow[],
  ): Promise<KmmConhecimentoCandidatoRow[]> {
    const romaneios = Array.from(
      new Set(
        eventosDia
          .map((evento) => String(evento.romaneio).trim())
          .filter(Boolean),
      ),
    );

    if (!romaneios.length) {
      return [];
    }

    const eventosPorRota = this.mapearEventosDiaPorRota(eventosDia);
    const query = buildConhecimentosPorRomaneiosKmmQuery(romaneios);
    const conhecimentos =
      await this.kmmDatabaseService.query<KmmConhecimentoMonitoramentoRow>(
        query.text,
        query.values,
      );

    return conhecimentos
      .map((conhecimento): KmmConhecimentoCandidatoRow | null => {
        const key = this.getRotaKey(conhecimento.placa, conhecimento.romaneio);
        const eventos = eventosPorRota.get(key) ?? [];
        const primeiroEvento = eventos[0];

        if (!primeiroEvento) {
          return null;
        }

        return {
          ...conhecimento,
          placa: this.escolherPlacaExibicao(
            conhecimento.placa,
            primeiroEvento.placa ?? conhecimento.placa,
          ),
          origemDateUpdate: false,
          origemEventoDia: true,
        } satisfies KmmConhecimentoCandidatoRow;
      })
      .filter(
        (conhecimento): conhecimento is KmmConhecimentoCandidatoRow =>
          conhecimento !== null,
      );
  }

  private unirConhecimentosCandidatos(
    conhecimentosDateUpdate: KmmConhecimentoCandidatoRow[],
    conhecimentosEventoDia: KmmConhecimentoCandidatoRow[],
    _eventosDia: KmmEventoOperacaoRow[],
  ) {
    const conhecimentos = new Map<string, KmmConhecimentoCandidatoRow>();

    for (const conhecimento of [
      ...conhecimentosDateUpdate,
      ...conhecimentosEventoDia,
    ]) {
      const existente = conhecimentos.get(conhecimento.conhecimento_id);

      conhecimentos.set(conhecimento.conhecimento_id, {
        ...conhecimento,
        placa: this.escolherPlacaExibicao(
          existente?.placa,
          conhecimento.placa,
        ),
        origemDateUpdate:
          Boolean(existente?.origemDateUpdate) ||
          conhecimento.origemDateUpdate,
        origemEventoDia:
          Boolean(existente?.origemEventoDia) || conhecimento.origemEventoDia,
      });
    }

    return Array.from(conhecimentos.values());
  }

  private obterRotasDistintas(
    conhecimentos: Array<Pick<KmmConhecimentoMonitoramentoRow, 'placa' | 'romaneio'>>,
  ) {
    const rotas = new Map<string, { placa: string; romaneio: string }>();

    for (const conhecimento of conhecimentos) {
      const key = this.getRotaKey(conhecimento.placa, conhecimento.romaneio);
      const rotaAtual = rotas.get(key);

      rotas.set(key, {
        placa: this.escolherPlacaExibicao(rotaAtual?.placa, conhecimento.placa),
        romaneio: conhecimento.romaneio,
      });
    }

    return Array.from(rotas.values());
  }

  private obterConhecimentoIds(
    conhecimentos: KmmConhecimentoMonitoramentoRow[],
  ) {
    return Array.from(
      new Set(conhecimentos.map((conhecimento) => conhecimento.conhecimento_id)),
    );
  }

  private async buscarNotasKmm(conhecimentoIds: string[]) {
    if (!conhecimentoIds.length) {
      return [];
    }

    const query = buildNotasConhecimentosKmmQuery(conhecimentoIds);

    return this.kmmDatabaseService.query<KmmNotaConhecimentoRow>(
      query.text,
      query.values,
    );
  }

  private async buscarEnriquecimentosKmm(
    data: string,
    rotas: Array<{ placa: string; romaneio: string }>,
  ) {
    if (!rotas.length) {
      return [];
    }

    const romaneios = Array.from(
      new Set(rotas.map((rota) => rota.romaneio)),
    );
    const eventosQuery = buildEventosRomaneioOperacaoKmmQuery(
      data,
      romaneios,
    );
    const eventos = await this.kmmDatabaseService.query<KmmEventoOperacaoRow>(
      eventosQuery.text,
      eventosQuery.values,
    );
    const enriquecimentosSemNome = this.montarEnriquecimentosSemNome(
      data,
      rotas,
      eventos,
    );
    const codPessoas = Array.from(
      new Set(
        enriquecimentosSemNome
          .map((enriquecimento) => enriquecimento.codPessoa)
          .filter((codPessoa): codPessoa is string => Boolean(codPessoa)),
      ),
    );
    const pessoasPorCodigo = await this.buscarPessoasPorCodigo(codPessoas);

    return enriquecimentosSemNome.map((enriquecimento) => ({
      placa: enriquecimento.placa,
      romaneio: enriquecimento.romaneio,
      data_inclusao: enriquecimento.data_inclusao,
      hora_inclusao: enriquecimento.hora_inclusao,
      primeiro_evento: enriquecimento.primeiro_evento,
      ultimo_evento: enriquecimento.ultimo_evento,
      nome_motorista: enriquecimento.codPessoa
        ? pessoasPorCodigo.get(enriquecimento.codPessoa) ?? null
        : null,
    }));
  }

  private montarEnriquecimentosSemNome(
    data: string,
    rotas: Array<{ placa: string; romaneio: string }>,
    eventosKmm: KmmEventoOperacaoRow[],
  ) {
    const enriquecimentos: Array<
      Omit<KmmEnriquecimentoEventoRow, 'nome_motorista'> & {
        codPessoa: string | null;
      }
    > = [];

    for (const rota of rotas) {
      const eventos = eventosKmm
        .filter(
          (evento) =>
            String(evento.romaneio).trim() === String(rota.romaneio).trim() &&
            evento.placa !== null,
        )
        .sort(
          (a, b) =>
            this.getTimestamp(a.data_evento) - this.getTimestamp(b.data_evento),
        );

      if (!eventos.length) {
        continue;
      }

      const eventosDoDia = eventos.filter((evento) =>
        this.isDataNoDiaMonitorado(evento.data_evento, data),
      );
      const primeiroEvento = eventosDoDia[0] ?? null;
      const ultimoEvento = eventosDoDia[eventosDoDia.length - 1] ?? null;
      const ultimoEventoMotorista = [...eventos]
        .reverse()
        .find((evento) => evento.cod_pessoa !== null);

      enriquecimentos.push({
        placa: rota.placa,
        romaneio: rota.romaneio,
        data_inclusao: primeiroEvento
          ? this.formatDate(primeiroEvento.data_evento)
          : null,
        hora_inclusao: primeiroEvento
          ? this.formatTime(primeiroEvento.data_evento)
          : null,
        primeiro_evento: primeiroEvento?.data_evento ?? null,
        ultimo_evento: ultimoEvento?.data_evento ?? null,
        codPessoa: ultimoEventoMotorista?.cod_pessoa ?? null,
      });
    }

    return enriquecimentos;
  }

  private async buscarPessoasPorCodigo(codPessoas: string[]) {
    const pessoasPorCodigo = new Map<string, string>();

    if (!codPessoas.length) {
      return pessoasPorCodigo;
    }

    const query = buildPessoasFisicasKmmQuery(codPessoas);
    const pessoas = await this.kmmDatabaseService.query<KmmPessoaFisicaRow>(
      query.text,
      query.values,
    );

    for (const pessoa of pessoas) {
      pessoasPorCodigo.set(pessoa.cod_pessoa, pessoa.nome);
    }

    return pessoasPorCodigo;
  }

  private mapearNotasPorConhecimento(notas: KmmNotaConhecimentoRow[]) {
    const notasPorConhecimento = new Map<string, number>();

    for (const nota of notas) {
      const nfMinima = Number(nota.nf_minima);

      if (Number.isFinite(nfMinima)) {
        notasPorConhecimento.set(nota.conhecimento_id, nfMinima);
      }
    }

    return notasPorConhecimento;
  }

  private mapearEnriquecimentosPorRota(
    enriquecimentos: KmmEnriquecimentoEventoRow[],
  ) {
    const enriquecimentosPorRota = new Map<string, KmmEnriquecimentoEventoRow>();

    for (const enriquecimento of enriquecimentos) {
      const key = this.getRotaKey(enriquecimento.placa, enriquecimento.romaneio);

      enriquecimentosPorRota.set(key, enriquecimento);
    }

    return enriquecimentosPorRota;
  }

  private obterNfsDistintas(notas: KmmNotaConhecimentoRow[]) {
    return Array.from(
      new Set(
        notas
          .map((nota) => Number(nota.nf_minima))
          .filter((nf) => Number.isFinite(nf)),
      ),
    );
  }

  private async buscarCtrcsSsw(nfs: number[]) {
    if (!nfs.length) {
      return [];
    }

    const query = buildCtrcsSswPorNfQuery(nfs);

    return this.postgresDeliveriesService.query<SswCtrcRow>(
      query.text,
      query.values as Array<string | number>,
    );
  }

  private agruparCtrcsPorNf(rows: SswCtrcRow[]) {
    const ctrcsPorSeq = new Map<string, SswCtrcRow>();

    for (const row of rows) {
      ctrcsPorSeq.set(String(row.seq_ctrc), row);
    }

    const ctrcsPorNf = new Map<number, SswCtrcRow[]>();

    for (const row of ctrcsPorSeq.values()) {
      const nf = Number(row.nro_nf_min);

      if (!Number.isFinite(nf)) {
        continue;
      }

      const ctrcs = ctrcsPorNf.get(nf) ?? [];
      ctrcs.push(row);
      ctrcsPorNf.set(nf, ctrcs);
    }

    return ctrcsPorNf;
  }

  private montarLinhasMonitoramento(
    conhecimentos: KmmConhecimentoCandidatoRow[],
    notasPorConhecimento: Map<string, number>,
    enriquecimentosPorRota: Map<string, KmmEnriquecimentoEventoRow>,
    ctrcsPorNf: Map<number, SswCtrcRow[]>,
    data: string,
    dto: ConsultarMonitoramentoEntregasPorPlacasDto,
  ): MonitoramentoEntregasPorPlacasRow[] {
    const rotas = this.agruparDocumentosPorRota(
      conhecimentos,
      notasPorConhecimento,
      enriquecimentosPorRota,
    );
    const rotasOperacionais = this.filtrarRotasOperacionais(
      rotas.values(),
      ctrcsPorNf,
      data,
    );
    const motoristaFiltro = dto.motorista?.trim().toUpperCase();

    return rotasOperacionais
      .filter((rota) => {
        if (!motoristaFiltro) {
          return true;
        }

        return rota.nomeMotorista?.toUpperCase().includes(motoristaFiltro);
      })
      .map((rota) => this.montarLinhaRota(rota, ctrcsPorNf, data))
      .sort((a, b) => {
        const placaCompare = String(a.placa_cavalo ?? '').localeCompare(
          String(b.placa_cavalo ?? ''),
        );

        if (placaCompare !== 0) {
          return placaCompare;
        }

        return String(a.romaneio).localeCompare(String(b.romaneio));
      });
  }

  private agruparDocumentosPorRota(
    conhecimentos: KmmConhecimentoCandidatoRow[],
    notasPorConhecimento: Map<string, number>,
    enriquecimentosPorRota: Map<string, KmmEnriquecimentoEventoRow>,
  ) {
    const rotas = new Map<string, RotaKmm>();

    for (const conhecimento of conhecimentos) {
      const key = this.getRotaKey(conhecimento.placa, conhecimento.romaneio);
      const enriquecimento = enriquecimentosPorRota.get(key);
      const rota =
        rotas.get(key) ??
        ({
          placa: this.escolherPlacaExibicao(undefined, conhecimento.placa),
          placaCanonical: this.getPlacaCanonical(conhecimento.placa),
          romaneio: conhecimento.romaneio,
          dataInclusao: enriquecimento?.data_inclusao ?? null,
          horaInclusao: enriquecimento?.hora_inclusao ?? null,
          nomeMotorista: enriquecimento?.nome_motorista ?? null,
          origemDateUpdate: conhecimento.origemDateUpdate,
          origemEventoDia: conhecimento.origemEventoDia,
          temEventoNoDia:
            conhecimento.origemEventoDia ||
            enriquecimento?.primeiro_evento != null,
          temAtividadeSswNoDia: false,
          documentos: new Map<string, DocumentoRota>(),
        } satisfies RotaKmm);
      const nfMinima =
        notasPorConhecimento.get(conhecimento.conhecimento_id) ?? null;

      rota.placa = this.escolherPlacaExibicao(rota.placa, conhecimento.placa);
      rota.origemDateUpdate =
        rota.origemDateUpdate || conhecimento.origemDateUpdate;
      rota.origemEventoDia =
        rota.origemEventoDia || conhecimento.origemEventoDia;
      rota.temEventoNoDia =
        rota.temEventoNoDia ||
        conhecimento.origemEventoDia ||
        enriquecimento?.primeiro_evento != null;

      rota.documentos.set(conhecimento.conhecimento_id, {
        conhecimentoId: conhecimento.conhecimento_id,
        nfMinima,
      });

      rotas.set(key, rota);
    }

    return rotas;
  }

  private filtrarRotasOperacionais(
    rotasInput: Iterable<RotaKmm>,
    ctrcsPorNf: Map<number, SswCtrcRow[]>,
    data: string,
  ) {
    const rotas = Array.from(rotasInput).map((rota) => {
      rota.temAtividadeSswNoDia = this.temAtividadeSswNoDia(
        rota,
        ctrcsPorNf,
        data,
      );

      return rota;
    });

    const rotasFortes = rotas.filter((rota) =>
      this.isRotaOperacionalForte(rota),
    );
    const fortesPorPlaca = new Map<string, RotaKmm[]>();

    for (const rota of rotasFortes) {
      const rotasDaPlaca = fortesPorPlaca.get(rota.placaCanonical) ?? [];
      rotasDaPlaca.push(rota);
      fortesPorPlaca.set(rota.placaCanonical, rotasDaPlaca);
    }

    const fallbackPorPlaca = new Map<string, RotaKmm>();

    for (const rota of rotas) {
      if (
        this.isRotaOperacionalForte(rota) ||
        !rota.origemDateUpdate ||
        this.temVinculoSsw(rota, ctrcsPorNf)
      ) {
        continue;
      }

      const fallbackAtual = fallbackPorPlaca.get(rota.placaCanonical);

      if (
        !fallbackAtual ||
        this.compararRomaneio(rota.romaneio, fallbackAtual.romaneio) > 0
      ) {
        fallbackPorPlaca.set(rota.placaCanonical, rota);
      }
    }

    const fallbacksMantidos = Array.from(fallbackPorPlaca.values()).filter(
      (fallback) => {
        const fortesDaPlaca = fortesPorPlaca.get(fallback.placaCanonical) ?? [];

        return !fortesDaPlaca.some(
          (rotaForte) =>
            this.compararRomaneio(rotaForte.romaneio, fallback.romaneio) >= 0,
        );
      },
    );

    return [...rotasFortes, ...fallbacksMantidos];
  }

  private isRotaOperacionalForte(rota: RotaKmm) {
    return (
      rota.temAtividadeSswNoDia ||
      (rota.origemDateUpdate && rota.temEventoNoDia)
    );
  }

  private temAtividadeSswNoDia(
    rota: RotaKmm,
    ctrcsPorNf: Map<number, SswCtrcRow[]>,
    data: string,
  ) {
    for (const documento of rota.documentos.values()) {
      if (documento.nfMinima === null) {
        continue;
      }

      const ctrcs = ctrcsPorNf.get(documento.nfMinima) ?? [];

      if (
        ctrcs.some(
          (ctrc) =>
            (ctrc.data_ult_ocor != null &&
              this.isDataNoDiaMonitorado(ctrc.data_ult_ocor, data)) ||
            (ctrc.data_entrega != null &&
              this.isDataNoDiaMonitorado(ctrc.data_entrega, data)),
        )
      ) {
        return true;
      }
    }

    return false;
  }

  private temVinculoSsw(
    rota: RotaKmm,
    ctrcsPorNf: Map<number, SswCtrcRow[]>,
  ) {
    for (const documento of rota.documentos.values()) {
      if (documento.nfMinima === null) {
        continue;
      }

      if ((ctrcsPorNf.get(documento.nfMinima) ?? []).length > 0) {
        return true;
      }
    }

    return false;
  }

  private montarLinhaRota(
    rota: RotaKmm,
    ctrcsPorNf: Map<number, SswCtrcRow[]>,
    data: string,
  ): MonitoramentoEntregasPorPlacasRow {
    const qtdCtrcs = rota.documentos.size;
    let entregues = 0;
    let encontradosSsw = 0;

    for (const documento of rota.documentos.values()) {
      if (documento.nfMinima === null) {
        continue;
      }

      const ctrcs = ctrcsPorNf.get(documento.nfMinima) ?? [];

      if (ctrcs.length > 0) {
        encontradosSsw += 1;
      }

      if (ctrcs.some((ctrc) => ctrc.data_entrega != null)) {
        entregues += 1;
      }
    }

    const faltam = Math.max(qtdCtrcs - entregues, 0);
    const semVinculoSsw = Math.max(qtdCtrcs - encontradosSsw, 0);

    if (semVinculoSsw > 0) {
      this.logger.warn(
        `Entregas por placas: ${semVinculoSsw} documentos sem vinculo SSW para ${rota.placa}/${rota.romaneio}.`,
      );
    }

    return {
      romaneio: rota.romaneio,
      seq_manifesto: null,
      ser_manifesto: null,
      nro_manifesto: null,
      data_inclusao: rota.dataInclusao,
      hora_inclusao: rota.horaInclusao,
      placa_cavalo: rota.placa,
      placa_carreta: null,
      placa_carreta2: null,
      marca: null,
      modelo: null,
      nome_motorista: rota.nomeMotorista,
      data_monitoramento: data,
      qtd_ctrcs: qtdCtrcs,
      entregues,
      faltam,
      em_atraso: 0,
      rotas: null,
      ultima_ocorrencia: null,
      data_ultima_ocorrencia: null,
      percentual_entregue: this.calcularPercentual(entregues, qtdCtrcs),
      status_rota: faltam === 0 ? 'Finalizada' : 'Em andamento',
    };
  }

  private montarResumoMonitoramento(
    dataRows: MonitoramentoEntregasPorPlacasRow[],
  ) {
    const qtdRotas = dataRows.length;
    const qtdCtrcs = dataRows.reduce(
      (total, row) => total + Number(row.qtd_ctrcs || 0),
      0,
    );
    const entregues = dataRows.reduce(
      (total, row) => total + Number(row.entregues || 0),
      0,
    );
    const faltam = dataRows.reduce(
      (total, row) => total + Number(row.faltam || 0),
      0,
    );

    return {
      qtdRotas,
      qtdCtrcs,
      entregues,
      faltam,
      emAtraso: 0,
      percentualEntregue: this.calcularPercentual(entregues, qtdCtrcs),
    };
  }

  private calcularPercentual(valor: number, total: number) {
    if (total === 0) {
      return 0;
    }

    return Number(((valor / total) * 100).toFixed(2));
  }

  private getRotaKey(placa: string, romaneio: string) {
    return `${this.getPlacaCanonical(placa)}|${String(romaneio).trim()}`;
  }

  private getPlacaCanonical(placa: string | null | undefined) {
    return (
      obterPlacaCanonicalMonitoramento(placa) ??
      this.normalizarPlaca(String(placa ?? ''))
    );
  }

  private getPlacasBusca(placa: string | null | undefined) {
    const placaNormalizada = this.normalizarPlaca(String(placa ?? ''));
    const placaCanonical = obterPlacaCanonicalMonitoramento(placa);

    return Array.from(
      new Set(
        [placaNormalizada, placaCanonical].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    );
  }

  private escolherPlacaExibicao(
    placaAtual: string | null | undefined,
    placaNova: string | null | undefined,
  ) {
    const atual = this.normalizarPlaca(String(placaAtual ?? ''));
    const nova = this.normalizarPlaca(String(placaNova ?? ''));

    if (!atual) {
      return nova;
    }

    if (!nova) {
      return atual;
    }

    const canonicalNova = obterPlacaCanonicalMonitoramento(nova);

    if (canonicalNova === nova && atual !== nova) {
      return nova;
    }

    return atual;
  }

  private mapearEventosDiaPorRota(eventosDia: KmmEventoOperacaoRow[]) {
    const eventosPorRota = new Map<string, KmmEventoOperacaoRow[]>();

    for (const evento of eventosDia) {
      if (!evento.placa) {
        continue;
      }

      const key = this.getRotaKey(evento.placa, evento.romaneio);
      const eventos = eventosPorRota.get(key) ?? [];
      eventos.push(evento);
      eventosPorRota.set(key, eventos);
    }

    for (const eventos of eventosPorRota.values()) {
      eventos.sort(
        (a, b) =>
          this.getTimestamp(a.data_evento) - this.getTimestamp(b.data_evento),
      );
    }

    return eventosPorRota;
  }

  private compararRomaneio(a: string, b: string) {
    const romaneioA = Number(a);
    const romaneioB = Number(b);

    if (Number.isFinite(romaneioA) && Number.isFinite(romaneioB)) {
      return romaneioA - romaneioB;
    }

    return String(a).localeCompare(String(b));
  }

  private isDataNoDiaMonitorado(value: string | Date, data: string) {
    return this.formatDate(value) === data;
  }

  private getTimestamp(value: string | Date) {
    return value instanceof Date ? value.getTime() : new Date(value).getTime();
  }

  private formatDate(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatTime(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${hour}:${minute}:${second}`;
  }

  private normalizarPlaca(value: string) {
    return normalizarPlacaMonitoramento(value);
  }
}
