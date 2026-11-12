// src/app/components/company-list/company-list.component.ts
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Company } from '../../models/company.model';
import { formatCnpj, formatDate } from '../../shared/format';

const SELECT_ALL_CONFIRM_THRESHOLD = 20;

@Component({
  selector: 'app-company-list',
  standalone: true,
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    CheckboxModule,
    TagModule,
    SkeletonModule,
    TooltipModule
  ],
  templateUrl: './company-list.component.html'
})
export class CompanyListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly toast = inject(ToastService);

  readonly companies = signal<Company[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly search = signal('');
  readonly certFilter = signal<'all' | 'valid' | 'expiring' | 'expired'>('all');

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Estatísticas ────────────────────────────────────────────────
  readonly totalCompanies = computed(() => this.companies().length);
  readonly selectableTotal = computed(() => this.companies().filter(c => this.isCertValid(c)).length);
  readonly expiringSoonCount = computed(() => this.companies().filter(c => this.isCertExpiringSoon(c.validade_cert)).length);
  readonly noCertCount = computed(() => this.companies().filter(c => !this.isCertValid(c)).length);

  readonly certCountLabel = computed(() => this.selectableTotal() === 1 ? 'certificado válido' : 'certificados válidos');

  readonly filteredCompanies = computed(() => {
    const f = this.certFilter();
    if (f === 'all') return this.companies();
    if (f === 'valid') return this.companies().filter(c => this.isCertValid(c));
    if (f === 'expiring') return this.companies().filter(c => this.isCertExpiringSoon(c.validade_cert));
    return this.companies().filter(c => this.isCertExpired(c.validade_cert));
  });

  readonly hasActiveFilter = computed(() => this.search().trim() !== '' || this.certFilter() !== 'all');

  // ── Seleção (para download em lote) ──────────────────────────────
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly selectionLabel = computed(() =>
    this.selectedCount() === 1 ? '1 selecionada' : `${this.selectedCount()} selecionadas`
  );

  /** Rótulo do botão de seleção global: nunca seleciona sem informar o escopo. */
  readonly selectAllLabel = computed(() =>
    this.allSelectableSelected() ? 'Desmarcar todas' : `Selecionar as ${this.selectableTotal()} válidas`
  );

  /** Empresas selecionáveis: apenas as com certificado válido. */
  private selectableIds(): number[] {
    return this.companies()
      .filter(c => this.isCertValid(c))
      .map(c => c.id);
  }

  ngOnInit(): void {
    this.loadCompanies();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const editavel = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;

    if (event.key === '/' && !editavel) {
      event.preventDefault();
      const search = document.querySelector('#company-search') as HTMLInputElement | null;
      search?.focus();
      return;
    }
    if (event.key === 'Escape' && editavel) {
      const raw = (target as HTMLInputElement).value;
      if (raw) {
        event.preventDefault();
        this.search.set('');
        this.loadCompanies();
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A') && !editavel) {
      event.preventDefault();
      this.requestSelectAll(true);
    }
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.api.listCompanies(1, 1000, this.search()).subscribe({
      next: data => {
        this.companies.set(data);
        // Descarta seleções que não existem mais na resposta.
        // Só poda quando a lista não está filtrada por busca, senão
        // empresas selecionadas fora do filtro seriam "apagadas".
        if (this.search() === '') {
          const valid = new Set(this.selectableIds());
          const next = new Set([...this.selectedIds()].filter(id => valid.has(id)));
          this.selectedIds.set(next);
        }
        this.loading.set(false);
      },
      error: () => {
        // O interceptor já exibe o toast; aqui garantimos um estado de erro
        // próprio na tela (não um "nenhuma empresa cadastrada" mentindo).
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    // Debounce: evita uma requisição por tecla digitada.
    this.searchDebounce = setTimeout(() => this.loadCompanies(), 350);
  }

  clearSearch(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }
    this.search.set('');
    this.loadCompanies();
  }

  /** Filtro rápido pelo resumo: clicar de novo desfaz (volta para 'Todas'). */
  toggleCertFilter(filter: 'valid' | 'expiring' | 'expired'): void {
    this.certFilter.set(this.certFilter() === filter ? 'all' : filter);
  }

  clearFilters(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }
    this.search.set('');
    this.certFilter.set('all');
    this.loadCompanies();
  }

  // ── Certificado ─────────────────────────────────────────────────
  isCertValid(company: Company): boolean {
    return !this.isCertExpired(company.validade_cert);
  }

  isCertExpired(validade: string | null | undefined): boolean {
    if (!validade) return true;
    const validDate = new Date(validade);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return validDate < now;
  }

  isCertExpiringSoon(validade: string | null | undefined): boolean {
    if (!validade) return false;
    const validDate = new Date(validade);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = (validDate.getTime() - now.getTime()) / 86_400_000;
    return diffDays >= 0 && diffDays <= 30;
  }

  statusTagClass(company: Company): string {
    if (this.isCertExpired(company.validade_cert)) return 'status-tag status-critico';
    if (this.isCertExpiringSoon(company.validade_cert)) return 'status-tag status-atencao';
    return 'status-tag status-conforme';
  }

  certLabel(company: Company): string {
    if (this.isCertExpired(company.validade_cert)) return 'Vencido';
    if (this.isCertExpiringSoon(company.validade_cert)) return 'Vencendo';
    return 'Válido';
  }

  // ── Seleção ─────────────────────────────────────────────────────
  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelection(company: Company, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) next.add(company.id);
    else next.delete(company.id);
    this.selectedIds.set(next);
  }

  onRowClick(company: Company, event: MouseEvent): void {
    if (!this.isCertValid(company)) return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        'button, a, input, select, textarea, p-checkbox, .p-button, .table-actions'
      )
    ) {
      return;
    }
    this.toggleSelection(company, !this.isSelected(company.id));
  }

  allSelectableSelected(): boolean {
    const selectable = this.selectableIds();
    return selectable.length > 0 && selectable.every(id => this.selectedIds().has(id));
  }

  /**
   * Pedido de seleção global. Acima do limite, exige confirmação explícita
   * com a contagem no texto — a ação abrange empresas que não estão visíveis.
   */
  requestSelectAll(checked: boolean): void {
    if (!checked) {
      this.toggleSelectAll(false);
      return;
    }
    const total = this.selectableTotal();
    if (total > SELECT_ALL_CONFIRM_THRESHOLD) {
      this.confirmationService.confirm({
        header: 'Selecionar todas',
        message: `Selecionar todas as ${total} empresas com certificado válido?`,
        icon: 'pi pi-question-circle',
        acceptLabel: `Selecionar as ${total}`,
        rejectLabel: 'Cancelar',
        accept: () => this.toggleSelectAll(true)
      });
      return;
    }
    this.toggleSelectAll(true);
  }

  toggleSelectAll(checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) {
      for (const id of this.selectableIds()) next.add(id);
    } else {
      for (const id of this.selectableIds()) next.delete(id);
    }
    this.selectedIds.set(next);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  // ── Ações ───────────────────────────────────────────────────────
  editCompany(id: number): void {
    // Router, não window.location: evita reload completo e perda de estado.
    this.router.navigate(['/companies', id, 'edit']);
  }

  createCompany(): void {
    this.router.navigate(['/companies/new']);
  }

  confirmDelete(company: Company): void {
    this.confirmationService.confirm({
      header: 'Excluir empresa',
      message: `Excluir a empresa "${company.nome}"? Esta ação não pode ser desfeita.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.deleteCompany(company)
    });
  }

  private deleteCompany(company: Company): void {
    this.api.deleteCompany(company.id).subscribe({
      next: () => {
        this.toast.success(`Empresa "${company.nome}" excluída.`, 'Excluído');
        this.loadCompanies();
      },
      error: () => {
        // Toast exibido pelo interceptor.
      }
    });
  }

  startDownload(): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) {
      this.toast.warn('Selecione pelo menos uma empresa.', 'Seleção vazia');
      return;
    }
    const selected = this.companies().filter(c => ids.includes(c.id));
    localStorage.setItem('selectedCompanyIds', JSON.stringify(ids));
    localStorage.setItem(
      'selectedCompanies',
      JSON.stringify(selected.map(c => ({ id: c.id, nome: c.nome, cnpj: c.cnpj })))
    );
    this.router.navigate(['/download']);
  }

  // ── Formatação (delegadas ao util compartilhado) ────────────────
  readonly formatCnpj = formatCnpj;
  readonly formatDate = formatDate;
}
