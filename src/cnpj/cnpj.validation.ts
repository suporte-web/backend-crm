/** Os formulários atuais do CRM trabalham com CNPJ numérico. */
export function normalizarCnpj(value: string): string {
  return typeof value === 'string' ? value.replace(/[.\/\-\s]/g, '') : '';
}
export function cnpjValido(value: string): boolean {
  const cnpj = normalizarCnpj(value);
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digit = (length: number) => {
    let weight = length - 7;
    let sum = 0;
    for (const char of cnpj.slice(0, length)) {
      sum += Number(char) * weight--;
      if (weight < 2) weight = 9;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}
