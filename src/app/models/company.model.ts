// src/app/models/company.model.ts

export interface Company {
  id: number;
  nome: string;
  cnpj: string;
  created_at: string;
  updated_at: string;
  validade_cert?: string | null;
  id_dominio?: number | null;
}

export interface CompanyCreate {
  nome: string;
  cnpj: string;
  pfx_base64: string;
  password: string;
  id_dominio?: number;
}

export interface CompanyUpdate {
  nome?: string;
  pfx_base64?: string;
  password?: string;
  id_dominio?: number;
}
