export const CNPJ_HTTP = Symbol('CNPJ_HTTP');
export const CNPJ_PROVIDERS = ['minhareceita', 'opencnpj', 'brasilapi'] as const;
export type CnpjProvider = (typeof CNPJ_PROVIDERS)[number];
export interface CnpjData {
  cnpj: string;
  legalName: string;
  tradeName: string;
  cnae: string;
  cnaeDescription: string;
  phone: string;
  email: string;
  status: string;
  simpleNational: boolean | null;
  address: { zipCode: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };
  provider: CnpjProvider;
}
export interface CnpjHttpResponse { status: number; data: unknown; headers: Record<string, unknown> }
export type CnpjHttp = (url: string, timeoutMs: number) => Promise<CnpjHttpResponse>;
