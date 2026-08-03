import { QueryDeliveriesDto } from '../dto/query-deliveries.dto';

type SqlQuery = {
  text: string;
  values: Array<string | number>;
};

type FilterOptions = {
  includeCity?: boolean;
  includeUf?: boolean;
  includeCnpjPagador?: boolean;
  includeOcorrencia?: boolean;
  includeDefaultDateRange?: boolean;
};

function getBaseSelect() {
  return `
    with ctrc_deduplicado as (
      select *
      from (
        select
          ctrc.*,
          row_number() over (
            partition by
              ctrc.sigla_fil_emit,
              ctrc.seq_ctrc,
              ctrc.ser_ctrc,
              ctrc.nro_ctrc,
              ctrc.data_ref
            order by
              ctrc.data_ult_ocor desc nulls last,
              ctrc.data_entrega desc nulls last,
              ctrc.data_prev_ent desc nulls last,
              ctrc.seq_manifesto desc nulls last
          ) as rn_entrega
        from public.ctrc ctrc
      ) ranked_ctrc
      where rn_entrega = 1
    ),
    entregas_base as (
      select
        ctrc.cgc_pag,
        ctrc.cgc_emit,
        ctrc.nome_cli_emit,
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
        coalesce(ocorrencia.descricao, '') as ocorrencia,
        ctrc.cidade_origem,
        ctrc.cidade_dest,
        ctrc.uf_dest,

        case
          when ctrc.data_entrega is not null then 'Entregue'
          when ctrc.data_entrega is null
               and ctrc.data_prev_ent < current_date then 'Em atraso'
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

      from ctrc_deduplicado ctrc

      left join public.ocorrencia ocorrencia
        on ctrc.ult_ocor = ocorrencia.codigo
    )
  `;
}

function firstFilled(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean);
}

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);

  startDate.setDate(startDate.getDate() - 30);

  return {
    dataInicio: formatDate(startDate),
    dataFim: formatDate(endDate),
  };
}

function getPagination(filters: QueryDeliveriesDto) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 100;

  return {
    limit,
    offset: (page - 1) * limit,
  };
}

