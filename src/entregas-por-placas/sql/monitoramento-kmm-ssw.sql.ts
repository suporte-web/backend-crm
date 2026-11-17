type SqlValue = string | number | null;

type SqlQuery = {
  text: string;
  values: SqlValue[];
};

function addDays(data: string, days: number) {
  const [year, month, day] = data.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return date.toISOString().slice(0, 10);
}

export function buildConhecimentosMonitoramentoKmmQuery(
  data: string,
): SqlQuery {
  const values: SqlValue[] = [
    `${data} 00:00:00`,
    `${addDays(data, 1)} 00:00:00`,
  ];

  return {
    text: `
      select
        conhecimento."CONHECIMENTO_ID"::text as conhecimento_id,
        conhecimento."NUM_ROMANEIO"::text as romaneio,
        conhecimento."PLACA_TRACAO" as placa,
        conhecimento."DATE_UPDATE" as date_update
      from fiscal.conhecimento conhecimento
      where conhecimento."SERIE" = '30'
        and conhecimento."DATE_UPDATE" >= $1::timestamp
        and conhecimento."DATE_UPDATE" < $2::timestamp;
    `,
    values,
  };
}

export function buildConhecimentosPorRomaneiosKmmQuery(
  romaneios: string[],
): SqlQuery {
  const placeholders = romaneios
    .map((_, index) => `$${index + 1}`)
    .join(', ');

  return {
    text: `
      select
        conhecimento."CONHECIMENTO_ID"::text as conhecimento_id,
        conhecimento."NUM_ROMANEIO"::text as romaneio,
        conhecimento."PLACA_TRACAO" as placa,
        conhecimento."DATE_UPDATE" as date_update
      from fiscal.conhecimento conhecimento
      where conhecimento."SERIE" = '30'
        and conhecimento."NUM_ROMANEIO" in (${placeholders});
    `,
    values: romaneios,
  };
}

export function buildNotasConhecimentosKmmQuery(
  conhecimentoIds: string[],
): SqlQuery {
  const placeholders = conhecimentoIds
    .map((_, index) => `$${index + 1}::bigint`)
    .join(', ');

  return {
    text: `
      select
        nota_fiscal."CONHECIMENTO_ID"::text as conhecimento_id,
        min(
          substring(nota_fiscal."CHAVE_ACESSO_NFE" from 26 for 9)::bigint
        ) as nf_minima
      from fiscal.conhecimento_nota_fiscal nota_fiscal
      where nota_fiscal."CONHECIMENTO_ID" in (${placeholders})
      group by nota_fiscal."CONHECIMENTO_ID";
    `,
    values: conhecimentoIds,
  };
}

export function buildEventosOperacaoMonitoramentoKmmQuery(
  data: string,
  placas: string[],
): SqlQuery {
  const values: SqlValue[] = [
    `${data} 00:00:00`,
    `${addDays(data, 1)} 00:00:00`,
    ...placas,
  ];
  const placeholders = placas
    .map((_, index) => `$${index + 3}`)
    .join(', ');

  return {
    text: `
      with eventos_filtrados as materialized (
        select
          evento_operacao."DATALAKE_ID",
          evento_operacao."CONTROLE_EVO_ID",
          evento_operacao."PLACA",
          evento_operacao."DATA",
          evento_operacao."COD_PESSOA",
          evento_operacao."NUM_EVENTO"
        from oper.evento_operacao evento_operacao
        where evento_operacao."DATA" >= $1::timestamp
          and evento_operacao."DATA" < $2::timestamp
          and evento_operacao."PLACA" in (${placeholders})
      )
      select
        romaneio_evento."NUM_ROMANEIO"::text as romaneio,
        eventos_filtrados."CONTROLE_EVO_ID"::text as controle_evo_id,
        eventos_filtrados."PLACA"::text as placa,
        eventos_filtrados."DATA" as data_evento,
        eventos_filtrados."COD_PESSOA"::text as cod_pessoa,
        eventos_filtrados."NUM_EVENTO" as num_evento
      from eventos_filtrados
      inner join oper.romaneio_evento romaneio_evento
        on romaneio_evento."DATALAKE_ID" = eventos_filtrados."DATALAKE_ID"
       and romaneio_evento."CONTROLE_EVO_ID" =
           eventos_filtrados."CONTROLE_EVO_ID";
    `,
    values,
  };
}

export function buildRomaneioEventosPorRomaneioKmmQuery(
  romaneios: string[],
): SqlQuery {
  const placeholders = romaneios
    .map((_, index) => `$${index + 1}`)
    .join(', ');

  return {
    text: `
      select
        romaneio_evento."NUM_ROMANEIO"::text as romaneio,
        romaneio_evento."CONTROLE_EVO_ID"::text as controle_evo_id
      from oper.romaneio_evento romaneio_evento
      where romaneio_evento."NUM_ROMANEIO" in (${placeholders})
      order by
        romaneio_evento."NUM_ROMANEIO",
        romaneio_evento."CONTROLE_EVO_ID";
    `,
    values: romaneios,
  };
}

