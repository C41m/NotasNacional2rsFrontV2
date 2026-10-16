// src/app/shared/format.ts

/**
 * Formatadores compartilhados — antes duplicados como métodos em cada componente.
 * Funções puras: fáceis de testar e reutilizar.
 */

/** CNPJ para o formato 00.000.000/0000-00 (aceita dígitos ou já formatado). */
export function formatCnpj(value: string | null | undefined): string {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 14);
  if (digits.length !== 14) return value;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/** Data ISO → dd/mm/aaaa. Retorna '' para valores ausentes/inválidos. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Data ISO → dd/mm/aaaa hh:mm. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${formatDate(value)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Número → moeda pt-BR. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Percentual com 1 casa decimal. */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}%`;
}

/** Período da API em YYYY-MM → MM/AAAA para exibição. */
export function formatPeriodo(periodo: string | null | undefined): string {
  if (!periodo) return '';
  if (periodo.length !== 7) return periodo;
  const [yyyy, mm] = periodo.split('-');
  return `${mm}/${yyyy}`;
}

/** MM/AAAA (input do usuário) → YYYY-MM (formato da API). */
export function toApiPeriodo(periodo: string | null | undefined): string {
  if (!periodo || periodo.length !== 7) return '';
  const [mm, yyyy] = periodo.split('/');
  return `${yyyy}-${mm}`;
}

/** Máscara progressiva de MM/AAAA enquanto o usuário digita. */
export function maskPeriodoInput(raw: string): string {
  let value = raw.replace(/\D/g, '');
  if (value.length >= 2) {
    value = value.substring(0, 2) + '/' + value.substring(2, 6);
  }
  return value.substring(0, 7);
}

/** Valida dígitos de CNPJ (14) e dígitos verificadores. */
export function isValidCnpj(value: string | null | undefined): boolean {
  if (!value) return false;
  const cnpj = String(value).replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // repetição total

  const calc = (length: number): number => {
    let sum = 0;
    let pos = length - 7;
    for (let i = 0; i < length; i++) {
      sum += Number(cnpj[i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };

  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

/**
 * Mês por extenso abreviado a partir de YYYY-MM.
 * O eixo temporal da auditoria é sempre um mês de competência, então o mês
 * por extenso carrega mais informação que "08/2026" — e evita o padrão
 * "rótulo numérico repetido" em toda tabela.
 */
const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez'
] as const;

export function formatMesAno(periodo: string | null | undefined): string {
  if (!periodo || periodo.length !== 7) return periodo ?? '';
  const [yyyy, mm] = periodo.split('-');
  const idx = Number(mm) - 1;
  if (idx < 0 || idx > 11) return periodo;
  return `${MESES[idx]}/${yyyy}`;
}

/** Número compacto pt-BR: 1.2 mi, 340 mil. Usado nos eixos dos gráficos. */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/** Percentual sem o símbolo % — para usar dentro de um arco onde ele já aparece. */
export function formatPercentValue(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}