function buildOptionalFilters(
  filters: QueryDeliveriesDto,
  startIndex: number,
  clientDocument?: string,
  options: FilterOptions = {},
): SqlQuery {
  const values: Array<string | number> = [];
  const clauses: string[] = [];
  let currentIndex = startIndex;
  const includeCity = options.includeCity ?? true;
  const includeUf = options.includeUf ?? true;
  const includeCnpjPagador = options.includeCnpjPagador ?? true;
  const includeOcorrencia = options.includeOcorrencia ?? true;
  const includeDefaultDateRange = options.includeDefaultDateRange ?? true;

  if (clientDocument !== undefined) {
    values.push(clientDocument);
    clauses.push(
      `regexp_replace(coalesce(cgc_pag::text, ''), '\\D', '', 'g') = $${currentIndex}`,
    );
    currentIndex += 1;
  }

  let dataInicio = firstFilled(filters.dataInicio, filters.dataInicial);
  let dataFim = firstFilled(filters.dataFim, filters.dataFinal);
  const dataRef = firstFilled(filters.dataRef, filters.data);

  if (includeDefaultDateRange && !dataInicio && !dataFim && !dataRef) {
    const defaultRange = getDefaultDateRange();

    dataInicio = defaultRange.dataInicio;
    dataFim = defaultRange.dataFim;
  }

  if (dataInicio || dataFim) {
    if (dataInicio) {
      values.push(dataInicio);
      clauses.push(`data_ref >= $${currentIndex}::date`);
      currentIndex += 1;
    }

    if (dataFim) {
      values.push(dataFim);
      clauses.push(`data_ref <= $${currentIndex}::date`);
      currentIndex += 1;
    }
  } else if (dataRef) {
    values.push(dataRef);
    clauses.push(`data_ref = $${currentIndex}::date`);
    currentIndex += 1;
  }

  const ufDest = firstFilled(filters.ufDest, filters.uf);

  if (includeUf && ufDest) {
    values.push(ufDest.toUpperCase());
    clauses.push(`upper(coalesce(uf_dest, '')) = $${currentIndex}`);
    currentIndex += 1;
  }

  const cidadeDest = firstFilled(filters.cidadeDest, filters.cidade);

  if (includeCity && cidadeDest) {
    values.push(cidadeDest);
    clauses.push(`upper(coalesce(cidade_dest, '')) = upper($${currentIndex})`);
    currentIndex += 1;
  }

  if (filters.nroCtrc?.trim()) {
    values.push(`%${filters.nroCtrc.trim()}%`);
    clauses.push(`cast(nro_ctrc as text) ilike $${currentIndex}`);
    currentIndex += 1;
  }

  if (includeCnpjPagador && filters.cnpjPagador?.trim()) {
    const cnpjDigits = filters.cnpjPagador.replace(/\D/g, '');
    const cnpjSearch = cnpjDigits || filters.cnpjPagador.trim();

    values.push(`%${cnpjSearch}%`);
    clauses.push(
      `regexp_replace(coalesce(cgc_pag::text, ''), '\\D', '', 'g') ilike $${currentIndex}`,
    );
    currentIndex += 1;
  }

  if (
    includeOcorrencia &&
    filters.ocorrencia?.trim() &&
    filters.ocorrencia.trim() !== 'Todos'
  ) {
    values.push(`%${filters.ocorrencia.trim()}%`);
    clauses.push(
      `(cast(ult_ocor as text) ilike $${currentIndex} or ocorrencia ilike $${currentIndex})`,
    );
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

export function buildDeliveriesQuery(
  filters: QueryDeliveriesDto,
  clientDocument?: string,
): SqlQuery {
  const optionalFilters = buildOptionalFilters(filters, 1, clientDocument);
  const pagination = getPagination(filters);
  const limitIndex = optionalFilters.values.length + 1;
  const offsetIndex = limitIndex + 1;

  return {
    text: `
      ${getBaseSelect()}

      select
        cgc_pag,
        cgc_emit,
        nome_cli_emit,
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
        uf_dest,
        cidade_dest,
        data_prev_ent asc nulls last,
        nro_ctrc desc
      limit $${limitIndex}::int
      offset $${offsetIndex}::int;
    `,
    values: [...optionalFilters.values, pagination.limit, pagination.offset],
  };
}

export function buildDeliveriesSummaryQuery(
  filters: QueryDeliveriesDto,
  clientDocument?: string,
): SqlQuery {
  const optionalFilters = buildOptionalFilters(filters, 1, clientDocument);

  return {
    text: `
      ${getBaseSelect()}

      select
        count(*)::int as "totalPedidos",

        count(*) filter (
          where status_entrega = 'Entregue'
        )::int as entregues,

        count(*) filter (
          where status_entrega = 'Pendente'
        )::int as pendentes,

        count(*) filter (
          where status_entrega = 'Em atraso'
        )::int as "emAtraso",

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
              count(*) filter (
                where status_entrega = 'Entregue'
              )::numeric / count(*)::numeric
            ) * 100,
            2
          )
        end as "porcentagemEntrega"

      from entregas_base
      ${optionalFilters.text};
    `,
    values: optionalFilters.values,
  };
}

export function buildDeliveryCitiesQuery(
  filters: QueryDeliveriesDto,
): SqlQuery {
  const optionalFilters = buildOptionalFilters(filters, 1, undefined, {
    includeCity: false,
  });

  return {
    text: `
      ${getBaseSelect()}

      select distinct
        cidade_dest,
        uf_dest
      from entregas_base
      ${optionalFilters.text}
        ${optionalFilters.text ? 'and' : 'where'} cidade_dest is not null
      order by uf_dest, cidade_dest;
    `,
    values: optionalFilters.values,
  };
}

export function buildDeliveryRegionsQuery(
  filters: QueryDeliveriesDto,
): SqlQuery {
  const optionalFilters = buildOptionalFilters(filters, 1, undefined, {
    includeUf: false,
  });

  return {
    text: `
      ${getBaseSelect()}

      select distinct
        uf_dest,
        classificacao_rota
      from entregas_base
      ${optionalFilters.text}
        ${optionalFilters.text ? 'and' : 'where'} uf_dest is not null
      order by uf_dest, classificacao_rota;
    `,
    values: optionalFilters.values,
  };
}

export function buildDeliveryPayersQuery(
  filters: QueryDeliveriesDto,
): SqlQuery {
  const optionalFilters = buildOptionalFilters(filters, 1, undefined, {
    includeCnpjPagador: false,
    includeDefaultDateRange: false,
  });

  return {
    text: `
      ${getBaseSelect()}

      select distinct
        cgc_pag
      from entregas_base
      ${optionalFilters.text}
        ${optionalFilters.text ? 'and' : 'where'} cgc_pag is not null
        and trim(cgc_pag::text) <> ''
      order by cgc_pag;
    `,
    values: optionalFilters.values,
  };
}

export function buildDeliveryOccurrencesQuery(
  filters: QueryDeliveriesDto,
): SqlQuery {
  const optionalFilters = buildOptionalFilters(filters, 1, undefined, {
    includeOcorrencia: false,
  });

  return {
    text: `
      ${getBaseSelect()}

      select distinct
        ult_ocor,
        ocorrencia
      from entregas_base
      ${optionalFilters.text}
        ${optionalFilters.text ? 'and' : 'where'} (
          ult_ocor is not null
          or trim(ocorrencia) <> ''
        )
      order by ocorrencia, ult_ocor;
    `,
    values: optionalFilters.values,
  };
}
