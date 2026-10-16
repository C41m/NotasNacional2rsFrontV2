// src/app/components/company-list/company-list.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  readonly search = signal('');

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Estatísticas ────────────────────────────────────────────────
  readonly totalCompanies = computed(() => this.companies().length);
  readonly certCount = computed(() => this.companies().filter(c => this.isCertValid(c)).length);
  readonly noCertCount = computed(() => this.companies().filter(c => !this.isCertValid(c)).length);

  // ── Seleção (para download em lote) ──────────────────────────────
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly selectedCount = computed(() => this.selectedIds().size);

  /** Total de empresas elegíveis para download (certificado válido). */
  readonly selectableTotal = computed(
    () => this.companies().filter(c => this.isCertValid(c)).length
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

  loadCompanies(): void {
    this.loading.set(true);
    this.api.listCompanies(1, 200, this.search()).subscribe({
      next: data => {
        this.companies.set(data);
        // Descarta seleções que não existem mais na resposta.
        const valid = new Set(this.selectableIds());
        const next = new Set([...this.selectedIds()].filter(id => valid.has(id)));
        this.selectedIds.set(next);
        this.loading.set(false);
      },
      error: () => {
        // O interceptor já exibe o toast; aqui só liberamos o loading.
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
    this.search.set('');
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

  certSeverity(company: Company): 'success' | 'warn' | 'danger' {
    if (this.isCertExpired(company.validade_cert)) return 'danger';
    if (this.isCertExpiringSoon(company.validade_cert)) return 'warn';
    return 'success';
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

  allSelectableSelected(): boolean {
    const selectable = this.selectableIds();
    return selectable.length > 0 && selectable.every(id => this.selectedIds().has(id));
  }

  toggleSelectAll(checked: boolean): void {
    this.selectedIds.set(checked ? new Set(this.selectableIds()) : new Set());
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
    localStorage.setItem('selectedCompanyIds', JSON.stringify(ids));
    this.router.navigate(['/download']);
  }

  // ── Formatação (delegadas ao util compartilhado) ────────────────
  readonly formatCnpj = formatCnpj;
  readonly formatDate = formatDate;
}
