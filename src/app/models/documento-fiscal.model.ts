// src/app/models/documento-fiscal.model.ts
//
// Contrato espelhado de backend/app/schemas/documento_fiscal.py
// (Pydantic) — NÃO o model do frontend antigo, que estava dessincronizado.

/** Enum TipoDocumento do backend (valores em minúsculo com underscore). */
export type TipoDocumento =
  | 'pgdas_d'
  | 'iss'
  | 'das'
  | 'folha_pagamento'
  | 'defis'
  | 'dirf'
  | 'efd_reinf';

/** Rótulos exibidos — o backend nunca devolve o texto, só a chave. */
export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  pgdas_d: 'PGDAS-D',
  iss: 'ISS',
  das: 'DAS',
  folha_pagamento: 'Folha de Pagamento',
  defis: 'DEFIS',
  dirf: 'DIRF',
  efd_reinf: 'EFD-REINF'
};

export const TIPO_DOCUMENTO_OPTIONS = (
  Object.entries(TIPO_DOCUMENTO_LABELS) as [TipoDocumento, string][]
).map(([value, label]) => ({ value, label }));

/** DocumentoFiscalResumoOut — item da listagem paginada. */
export interface DocumentoFiscalResumo {
  id: number;
  empresa_id: number;
  tipo_documento: TipoDocumento;
  periodo: string;
  ano_calendario?: number | null;
  data_emissao?: string | null;
  data_vencimento?: string | null;
  numero_documento?: string | null;
  situacao?: string | null;
  valor_total?: number | null;
  ativo: boolean;
}

/** DocumentoFiscalOut — documento completo (detalhe). */
export interface DocumentoFiscal extends DocumentoFiscalResumo {
  serie?: string | null;
  chave_acesso?: string | null;
  data_pagamento?: string | null;
  observacao?: string | null;
  arquivo_fonte?: string | null;
  data_extracao?: string | null;
}

/** DocumentoFiscalBase — corpo de criação. `empresa_id` e `tipo_documento` obrigatórios. */
export interface DocumentoFiscalCreate {
  empresa_id: number;
  tipo_documento: TipoDocumento;
  periodo: string; // YYYY-MM
  ano_calendario?: number | null;
  data_emissao?: string | null;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  numero_documento?: string | null;
  serie?: string | null;
  chave_acesso?: string | null;
  situacao?: string | null;
  valor_total?: number | null;
  observacao?: string | null;
  arquivo_fonte?: string | null;
  ativo?: boolean;
}

/**
 * Filtros aceitos por GET /documentos-fiscais.
 * Os nomes seguem EXATAMENTE os Query params do backend.
 */
export interface DocumentoFiscalFiltros {
  empresa_id?: number | null;
  tipo_documento?: TipoDocumento | null;
  periodo?: string | null;
  ano_calendario?: number | null;
  situacao?: string | null;
  /** O backend filtra por padrão `ativo=true`; envie `null` para ver todos. */
  ativo?: boolean | null;
  data_emissao_inicio?: string | null;
  data_emissao_fim?: string | null;
}

/** PaginatedResponse[T] de backend/app/schemas/common.py. */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
