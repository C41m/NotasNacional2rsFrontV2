// src/app/models/nota.model.ts
//
// Contrato espelhado de backend/app/schemas/nfse_detail.py (Notas/Dashboard).

export interface NotaResumo {
  id: number;
  documento_fiscal_id: number;
  empresa_id: number;
  empresa_nome?: string | null;
  empresa_cnpj?: string | null;
  competencia?: string | null;
  data_emissao?: string | null;
  numero_nfse?: string | null;
  chave_acesso?: string | null;
  role?: string | null;
  tipo_documento_api?: string | null;
  tipo_evento?: string | null;
  situacao?: string | null;
  cnpj_prestador?: string | null;
  razao_social_prestador?: string | null;
  cnpj_tomador?: string | null;
  razao_social_tomador?: string | null;
  codigo_servico?: string | null;
  descricao_servico?: string | null;
  valor_servico?: number | null;
  valor_liquido?: number | null;
  base_calculo_iss?: number | null;
  aliquota_iss?: number | null;
  valor_iss?: number | null;
  iss_retido?: string | null;
  valor_iss_retido?: number | null;
  valor_total?: number | null;
  ativo: boolean;
  atualizado_em?: string | null;
}

export interface NotaDetalhe {
  id: number;
  documento_fiscal_id: number;
  numero_nfse?: string | null;
  data_emissao?: string | null;
  competencia?: string | null;
  municipio_emissor_descricao?: string | null;
  local_prestacao?: string | null;
  local_incidencia_descricao?: string | null;
  versao_aplicacao?: string | null;
  codigo_status?: string | null;
  data_processamento?: string | null;
  cnpj_prestador?: string | null;
  cpf_prestador?: string | null;
  razao_social_prestador?: string | null;
  inscricao_municipal_prestador?: string | null;
  prest_logradouro?: string | null;
  prest_numero?: string | null;
  prest_bairro?: string | null;
  prest_uf?: string | null;
  prest_cep?: string | null;
  prest_telefone?: string | null;
  prest_email?: string | null;
  cnpj_tomador?: string | null;
  cpf_tomador?: string | null;
  razao_social_tomador?: string | null;
  inscricao_municipal_tomador?: string | null;
  codigo_servico?: string | null;
  descricao_servico?: string | null;
  informacoes_complementares?: string | null;
  numero_pedido?: string | null;
  valor_servico?: number | null;
  valor_recebido?: number | null;
  valor_desconto_condicionado?: number | null;
  valor_desconto_incondicionado?: number | null;
  valor_liquido?: number | null;
  base_calculo_iss?: number | null;
  aliquota_iss?: number | null;
  valor_iss?: number | null;
  iss_retido?: string | null;
  valor_iss_retido?: number | null;
  base_calculo_valor?: number | null;
  aliquota_aplicada?: number | null;
  valor_total_retencoes?: number | null;
  valor_liquido_calculado?: number | null;
  valor_retido_cp?: number | null;
  valor_retido_irrf?: number | null;
  valor_retido_csll?: number | null;
  valor_retido_pis?: number | null;
  valor_retido_cofins?: number | null;
  chave_acesso?: string | null;
  chave_nfe_referenciada?: string | null;
  tipo_evento?: string | null;
  descricao_evento?: string | null;
  data_evento?: string | null;
  nsu?: number | null;
  tipo_documento_api?: string | null;
  role?: string | null;
  arquivo_fonte?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
  empresa_id?: number | null;
  empresa_nome?: string | null;
  empresa_cnpj?: string | null;
  situacao?: string | null;
  valor_total?: number | null;
  tem_xml: boolean;
}

export interface NotasDashboardResumo {
  total_notas: number;
  total_valor_servico: number;
  total_iss: number;
  total_iss_retido: number;
  notas_prestadas: number;
  notas_tomadas: number;
  notas_outras: number;
  notas_canceladas: number;
  empresas_com_notas: number;
  notas_sem_competencia: number;
  notas_sem_xml: number;
  ultima_sincronizacao?: string | null;
  notas_novas_desde_ontem?: number;
  saude_conferencia?: 'ok' | 'atencao';
}

export interface NotasSerieItem {
  competencia?: string | null;
  total_notas: number;
  notas_prestadas: number;
  notas_tomadas: number;
  valor_servico: number;
  valor_iss: number;
}

export interface NotasEmpresaRanking {
  empresa_id: number;
  nome?: string | null;
  cnpj?: string | null;
  total_notas: number;
  notas_prestadas: number;
  notas_tomadas: number;
  valor_servico: number;
  valor_iss: number;
}

export interface NotaFiltros {
  empresa_id?: number | null;
  competencia_inicio?: string | null;
  competencia_fim?: string | null;
  role?: string | null;
  tipo_evento?: string | null;
  situacao?: string | null;
  iss_retido?: string | null;
  search?: string | null;
  valor_min?: number | null;
  valor_max?: number | null;
}

export const NOTA_ROLE_LABELS: Record<string, string> = {
  prestado: 'Prestada',
  tomado: 'Tomada',
  intermediario: 'Intermediária'
};

export function notaRoleLabel(role?: string | null): string {
  if (!role) return '—';
  return NOTA_ROLE_LABELS[role.toLowerCase()] ?? role;
}
