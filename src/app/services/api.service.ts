// src/app/services/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Company, CompanyCreate, CompanyUpdate } from '../models/company.model';
import { BatchRequest, BatchStatus, DownloadType } from '../models/download.model';
import { Auditoria, AuditoriaVisaoGeral } from '../models/auditoria.model';
import {
  DocumentoFiscal,
  DocumentoFiscalCreate,
  DocumentoFiscalFiltros,
  DocumentoFiscalResumo,
  PaginatedResponse,
  TipoDocumento
} from '../models/documento-fiscal.model';
import { environment } from '../../environments/environment';

/**
 * Chave validada pelo backend via `Depends(verify_api_key)` (Header X-API-Key).
 * Ausente => FastAPI responde 422 (não 401), porque o Header(...) é obrigatório.
 */
const API_KEY = '12345678';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private baseUrl: string;

  constructor() {
    this.baseUrl = environment.apiUrl;

    // Runtime config sobrescreve apenas se for URL absoluta (deploy Vercel/VPS).
    const runtimeConfig = (window as unknown as { __APP_CONFIG__?: { apiUrl?: string } })
      .__APP_CONFIG__;
    if (runtimeConfig?.apiUrl && runtimeConfig.apiUrl.startsWith('http')) {
      this.baseUrl = runtimeConfig.apiUrl;
    }
  }

  /**
   * Cabeçalhos de autenticação.
   * O interceptor (error.interceptor) injeta X-API-Key automaticamente em toda
   * requisição; este helper permanece para deixar explícito nos endpoints de
   * auditoria/documentos, que exigem o header por contrato do backend.
   */
  private authHeaders(): Record<string, string> {
    return { 'X-API-Key': API_KEY };
  }

  /** Monta HttpParams ignorando valores vazios/undefined. */
  private params(
    source: Record<string, string | number | boolean | undefined | null>
  ): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null || value === '') continue;
      params = params.set(key, String(value));
    }
    return params;
  }

  // ==================== Companies ====================

  listCompanies(page = 1, limit = 20, search = ''): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.baseUrl}/companies`, {
      params: this.params({ page, limit, search: search.trim() || undefined })
    });
  }

  getCompany(id: string | number): Observable<Company> {
    return this.http.get<Company>(`${this.baseUrl}/companies/${id}`);
  }

  createCompany(company: CompanyCreate): Observable<Company> {
    return this.http.post<Company>(`${this.baseUrl}/companies`, company);
  }

  updateCompany(id: string | number, company: CompanyUpdate): Observable<Company> {
    return this.http.patch<Company>(`${this.baseUrl}/companies/${id}`, company);
  }

  deleteCompany(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/companies/${id}`);
  }

  // ==================== NFSe Batch Download ====================

  startBatchDownload(request: {
    company_ids: number[];
    /** Não são mais enviados — o ADN retorna o histórico completo. */
    datainicio?: string | null;
    datafim?: string | null;
    download_type?: DownloadType;
  }): Observable<{ batch_id: string; status: string }> {
    return this.http.post<{ batch_id: string; status: string }>(
      `${this.baseUrl}/nfse/batch-download`,
      request
    );
  }

  getBatchStatus(batchId: string): Observable<BatchStatus> {
    return this.http.get<BatchStatus>(`${this.baseUrl}/nfse/batch-download/${batchId}`);
  }

  cancelBatch(batchId: string): Observable<unknown> {
    return this.http.patch<unknown>(`${this.baseUrl}/nfse/batch-download/${batchId}/cancel`, {});
  }

  listActiveBatches(): Observable<Record<string, Record<string, unknown>>> {
    return this.http.get<Record<string, Record<string, unknown>>>(
      `${this.baseUrl}/nfse/batch-download/active`
    );
  }

  downloadBatchFile(batchId: string): void {
    const url = `${this.baseUrl}/nfse/batch-download/${batchId}/file`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ==================== Documentos Fiscais ====================
  //
  // Contrato: backend/app/api/routers/documentos.py
  //  - Listagem é paginada no servidor: { items, total, page, page_size, total_pages }
  //  - A rota é /documentos/, NÃO /documentos-fiscais (404 no backend)
  //  - Filtros usam `tipo_documento` e `page_size` (NÃO `tipo`/`limit`)
  //  - NÃO existe PATCH: só POST, GET, DELETE. Editar = criar + excluir.

  listDocumentosFiscais(
    filtros: DocumentoFiscalFiltros,
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResponse<DocumentoFiscalResumo>> {
    return this.http.get<PaginatedResponse<DocumentoFiscalResumo>>(
      `${this.baseUrl}/documentos/`,
      { params: this.params({ ...filtros, page, page_size: pageSize }) }
    );
  }

  listTiposDocumento(): Observable<TipoDocumento[]> {
    return this.http.get<TipoDocumento[]>(`${this.baseUrl}/documentos/tipos/`, {
      headers: this.authHeaders()
    });
  }

  getDocumentoFiscal(id: string | number): Observable<DocumentoFiscal> {
    return this.http.get<DocumentoFiscal>(`${this.baseUrl}/documentos/${id}`, {
      headers: this.authHeaders()
    });
  }

  createDocumentoFiscal(doc: DocumentoFiscalCreate): Observable<DocumentoFiscal> {
    return this.http.post<DocumentoFiscal>(`${this.baseUrl}/documentos/`, doc, {
      headers: this.authHeaders()
    });
  }

  /** DELETE devolve 204 — o corpo é vazio, por isso `unknown`. */
  deleteDocumentoFiscal(id: string | number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.baseUrl}/documentos/${id}`, {
      headers: this.authHeaders()
    });
  }

  // ==================== Auditoria ====================

  getVisaoGeral(periodo: string): Observable<AuditoriaVisaoGeral> {
    return this.http.get<AuditoriaVisaoGeral>(`${this.baseUrl}/auditoria/visao-geral`, {
      params: this.params({ periodo }),
      headers: this.authHeaders()
    });
  }

  getAuditoriaEmpresa(cnpj: string, periodo: string): Observable<Auditoria> {
    // O CNPJ vai no path e pode conter `/` quando vem mascarado — envia só dígitos.
    const digits = cnpj.replace(/\D/g, '');
    return this.http.get<Auditoria>(`${this.baseUrl}/auditoria/empresa/${digits}`, {
      params: this.params({ periodo }),
      headers: this.authHeaders()
    });
  }

  getPeriodos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/auditoria/periodos`, {
      headers: this.authHeaders()
    });
  }

  getDashboardKPIs(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/auditoria/dashboard`, {
      headers: this.authHeaders()
    });
  }

  getRankingFatorR(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/auditoria/dashboard/fator-r`, {
      headers: this.authHeaders()
    });
  }
}
