// src/app/components/download-form/download-form.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { formatCnpj } from '../../shared/format';

interface SelectedCompanySummary {
  id: number;
  nome: string;
  cnpj: string;
}

@Component({
  selector: 'app-download-form',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule
  ],
  templateUrl: './download-form.component.html'
})
export class DownloadFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly companyIds = signal<number[]>([]);
  readonly selectedCompanies = signal<SelectedCompanySummary[]>([]);
  readonly competenciaInicial = signal('');
  readonly competenciaFinal = signal('');
  readonly competenciaInicialDate = computed(() => this.parseCompetencia(this.competenciaInicial()));
  readonly competenciaFinalDate = computed(() => this.parseCompetencia(this.competenciaFinal()));
  readonly loading = signal(false);

  readonly selectionLabel = computed(() =>
    this.companyIds().length === 1 ? '1 empresa selecionada' : `${this.companyIds().length} empresas selecionadas`
  );

  readonly periodoInvalido = computed(
    () =>
      !!this.competenciaInicial() &&
      !!this.competenciaFinal() &&
      this.competenciaFinal() < this.competenciaInicial()
  );

  readonly canSubmit = computed(
    () => this.companyIds().length > 0 && !this.loading() && !this.periodoInvalido()
  );

  readonly resumoPeriodo = computed(() => {
    const ini = this.competenciaInicial();
    const fim = this.competenciaFinal();
    if (!ini && !fim) return 'Histórico completo';
    if (ini && fim) return `Competência ${this.formatCompetencia(ini)} → ${this.formatCompetencia(fim)}`;
    if (ini) return `A partir de ${this.formatCompetencia(ini)}`;
    return `Até ${this.formatCompetencia(fim)}`;
  });

  readonly resumoLote = computed(
    () => `${this.selectionLabel()} • XML • ${this.resumoPeriodo()}`
  );

  readonly formatCnpj = formatCnpj;

  private mesParaDdMmAaaa(competencia: string): string | null {
    if (!competencia) return null;
    const partes = competencia.split('-');
    if (partes.length !== 2) return null;
    return `01/${partes[1]}/${partes[0]}`;
  }

  /** Último dia do mês: o portal nacional é semanal/dia, então competência
   *  única (ex.: 10/2026) precisa virar 01/10/2026 → 31/10/2026. */
  private mesParaUltimoDia(competencia: string): string | null {
    if (!competencia) return null;
    const [ano, mes] = competencia.split('-').map(Number);
    if (!ano || !mes) return null;
    const ultimo = new Date(ano, mes, 0).getDate();
    return `${String(ultimo).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
  }

  private parseCompetencia(competencia: string): Date | null {
    if (!competencia) return null;
    const [ano, mes] = competencia.split('-').map(Number);
    if (!ano || !mes) return null;
    return new Date(ano, mes - 1, 1);
  }

  private dateParaCompetencia(date: Date | null): string {
    if (!date || Number.isNaN(date.getTime())) return '';
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
  }

  onCompetenciaInicialChange(date: Date | null): void {
    this.competenciaInicial.set(this.dateParaCompetencia(date));
  }

  onCompetenciaFinalChange(date: Date | null): void {
    this.competenciaFinal.set(this.dateParaCompetencia(date));
  }

  formatCompetencia(competencia: string): string {
    if (!competencia) return '';
    const partes = competencia.split('-');
    if (partes.length !== 2) return competencia;
    return `${partes[1]}/${partes[0]}`;
  }

  ngOnInit(): void {
    const storedCompanies = localStorage.getItem('selectedCompanies');
    const storedIds = localStorage.getItem('selectedCompanyIds');

    if (storedCompanies) {
      try {
        const parsed = JSON.parse(storedCompanies) as SelectedCompanySummary[];
        this.selectedCompanies.set(parsed);
        this.companyIds.set(parsed.map(c => c.id));
      } catch {
        this.selectedCompanies.set([]);
        this.companyIds.set([]);
      }
    } else if (storedIds) {
      try {
        const ids = JSON.parse(storedIds) as number[];
        this.companyIds.set(ids);
        this.selectedCompanies.set(ids.map(id => ({ id, nome: '', cnpj: '' })));
      } catch {
        this.companyIds.set([]);
        this.selectedCompanies.set([]);
      }
    }

    localStorage.removeItem('selectedCompanyIds');
    localStorage.removeItem('selectedCompanies');

    if (this.companyIds().length === 0) {
      this.toast.warn('Nenhuma empresa selecionada.', 'Seleção vazia');
      this.router.navigate(['/companies']);
    }
  }

  submit(): void {
    const ids = this.companyIds();
    if (ids.length === 0) {
      this.toast.warn('Selecione pelo menos uma empresa.', 'Seleção vazia');
      return;
    }

    if (this.periodoInvalido()) {
      this.toast.error('A competência final deve ser posterior ou igual à inicial.', 'Período inválido');
      return;
    }

    this.loading.set(true);
    const competenciaInicial = this.competenciaInicial();
    const datainicio = this.mesParaDdMmAaaa(competenciaInicial);
    const datafim = this.mesParaUltimoDia(this.competenciaFinal());
    this.api
      .startBatchDownload({
        company_ids: ids,
        datainicio,
        datafim,
        download_type: 'xml',
        force_update: false
      })
      .subscribe({
        next: response => {
          this.loading.set(false);
          this.router.navigate(['/download', response.batch_id], {
            queryParams: competenciaInicial ? { periodo: competenciaInicial } : {}
          });
        },
        error: () => this.loading.set(false)
      });
  }
}
