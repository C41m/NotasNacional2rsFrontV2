// src/app/components/documentos-fiscais/documentos-fiscais.component.ts
//
// Documentos fiscais — listagem paginada no servidor.
//
// O backend pagina: { items, total, page, page_size, total_pages }.
// A tabela usa [lazy]="true" para que cada mudança de página/discorte
// dispare um (onLazyLoad) e uma requisição nova, em vez de filtrar um
// array já carregado (que traria só a página atual).
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import {
  DocumentoFiscal,
  DocumentoFiscalFiltros,
  DocumentoFiscalResumo,
  TIPO_DOCUMENTO_LABELS,
  TIPO_DOCUMENTO_OPTIONS,
  TipoDocumento
} from '../../models/documento-fiscal.model';
import { formatCnpj, formatDate, formatMesAno } from '../../shared/format';

interface LazyEvent {
  first?: number;
  rows?: number;
  sortField?: string | null | ((a: unknown, b: unknown) => number);
  sortOrder?: number | null;
}

@Component({
  selector: 'app-documentos-fiscais',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    SkeletonModule,
    SelectModule,
    ToggleButtonModule,
    InputTextModule,
    TooltipModule,
    DialogModule,
    MessageModule,
    ConfirmDialogModule
  ],
  templateUrl: './documentos-fiscais.component.html'
})
export class DocumentosFiscaisComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmationService);

  // ── Dados ───────────────────────────────────────────────────────
  readonly docs = signal<DocumentoFiscalResumo[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  // ── Paginação (do servidor) ─────────────────────────────────────
  readonly first = signal(0);
  readonly rows = signal(20);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  // ── Filtros ─────────────────────────────────────────────────────
  readonly tipo = signal<TipoDocumento | null>(null);
  readonly situacao = signal<string | null>(null);
  readonly periodo = signal<string>(''); // YYYY-MM
  readonly empresaId = signal<number | null>(null);
  readonly somenteAtivos = signal(true);

  readonly empresas = signal<{ id: number; nome: string; cnpj: string }[]>([]);
  readonly situacoes = signal<string[]>([]);

  // ── Detalhe ─────────────────────────────────────────────────────
  readonly selected = signal<DocumentoFiscal | null>(null);
  readonly detailVisible = signal(false);
  readonly detailLoading = signal(false);
  readonly deletingId = signal<number | null>(null);

  readonly typeOptions = TIPO_DOCUMENTO_OPTIONS;
  readonly typeLabels = TIPO_DOCUMENTO_LABELS;

  readonly formatDate = formatDate;
  readonly formatMesAno = formatMesAno;

  readonly page = computed(() => Math.floor(this.first() / this.rows()) + 1);

  /** Resumo do filtro atual — mostrado como chip para o usuário ver o que está aplicado. */
  readonly filtrosAtivos = computed(() => {
    const out: { label: string; value: string }[] = [];
    if (this.tipo()) {
      out.push({ label: 'Tipo', value: this.typeLabels[this.tipo()!] });
    }
    if (this.periodo()) {
      out.push({ label: 'Competência', value: formatMesAno(this.periodo()) });
    }
    if (this.empresaId()) {
      const emp = this.empresas().find(e => e.id === this.empresaId());
      out.push({ label: 'Empresa', value: emp ? emp.nome : `#${this.empresaId()}` });
    }
    if (this.situacao()) {
      out.push({ label: 'Situação', value: this.situacao()! });
    }
    if (!this.somenteAtivos()) {
      out.push({ label: 'Exibir', value: 'inclui inativos' });
    }
    return out;
  });

  readonly temFiltro = computed(() => this.filtrosAtivos().length > 0);

  ngOnInit(): void {
    this.load();
    this.loadEmpresas();
  }

  // ── Carga ───────────────────────────────────────────────────────

  load(): void {
    this.loading.set(true);
    this.error.set('');

    const filtros: DocumentoFiscalFiltros = {
      empresa_id: this.empresaId(),
      tipo_documento: this.tipo(),
      periodo: this.periodo() || null,
      situacao: this.situacao(),
      // `null` = todos; `true` = só ativos (comportamento padrão do backend).
      ativo: this.somenteAtivos() ? true : null
    };

    this.api
      .listDocumentosFiscais(filtros, this.page(), this.rows())
      .subscribe({
        next: res => {
          this.docs.set(res.items ?? []);
          this.total.set(res.total ?? 0);
          this.totalPages.set(res.total_pages ?? 0);
          this.loading.set(false);
        },
        error: err => {
          this.error.set(err.message || 'Erro ao carregar documentos fiscais.');
          this.docs.set([]);
          this.loading.set(false);
        }
      });
  }

  loadEmpresas(): void {
    this.api.listCompanies(1, 200, '').subscribe({
      next: list => this.empresas.set(list ?? []),
      error: () => this.empresas.set([])
    });
  }

  // ── Eventos da tabela ───────────────────────────────────────────

  /**
   * p-table [lazy] dispara este evento a cada mudança de página, ordenação
   * ou tamanho. Uma requisição por evento — o backend pagina.
   * O template entrega `Event`; o cast fica na borda da biblioteca.
   */
  onLazyLoad(event: unknown): void {
    const e = event as LazyEvent;
    const first = e.first ?? 0;
    const rows = e.rows ?? 20;
    if (first === this.first() && rows === this.rows()) return; // evita loop
    this.first.set(first);
    this.rows.set(rows);
    this.load();
  }

  onSort(event: unknown): void {
    if ((event as LazyEvent).sortOrder === 0) {
      // Ordenação removida — recarrega a página atual.
      this.load();
    }
  }

  onPage(event: unknown): void {
    this.onLazyLoad(event);
  }

  onRowsChange(event: unknown): void {
    this.onLazyLoad(event);
  }

  // ── Filtros ─────────────────────────────────────────────────────

  applyFilters(): void {
    this.first.set(0);
    this.load();
  }

  clearFilters(): void {
    this.tipo.set(null);
    this.situacao.set(null);
    this.periodo.set('');
    this.empresaId.set(null);
    this.somenteAtivos.set(true);
    this.first.set(0);
    this.load();
  }

  onPeriodoInput(raw: string): void {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    this.periodo.set(digits.length === 6 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : '');
  }

  /** Alterna somenteAtivos e recarrega. */
  toggleAtivos(): void {
    this.somenteAtivos.set(!this.somenteAtivos());
    this.first.set(0);
    this.load();
  }

  // ── Detalhe ─────────────────────────────────────────────────────

  openDetail(doc: DocumentoFiscalResumo): void {
    this.detailVisible.set(true);
    this.detailLoading.set(true);
    this.selected.set(null);

    this.api.getDocumentoFiscal(doc.id).subscribe({
      next: full => {
        this.selected.set(full);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailVisible.set(false);
        this.detailLoading.set(false);
      }
    });
  }

  closeDetail(): void {
    this.detailVisible.set(false);
    this.selected.set(null);
  }

  // ── Exclusão (única mutação: o backend não tem PATCH) ───────────

  confirmDelete(doc: DocumentoFiscalResumo): void {
    this.confirm.confirm({
      header: 'Excluir documento',
      message: `Excluir definitivamente o documento <strong>${this.typeLabels[doc.tipo_documento]}</strong> do período <strong>${formatMesAno(doc.periodo)}</strong>? Esta ação não pode ser desfeita.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
      accept: () => this.deleteDoc(doc)
    });
  }

  private deleteDoc(doc: DocumentoFiscalResumo): void {
    this.deletingId.set(doc.id);
    this.api.deleteDocumentoFiscal(doc.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toast.success('Documento excluído.', 'Exclusão');
        // Se a última linha da página sumiu, volta uma página.
        if (this.docs().length === 1 && this.first() > 0) {
          this.first.set(Math.max(0, this.first() - this.rows()));
        }
        this.load();
      },
      error: () => this.deletingId.set(null)
    });
  }

  // ── Apresentação ────────────────────────────────────────────────

  tipoLabel(tipo: TipoDocumento | string): string {
    return this.typeLabels[tipo as TipoDocumento] ?? String(tipo).toUpperCase();
  }

  tipoIcon(tipo: TipoDocumento | string): string {
    const mapa: Record<string, string> = {
      pgdas_d: 'pi pi-file',
      das: 'pi pi-calendar',
      iss: 'pi pi-building',
      folha_pagamento: 'pi pi-users',
      defis: 'pi pi-chart-bar',
      dirf: 'pi pi-book',
      efd_reinf: 'pi pi-sync'
    };
    return mapa[String(tipo)] ?? 'pi pi-file';
  }

  situacaoSeverity(situacao: string | null | undefined): string {
    const s = (situacao ?? '').toLowerCase();
    if (s === 'ativo') return 'status-tag status-conforme';
    if (s === 'cancelado' || s === 'inativo') return 'status-tag status-critico';
    if (s === 'pendente') return 'status-tag status-atencao';
    return 'status-tag status-neutro';
  }

  situacaoLabel(situacao: string | null | undefined): string {
    if (!situacao) return '—';
    return situacao.charAt(0).toUpperCase() + situacao.slice(1).toLowerCase();
  }

  formatCnpj = formatCnpj;

  /** Valor total: 0,00 real (PGDAS-D não tem valor próprio) vs. ausente. */
  valor(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  isZero(v: number | null | undefined): boolean {
    return v === 0;
  }

  nomeEmpresa(id: number): string {
    return this.empresas().find(e => e.id === id)?.nome ?? `Empresa #${id}`;
  }
}
