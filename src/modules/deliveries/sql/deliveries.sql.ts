import { QueryDeliveriesDto } from '../dto/query-deliveries.dto';

const DEFAULT_SIGLA_FILIAL = 'CWB';

type SqlQuery = {
  text: string;
  values: Array<string>;
};

function getBaseSelect() {
  return `
    with entregas_base as (
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

        case
          when ctrc.data_entrega is not null then 'Entregue'
          when ctrc.data_entrega is null
               and ctrc.data_prev_ent < current_date then 'Em atraso'
          when ctrc.data_entrega is null
               and ctrc.data_prev_ent >= current_date then 'Pendente'
          else 'Pendente'
        end as status_entrega,

        case
          when ctrc.data_entrega is null
               and ctrc.data_prev_ent < current_date then 'Sim'
          else 'Nao'
        end as em_atraso,

        case
          when ctrc.data_entrega is null then '-'
          when ctrc.data_prev_ent is null then '-'
          when ctrc.data_entrega <= ctrc.data_prev_ent then 'DENTRO DO SLA'
          else 'FORA DO SLA'
        end as sla_entrega,

        case
          when ctrc.cidade_origem = 'ARAUCARIA'
               and ctrc.cidade_dest = 'CURITIBA'
            then 'Curitiba'

          when ctrc.cidade_origem = 'CURITIBA'
               and ctrc.cidade_dest = 'CURITIBA'
            then 'Curitiba'

          when ctrc.cgc_pag = '11137051049355'
               and ctrc.cidade_origem = 'ARAUCARIA'
               and ctrc.seq_manifesto is not null
            then 'Londrina'

          when ctrc.cgc_pag = '11137051075275'
               and ctrc.cidade_origem = 'ARAUCARIA'
               and ctrc.seq_manifesto is not null
            then 'Maringa'

          else '-'
        end as classificacao_rota
      from public.ctrc ctrc
      inner join public.ocorrencia ocorrencia
        on ctrc.ult_ocor = ocorrencia.codigo
      where ctrc.sigla_fil_emit = $1
        and ctrc.data_ref = $2::date
        and upper(coalesce(ctrc.nome_cli_dest, '')) not like '%BOTICARIO%'
        and upper(coalesce(ctrc.nome_cli_dest, '')) not like '%CALAMO%'
        and coalesce(ctrc.ult_ocor::text, '') <> '80'
        and upper(coalesce(ocorrencia.descricao, '')) not like '%MERCADORIA RECEBIDA PARA TRANSPORTE%'
    )
  `;
}

function buildOptionalFilters(
  filters: QueryDeliveriesDto,
  startIndex: number,
): SqlQuery {
  const values: Array<string> = [];
  const clauses: string[] = [];
  let currentIndex = startIndex;

  if (filters.ufDest?.trim()) {
    values.push(filters.ufDest.trim().toUpperCase());
    clauses.push(`uf_dest = $${currentIndex}`);
    currentIndex += 1;
  }

  if (filters.nroCtrc?.trim()) {
    values.push(`%${filters.nroCtrc.trim()}%`);
    clauses.push(`cast(nro_ctrc as text) ilike $${currentIndex}`);
    currentIndex += 1;
  }

  if (
    filters.statusEntrega?.trim() &&
    filters.statusEntrega.trim() !== 'Todos'
  ) {
    values.push(filters.statusEntrega.trim());
    clauses.push(`status_entrega = $${currentIndex}`);
    currentIndex += 1;
  }

  if (
    filters.classificacaoRota?.trim() &&
    filters.classificacaoRota.trim() !== 'Todos'
  ) {
    values.push(filters.classificacaoRota.trim());
    clauses.push(`classificacao_rota = $${currentIndex}`);
    currentIndex += 1;
  }

  return {
    text: clauses.length ? `where ${clauses.join(' and ')}` : '',
    values,
  };
}

export function buildDeliveriesQuery(filters: QueryDeliveriesDto): SqlQuery {
  const dataRef = filters.dataRef?.trim() || new Date().toISOString().slice(0, 10);
  const baseValues = [DEFAULT_SIGLA_FILIAL, dataRef];
  const optionalFilters = buildOptionalFilters(filters, 3);

  return {
    text: `
      ${getBaseSelect()}
      select
        cgc_pag,
        data_ref,
        seq_ctrc,
        ser_ctrc,
        nro_ctrc,
        seq_manifesto,
        data_entrega,
        hora_entrega,
        data_prev_ent,
        nome_cli_dest,
        data_ult_ocor,
        ult_ocor,
        sigla_fil_emit,
        ocorrencia,
        cidade_origem,
        cidade_dest,
        uf_dest,
        status_entrega,
        em_atraso,
        sla_entrega,
        classificacao_rota
      from entregas_base
      ${optionalFilters.text}
      order by
        case status_entrega
          when 'Em atraso' then 1
          when 'Pendente' then 2
          when 'Entregue' then 3
          else 4
        end,
        data_prev_ent asc nulls last,
        nro_ctrc desc;
    `,
    values: [...baseValues, ...optionalFilters.values],
  };
}

export function buildDeliveriesSummaryQuery(
  filters: QueryDeliveriesDto,
): SqlQuery {
  const dataRef = filters.dataRef?.trim() || new Date().toISOString().slice(0, 10);
  const baseValues = [DEFAULT_SIGLA_FILIAL, dataRef];
  const optionalFilters = buildOptionalFilters(filters, 3);

  return {
    text: `
      ${getBaseSelect()}
      select
        count(*)::int as "totalPedidos",
        count(*) filter (where status_entrega = 'Entregue')::int as entregues,
        count(*) filter (where status_entrega = 'Pendente')::int as pendentes,
        count(*) filter (where status_entrega = 'Em atraso')::int as "emAtraso",
        count(*) filter (
          where upper(ocorrencia) = 'MERCADORIA ENTREGUE'
            and sla_entrega = 'DENTRO DO SLA'
        )::int as "entregueDentroDoSla",
        count(*) filter (
          where upper(ocorrencia) = 'MERCADORIA ENTREGUE'
            and sla_entrega = 'FORA DO SLA'
        )::int as "entregueForaDoSla",
        case
          when count(*) = 0 then 0
          else round(
            (
              count(*) filter (where status_entrega = 'Entregue')::numeric
              / count(*)::numeric
            ) * 100,
            2
          )
        end as "porcentagemEntrega"
      from entregas_base
      ${optionalFilters.text};
    `,
    values: [...baseValues, ...optionalFilters.values],
  };
}
