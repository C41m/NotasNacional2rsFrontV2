// src/app/models/auditoria.model.ts
//
// Contrato espelhado de backend/app/schemas/auditoria.py.
// Os valores de enum vêm do Postgres e NÃO têm acento:
//   StatusGeral     → CONFORME | ATENCAO | CRITICO
//   Gravidade       → BAIXA | MEDIA | ALTA   (o frontend antigo usava "MÉDIA" — bug)
//   StatusPendencia → FALTANTE | INCONSISTENTE (o antigo usava "FALTANDO" — bug)

export type StatusGeral = 'CONFORME' | 'ATENCAO' | 'CRITICO';
export type Gravidade = 'BAIXA' | 'MEDIA' | 'ALTA';
export type StatusPendencia = 'FALTANTE' | 'INCONSISTENTE';

export const STATUS_GERAL_LABELS: Record<StatusGeral, string> = {
  CONFORME: 'Conforme',
  ATENCAO: 'Atenção',
  CRITICO: 'Crítico'
};

export const GRAVIDADE_LABELS: Record<Gravidade, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta'
};

export const STATUS_PENDENCIA_LABELS: Record<StatusPendencia, string> = {
  FALTANTE: 'Faltante',
  INCONSISTENTE: 'Inconsistente'
};

/** AuditoriaPendenciaOut — linha de auditoria_pendencias. */
export interface AuditoriaPendencia {
  id: number;
  auditoria_id: number;
  /** varchar livre no banco (o enum TipDocumento tem 7 valores, mas há 'DAP' gravado). */
  tipo_documento: string;
  gravidade: Gravidade;
  status: StatusPendencia;
  observacao?: string | null;
  crf?: number | null;
  crt?: string | null;
  base_calculo?: number | null;
  receita_declarada?: number | null;
}

/** AuditoriaOut — resposta de GET /auditoria/empresa/{cnpj}?periodo=YYYY-MM. */
export interface Auditoria {
  id: number;
  cnpj: string;
  razao_social: string;
  periodo: string;
  status_geral: StatusGeral;
  conformidade_pct: number;
  observacao_geral?: string | null;
  documentos_esperados: number;
  documentos_encontrados: number;
  fator_r?: number | null;
  aliquota_efetiva?: number | null;
  receita_pa?: number | null;
  rbt12?: number | null;
  folha_12m?: number | null;
  pro_labore?: number | null;
  inss?: number | null;
  irrf?: number | null;
  fgts?: number | null;
  num_funcionarios?: number | null;
  media_mensal_folha?: number | null;
  classificacao_anexo?: string | null;
  analise_completa?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  pendencias: AuditoriaPendencia[];
}

/** Item da lista em GET /auditoria/visao-geral?periodo=YYYY-MM. */
export interface AuditoriaEmpresaResumo {
  id: number;
  cnpj: string;
  razao_social: string;
  periodo: string;
  status_geral: StatusGeral;
  conformidade_pct: number;
  fator_r?: number | null;
  aliquota_efetiva?: number | null;
  classificacao_anexo?: string | null;
  /** Contagem de pendências com gravidade = ALTA (calculada no router). */
  pendencias_criticas_count: number;
}

/** `/visao-geral` responde `dict` — os KPIs são estes quatro. */
export interface AuditoriaKPIs {
  total_empresas: number;
  conformes: number;
  criticas: number;
  total_documentos_faltantes: number;
}

export interface AuditoriaVisaoGeral {
  kpis: AuditoriaKPIs;
  empresas: AuditoriaEmpresaResumo[];
}
