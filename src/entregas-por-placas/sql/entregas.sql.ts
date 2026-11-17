type SqlQuery = {
  text: string;
  values: Array<string | number>;
};

type MonitoramentoEntregasPorPlacasFilters = {
  data?: string;
  placa?: string;
  motorista?: string;
};

function normalizePlate(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function buildEntregasPorPlacaQuery(
  placa: string,
): SqlQuery {
  const placaFormatada = normalizePlate(placa);

  return {
    text: `
      select
        ctrc.cgc_pag,
        ctrc.data_ref,
        ctrc.seq_ctrc,
        ctrc.ser_ctrc,
        ctrc.nro_ctrc,
        ctrc.seq_manifesto,
        ctrc.data_entrega,
        ctrc.hora_entrega,
        ctrc.data_prev_ent,
        ctrc.nome_cli_dest,
        ctrc.data_ult_ocor,
        ctrc.ult_ocor,
        ctrc.sigla_fil_emit,
        ocorrencia.descricao as ocorrencia,
        ctrc.cidade_origem,
        ctrc.cidade_dest,
        ctrc.uf_dest,
        manifesto.placa_cavalo,
        manifesto.placa_carreta,
        manifesto.placa_carreta2,
        manifesto.nome_motorista

      from public.ctrc ctrc

      left join public.ocorrencia ocorrencia
        on ctrc.ult_ocor = ocorrencia.codigo

      inner join public.manifesto manifesto
        on ctrc.seq_manifesto = manifesto.seq_manifesto

      where (
        regexp_replace(upper(coalesce(manifesto.placa_cavalo, '')), '[^A-Z0-9]', '', 'g') = $1
        or regexp_replace(upper(coalesce(manifesto.placa_carreta, '')), '[^A-Z0-9]', '', 'g') = $1
        or regexp_replace(upper(coalesce(manifesto.placa_carreta2, '')), '[^A-Z0-9]', '', 'g') = $1
      )

      order by
        ctrc.data_ref desc,
        ctrc.nro_ctrc desc;
    `,

    values: [
      placaFormatada,
    ],
  };
}

export function buildMonitoramentoEntregasPorPlacasQuery(
  filters: MonitoramentoEntregasPorPlacasFilters,
): SqlQuery {
  const values: Array<string | number> = [];
  const clauses: string[] = [];
  let currentIndex = 1;

  if (filters.data?.trim()) {
    values.push(filters.data.trim());
    clauses.push(`manifesto.data_inclusao = $${currentIndex}::date`);
    currentIndex += 1;
  } else {
    clauses.push(`manifesto.data_inclusao = (
      select max(manifesto_mais_recente.data_inclusao)
      from public.manifesto manifesto_mais_recente
    )`);
  }

  if (filters.placa?.trim()) {
    values.push(normalizePlate(filters.placa));
    clauses.push(`(
      regexp_replace(upper(coalesce(manifesto.placa_cavalo, '')), '[^A-Z0-9]', '', 'g') = $${currentIndex}
      or regexp_replace(upper(coalesce(manifesto.placa_carreta, '')), '[^A-Z0-9]', '', 'g') = $${currentIndex}
      or regexp_replace(upper(coalesce(manifesto.placa_carreta2, '')), '[^A-Z0-9]', '', 'g') = $${currentIndex}
    )`);
    currentIndex += 1;
  }

  if (filters.motorista?.trim()) {
    values.push(`%${filters.motorista.trim()}%`);
    clauses.push(`manifesto.nome_motorista ilike $${currentIndex}`);
  }

  const dataMonitoramentoSql = filters.data?.trim()
    ? '$1::date'
    : `(
      select max(manifesto_mais_recente.data_inclusao)
      from public.manifesto manifesto_mais_recente
    )`;

  return {
    text: `
      with entregas_base as (
        select
          concat(trim(manifesto.ser_manifesto), manifesto.nro_manifesto::text) as romaneio,
          manifesto.seq_manifesto,
          manifesto.ser_manifesto,
          manifesto.nro_manifesto,
          manifesto.data_inclusao,
          manifesto.hora_inclusao,
          manifesto.placa_cavalo,
          manifesto.placa_carreta,
          manifesto.placa_carreta2,
          manifesto.marca,
          manifesto.modelo,
          manifesto.nome_motorista,
          ${dataMonitoramentoSql} as data_monitoramento,
          ctrc.sigla_fil_emit,
          ctrc.seq_ctrc,
          ctrc.ser_ctrc,
          ctrc.nro_ctrc,
          ctrc.data_ref,
          ctrc.data_entrega,
          ctrc.data_prev_ent,
          ctrc.data_ult_ocor,
          ctrc.cidade_origem,
          ctrc.cidade_dest,
          ctrc.uf_dest,
          coalesce(ocorrencia.descricao, '') as ocorrencia,
          concat_ws(
            ' > ',
            nullif(ctrc.cidade_origem, ''),
            concat_ws('/', nullif(ctrc.cidade_dest, ''), nullif(ctrc.uf_dest, ''))
          ) as rota,
          concat_ws(
            '|',
            ctrc.sigla_fil_emit,
            ctrc.seq_ctrc::text,
            ctrc.ser_ctrc::text,
            ctrc.nro_ctrc::text,
            ctrc.data_ref::text
          ) as entrega_key
        from public.manifesto manifesto
        inner join public.ctrc ctrc
          on ctrc.seq_manifesto = manifesto.seq_manifesto
        left join public.ocorrencia ocorrencia
          on ctrc.ult_ocor = ocorrencia.codigo
        where ${clauses.join(' and ')}
      ),
      monitoramento as (
        select
          romaneio,
          seq_manifesto,
          ser_manifesto,
          nro_manifesto,
          data_inclusao,
          hora_inclusao,
          placa_cavalo,
          placa_carreta,
          placa_carreta2,
          marca,
          modelo,
          nome_motorista,
          data_monitoramento,
          count(distinct entrega_key)::int as qtd_ctrcs,
          count(distinct entrega_key) filter (
            where data_entrega is not null
              or upper(ocorrencia) = 'MERCADORIA ENTREGUE'
          )::int as entregues,
          count(distinct entrega_key) filter (
            where data_entrega is null
              and upper(ocorrencia) <> 'MERCADORIA ENTREGUE'
          )::int as faltam,
          count(distinct entrega_key) filter (
            where data_entrega is null
              and data_prev_ent < current_date
          )::int as em_atraso,
          string_agg(distinct nullif(rota, ''), ', ') as rotas,
          (array_agg(nullif(ocorrencia, '') order by data_ult_ocor desc nulls last))[1] as ultima_ocorrencia,
          max(data_ult_ocor) as data_ultima_ocorrencia
        from entregas_base
        group by
          romaneio,
          seq_manifesto,
          ser_manifesto,
          nro_manifesto,
          data_inclusao,
          hora_inclusao,
          placa_cavalo,
          placa_carreta,
          placa_carreta2,
          marca,
          modelo,
          nome_motorista,
          data_monitoramento
      )
      select
        *,
        case
          when qtd_ctrcs = 0 then 0
          else round((entregues::numeric / qtd_ctrcs::numeric) * 100, 2)
        end as percentual_entregue,
        case
          when faltam = 0 then 'Finalizada'
          when entregues > 0 then 'Em andamento'
          else 'Aguardando ocorrencia'
        end as status_rota
      from monitoramento
      order by
        faltam desc,
        entregues asc,
        hora_inclusao asc nulls last,
        romaneio asc;
    `,
    values,
  };
}
