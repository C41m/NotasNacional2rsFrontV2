// src/app/models/download.model.ts

export type DownloadType = 'xml' | 'pdf' | 'both';

export interface BatchRequest {
  company_ids: number[];
  /** O ADN retorna tudo — datainicio/datafim não são mais enviados pelo frontend. */
  datainicio?: string | null;
  datafim?: string | null;
  download_type?: DownloadType;
  force_update?: boolean;
}

export interface CompanyProgress {
  status: string;
  notas_done: number;
  notas_total: number;
  notas_salvas: number;
  valorServico: number;
  valorIss: number;
  notasPrestadas: number;
  notasTomadas: number;
  notasCanceladas: number;
  valorPrestado: number;
  valorTomado: number;
  valorCancelado: number;
  carregando_notas: boolean;
  cnpj: string;
  nome: string;
  empresa_id?: number;
  mensagem?: string;
}

export interface BatchStatus {
  total: number;
  done: number;
  status: string;
  zip_path?: string;
  error?: string;
  companies?: { [companyId: string]: CompanyProgress };
}
