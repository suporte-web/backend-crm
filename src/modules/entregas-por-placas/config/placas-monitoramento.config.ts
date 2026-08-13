export type PlacaMonitoramentoTipo = 'FROTA' | 'AGREGADO';

export type PlacaMonitoramentoConfig = {
  tipo: PlacaMonitoramentoTipo;
  frota: string | null;
  placa: string;
};

export type GrupoPlacaMonitoramento = {
  canonical: string;
  aliases: string[];
};

export const PLACAS_MONITORAMENTO: PlacaMonitoramentoConfig[] = [
  { tipo: 'FROTA', frota: '2005', placa: 'BEQ9I40' },
  { tipo: 'FROTA', frota: '2006', placa: 'BEQ9I41' },
  { tipo: 'FROTA', frota: '2007', placa: 'BER9I62' },
  { tipo: 'FROTA', frota: '1006', placa: 'BEU2C23' },
  { tipo: 'FROTA', frota: '3003', placa: 'END4333' },
  { tipo: 'FROTA', frota: null, placa: 'DTU7B50' },
  { tipo: 'AGREGADO', frota: null, placa: 'GGL2I11' },
  { tipo: 'AGREGADO', frota: null, placa: 'TLL7G81' },
  { tipo: 'AGREGADO', frota: null, placa: 'FHB7723' },
  { tipo: 'AGREGADO', frota: null, placa: 'DJB6C13' },
  { tipo: 'AGREGADO', frota: null, placa: 'FDV5489' },
  { tipo: 'AGREGADO', frota: null, placa: 'GFG9E85' },
  { tipo: 'AGREGADO', frota: null, placa: 'MTX0F27' },
  { tipo: 'AGREGADO', frota: null, placa: 'GAE8D28' },
  { tipo: 'AGREGADO', frota: null, placa: 'FMV2F48' },
  { tipo: 'AGREGADO', frota: null, placa: 'FRZ8329' },
  { tipo: 'AGREGADO', frota: null, placa: 'GJT5A50' },
  { tipo: 'AGREGADO', frota: null, placa: 'EVO3409' },
];

export const GRUPOS_PLACAS_MONITORAMENTO: GrupoPlacaMonitoramento[] =
  PLACAS_MONITORAMENTO.map((placa) => {
    if (placa.placa === 'FDV5489') {
      return {
        canonical: 'FVD5489',
        aliases: ['FVD5489', 'FDV5489'],
      };
    }

    if (placa.placa === 'END4333') {
      return {
        canonical: 'END4D33',
        aliases: ['END4D33', 'END4333'],
      };
    }

    return {
      canonical: placa.placa,
      aliases: [placa.placa],
    };
  });

export function normalizarPlacaMonitoramento(placa: string | null | undefined) {
  return String(placa ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function listarAliasesPlacasMonitoramento() {
  return Array.from(
    new Set(
      GRUPOS_PLACAS_MONITORAMENTO.flatMap((grupo) =>
        grupo.aliases.map(normalizarPlacaMonitoramento),
      ),
    ),
  );
}

export function obterPlacaCanonicalMonitoramento(
  placa: string | null | undefined,
) {
  const placaNormalizada = normalizarPlacaMonitoramento(placa);

  for (const grupo of GRUPOS_PLACAS_MONITORAMENTO) {
    const aliases = grupo.aliases.map(normalizarPlacaMonitoramento);

    if (aliases.includes(placaNormalizada)) {
      return normalizarPlacaMonitoramento(grupo.canonical);
    }
  }

  return null;
}

export function isPlacaMonitorada(placa: string | null | undefined) {
  return obterPlacaCanonicalMonitoramento(placa) !== null;
}