export function buildEventosRomaneioOperacaoKmmQuery(
  data: string,
  romaneios: string[],
): SqlQuery {
  const values: SqlValue[] = [
    `${data} 00:00:00`,
    `${addDays(data, 1)} 00:00:00`,
    ...romaneios,
  ];
  const placeholders = romaneios
    .map((_, index) => `$${index + 3}`)
    .join(', ');

  return {
    text: `
      with eventos_dia as (
        select
          romaneio_evento."NUM_ROMANEIO"::text as romaneio,
          romaneio_evento."CONTROLE_EVO_ID"::text as controle_evo_id,
          evento_operacao."PLACA"::text as placa,
          evento_operacao."DATA" as data_evento,
          evento_operacao."COD_PESSOA"::text as cod_pessoa,
          evento_operacao."NUM_EVENTO" as num_evento,
          0 as prioridade_motorista
        from oper.romaneio_evento romaneio_evento
        inner join oper.evento_operacao evento_operacao
          on evento_operacao."CONTROLE_EVO_ID" = romaneio_evento."CONTROLE_EVO_ID"
        where romaneio_evento."NUM_ROMANEIO" in (${placeholders})
          and evento_operacao."DATA" >= $1::timestamp
          and evento_operacao."DATA" < $2::timestamp
      ),
      ultimo_motorista as (
        select
          romaneio,
          controle_evo_id,
          placa,
          data_evento,
          cod_pessoa,
          num_evento,
          prioridade_motorista
        from (
          select
            romaneio_evento."NUM_ROMANEIO"::text as romaneio,
            romaneio_evento."CONTROLE_EVO_ID"::text as controle_evo_id,
            evento_operacao."PLACA"::text as placa,
            evento_operacao."DATA" as data_evento,
            evento_operacao."COD_PESSOA"::text as cod_pessoa,
            evento_operacao."NUM_EVENTO" as num_evento,
            1 as prioridade_motorista,
            row_number() over (
              partition by romaneio_evento."NUM_ROMANEIO"
              order by
                evento_operacao."DATA" desc,
                romaneio_evento."CONTROLE_EVO_ID" desc
            ) as rn_motorista
          from oper.romaneio_evento romaneio_evento
          inner join oper.evento_operacao evento_operacao
            on evento_operacao."CONTROLE_EVO_ID" = romaneio_evento."CONTROLE_EVO_ID"
          where romaneio_evento."NUM_ROMANEIO" in (${placeholders})
            and evento_operacao."DATA" < $2::timestamp
            and evento_operacao."COD_PESSOA" is not null
        ) motoristas_rankeados
        where rn_motorista = 1
      )
      select
        eventos.romaneio,
        eventos.controle_evo_id,
        eventos.placa,
        eventos.data_evento,
        eventos.cod_pessoa,
        eventos.num_evento
      from (
        select * from eventos_dia
        union all
        select * from ultimo_motorista
      ) eventos
      order by
        eventos.romaneio,
        eventos.prioridade_motorista,
        eventos.data_evento,
        eventos.controle_evo_id;
    `,
    values,
  };
}

export function buildEventosOperacaoPorControleKmmQuery(
  data: string,
  controleEvoIds: string[],
): SqlQuery {
  const values: SqlValue[] = [
    `${data} 00:00:00`,
    `${addDays(data, 1)} 00:00:00`,
    ...controleEvoIds,
  ];
  const placeholders = controleEvoIds
    .map((_, index) => `$${index + 3}`)
    .join(', ');

  return {
    text: `
      select
        evento_operacao."CONTROLE_EVO_ID"::text as controle_evo_id,
        evento_operacao."PLACA"::text as placa,
        evento_operacao."DATA" as data_evento,
        evento_operacao."COD_PESSOA"::text as cod_pessoa
      from oper.evento_operacao evento_operacao
      where evento_operacao."CONTROLE_EVO_ID" in (${placeholders})
        and evento_operacao."DATA" >= $1::timestamp
        and evento_operacao."DATA" < $2::timestamp
      order by
        evento_operacao."DATA",
        evento_operacao."CONTROLE_EVO_ID";
    `,
    values,
  };
}

export function buildPessoasFisicasKmmQuery(codPessoas: string[]): SqlQuery {
  const placeholders = codPessoas
    .map((_, index) => `$${index + 1}`)
    .join(', ');

  return {
    text: `
      select
        pessoa_fisica."COD_PESSOA"::text as cod_pessoa,
        pessoa_fisica."NOME" as nome
      from kss.pessoa_fisica pessoa_fisica
      where pessoa_fisica."COD_PESSOA" in (${placeholders});
    `,
    values: codPessoas,
  };
}

export function buildCtrcsSswPorNfQuery(nfs: number[]): SqlQuery {
  const placeholders = nfs
    .map((_, index) => `$${index + 1}::bigint`)
    .join(', ');

  return {
    text: `
      select
        seq_ctrc,
        ser_ctrc,
        nro_ctrc,
        nro_nf_min,
        ult_ocor,
        data_ult_ocor,
        hora_ult_ocor,
        data_entrega,
        hora_entrega
      from (
        select
          ctrc.seq_ctrc,
          ctrc.ser_ctrc,
          ctrc.nro_ctrc,
          ctrc.nro_nf_min,
          ctrc.ult_ocor,
          ctrc.data_ult_ocor,
          ctrc.hora_ult_ocor,
          ctrc.data_entrega,
          ctrc.hora_entrega,
          row_number() over (
            partition by ctrc.seq_ctrc
            order by
              ctrc.data_ult_ocor desc nulls last,
              ctrc.hora_ult_ocor desc nulls last,
              ctrc.data_entrega desc nulls last,
              ctrc.hora_entrega desc nulls last
          ) as rn_ctrc
        from public.ctrc ctrc
        where ctrc.ser_ctrc = 'BET'
          and ctrc.nro_nf_min in (${placeholders})
      ) ctrcs_rankeados
      where rn_ctrc = 1;
    `,
    values: nfs,
  };
}
