// src/app/components/notas-dashboard/notas-dashboard.component.ts
import { Component, computed, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Company } from '../../models/company.model';
import { NotasDashboardResumo, NotasEmpresaRanking, NotasSerieItem } from '../../models/nota.model';
import { formatCnpj, formatMesAno } from '../../shared/format';

@Component({
  selector: 'app-notas-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    DatePipe,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
    MessageModule
  ],
  templateUrl: './notas-dashboard.component.html'
})
export class NotasDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly resumo = signal<NotasDashboardResumo | null>(null);
  readonly series = signal<NotasSerieItem[]>([]);
  readonly empresas = signal<NotasEmpresaRanking[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly seriesError = signal('');
  readonly empresasError = signal('');

  /** Últimas 12 competências, mais recente primeiro (o backend devolve asc). */
  readonly seriesRecentes = computed(() => [...this.series()].slice(-12).reverse());

  readonly empresasOptions = signal<Company[]>([]);
  readonly empresaId = signal<number | null>(null);
  readonly competenciaInicial = signal<Date | null>(null);
  readonly competenciaFinal = signal<Date | null>(null);
  readonly role = signal<string | null>(null);

  private applyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly empresasComNotasLabel = computed(() =>
    (this.resumo()?.empresas_com_notas ?? 0) === 1 ? 'empresa c/ notas' : 'empresas c/ notas'
  );

  readonly roleOptions = [
    { label: 'Prestadas', value: 'prestado' },
    { label: 'Tomadas', value: 'tomado' }
  ];

  readonly formatCnpj = formatCnpj;
  readonly formatMesAno = formatMesAno;

  ngOnInit(): void {
    this.loadEmpresas();
    this.load();
  }

  /** Atalhos: '/' foca o seletor de Empresa; 'r' recarrega os dados. */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const editavel = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;

    if (event.key === '/' && !editavel) {
      event.preventDefault();
      const combo = document.querySelector('#dash-empresa') as HTMLElement | null;
      combo?.focus();
      return;
    }
    if ((event.key === 'r' || event.key === 'R') && !editavel && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.load();
    }
  }

  /** Verdadeiro quando o intervalo de competências é inválido (fim < início). */
  get periodoInvalido(): boolean {
    const ini = this.mesParaYYYYMM(this.competenciaInicial());
    const fim = this.mesParaYYYYMM(this.competenciaFinal());
    return !!ini && !!fim && fim < ini;
  }

  private mesParaYYYYMM(date: Date | null): string | null {
    if (!date || Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private filtros() {
    return {
      empresa_id: this.empresaId(),
      competencia_inicio: this.mesParaYYYYMM(this.competenciaInicial()),
      competencia_fim: this.mesParaYYYYMM(this.competenciaFinal()),
      role: this.role()
    };
  }

  loadEmpresas(): void {
    this.api.listCompanies(1, 1000, '').subscribe({
      next: list => {
        const sorted = [...(list ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
        this.empresasOptions.set(sorted);
      },
      error: () => this.empresasOptions.set([])
    });
  }

  /** Aplica os filtros automaticamente (debounce ~400ms) após qualquer mudança. */
  private scheduleLoad(): void {
    if (this.applyTimer) clearTimeout(this.applyTimer);
    this.applyTimer = setTimeout(() => this.load(), 400);
  }

  onEmpresaChange(id: number | null): void {
    this.empresaId.set(id);
    this.scheduleLoad();
  }

  onCompetenciaInicialChange(date: Date | null): void {
    this.competenciaInicial.set(date);
    this.scheduleLoad();
  }

  onCompetenciaFinalChange(date: Date | null): void {
    this.competenciaFinal.set(date);
    this.scheduleLoad();
  }

  onRoleChange(role: string | null): void {
    this.role.set(role);
    this.scheduleLoad();
  }

  /** Enter nos campos de filtro aplica imediatamente, sem esperar o debounce. */
  onFiltroEnter(): void {
    if (this.applyTimer) clearTimeout(this.applyTimer);
    this.load();
  }

  load(): void {
    if (this.periodoInvalido) {
      // Intervalo inválido: não dispara nada e avisa na UI (p-message).
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.seriesError.set('');
    this.empresasError.set('');
    const f = this.filtros();
    this.api.getNotasResumo(f).subscribe({
      next: resumo => {
        this.resumo.set(resumo);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Erro ao carregar o dashboard.');
        this.loading.set(false);
      }
    });
    this.api.getNotasSeries(f).subscribe({
      next: series => this.series.set(series ?? []),
      error: () => this.seriesError.set('Não foi possível carregar a série por competência.')
    });
    this.api.getNotasEmpresas(f, 10).subscribe({
      next: empresas => this.empresas.set(empresas ?? []),
      error: () => this.empresasError.set('Não foi possível carregar o ranking de empresas.')
    });
  }

  clearFilters(): void {
    if (this.applyTimer) clearTimeout(this.applyTimer);
    this.empresaId.set(null);
    this.competenciaInicial.set(null);
    this.competenciaFinal.set(null);
    this.role.set(null);
    this.load();
  }

  openNotas(empresaId?: number, role?: string | null, competencia?: string | null): void {
    const queryParams: Record<string, string> = {};
    const emp = empresaId ?? this.empresaId();
    if (emp) queryParams['empresa_id'] = String(emp);
    if (competencia) {
      queryParams['competencia_inicio'] = competencia;
      queryParams['competencia_fim'] = competencia;
    } else {
      const ini = this.mesParaYYYYMM(this.competenciaInicial());
      const fim = this.mesParaYYYYMM(this.competenciaFinal());
      if (ini) queryParams['competencia_inicio'] = ini;
      if (fim) queryParams['competencia_fim'] = fim;
    }
    const r = role ?? this.role();
    if (r) queryParams['role'] = r;
    this.router.navigate(['/notas'], { queryParams });
  }

  exportar(): void {
    const ini = this.competenciaInicial();
    const fim = this.competenciaFinal();
    const mesIni = this.mesParaYYYYMM(ini);
    const mesFim = this.mesParaYYYYMM(fim);
    if (!ini || !fim || !mesIni || !mesFim) {
      this.toast.warn('Selecione competência inicial e final para exportar.', 'Período necessário');
      return;
    }
    if (this.periodoInvalido) {
      this.toast.warn('Competência final deve ser maior ou igual à inicial.', 'Intervalo inválido');
      return;
    }
    const [anoI, mesI] = mesIni.split('-');
    const [anoF, mesF] = mesFim.split('-');
    const datainicio = `01/${mesI}/${anoI}`;
    const datafim = `01/${mesF}/${anoF}`;
    const companyIds = this.empresaId() ? [this.empresaId()!] : undefined;
    this.api.downloadNfseRelatorioXlsx(mesIni, companyIds, datainicio, datafim).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_nfse_${anoI}${mesI}_a_${anoF}${mesF}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toast.error('Falha ao baixar o relatório XLSX.', 'Erro')
    });
  }
}
