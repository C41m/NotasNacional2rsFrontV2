// src/app/models/download.model.ts

export type DownloadType = 'xml' | 'pdf' | 'both';

export interface BatchRequest {
  company_ids: number[];
  /** O ADN retorna tudo — datainicio/datafim não são mais enviados pelo frontend. */
  datainicio?: string | null;
  datafim?: string | null;
  download_type?: DownloadType;
}

export interface CompanyProgress {
  status: string;
  notas_done: number;
  notas_total: number;
  cnpj: string;
  nome: string;
}

export interface BatchStatus {
  total: number;
  done: number;
  status: string;
  zip_path?: string;
  error?: string;
  companies?: { [companyId: string]: CompanyProgress };
}
