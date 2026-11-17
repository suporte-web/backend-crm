import { CnpjData, CnpjProvider } from './cnpj.types';
import { normalizarCnpj } from './cnpj.validation';

export const providerUrls: Record<CnpjProvider, string> = {
  minhareceita: 'https://minhareceita.org/',
  opencnpj: 'https://kitana.opencnpj.com/cnpj/',
  brasilapi: 'https://brasilapi.com.br/api/cnpj/v1/',
};
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string => typeof value === 'string' ? value.trim().slice(0, 500) :
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

/** Não retorna QSA ou o payload bruto. Uma identidade diferente nunca é aceita. */
export function normalizarResposta(provider: CnpjProvider, raw: unknown, requested: string): CnpjData {
  const envelope = record(raw);
  if (provider === 'opencnpj' && envelope.success !== true) throw new Error('invalid_response');
  const data = provider === 'opencnpj' ? record(envelope.data) : envelope;
  if (normalizarCnpj(text(data.cnpj)) !== requested) throw new Error('cnpj_mismatch');
  const open = provider === 'opencnpj';
  const legalName = text(open ? data.razaoSocial : data.razao_social);
  if (!legalName) throw new Error('invalid_response');
  const firstCnae = record(Array.isArray(data.cnaes) ? data.cnaes[0] : null);
  const simples = open ? data.opcaoSimples : data.opcao_pelo_simples;
  return {
    cnpj: requested, legalName, provider,
    tradeName: text(open ? data.nomeFantasia : data.nome_fantasia),
    cnae: text(open ? firstCnae.cnae : data.cnae_fiscal),
    cnaeDescription: text(open ? firstCnae.descricao : data.cnae_fiscal_descricao),
    phone: text(open ? data.telefone : data.ddd_telefone_1) || text(data.ddd_telefone_2),
    email: text(data.email),
    status: text(open ? data.situacaoCadastral : data.descricao_situacao_cadastral),
    simpleNational: simples === true || simples === 'S' ? true : simples === false || simples === 'N' ? false : null,
    address: {
      zipCode: text(data.cep), street: [open ? '' : text(data.descricao_tipo_de_logradouro) || text(data.descricao_tipo_logradouro), text(data.logradouro)].filter(Boolean).join(' '),
      number: text(data.numero), complement: text(data.complemento), neighborhood: text(data.bairro),
      city: text(data.municipio), state: text(data.uf),
    },
  };
}
