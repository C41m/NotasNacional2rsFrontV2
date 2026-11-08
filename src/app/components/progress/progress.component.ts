// src/app/components/progress/progress.component.ts
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { BatchStatus, CompanyProgress } from '../../models/download.model';
import { formatCnpj } from '../../shared/format';

type BatchState = 'queued' | 'processing' | 'cancelling' | 'cancelled' | 'success' | 'failed';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    ButtonModule,
    TableModule,
    TagModule,
    ProgressBarModule,
    SkeletonModule,
    TooltipModule
  ],
  templateUrl: './progress.component.html'
})
export class ProgressComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly batchId = signal('');
  readonly status = signal<BatchStatus | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly canceling = signal(false);
  readonly polls = signal(0);
  readonly lastUpdated = signal<Date | null>(null);
  readonly periodo = signal<string>('');

  /** Estados terminais — o polling para quando um deles é atingido. */
  private static readonly TERMINAL: BatchState[] = ['success', 'failed', 'cancelled'];

  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly state = computed<BatchState>(() => (this.status()?.status as BatchState) ?? 'queued');
  readonly isTerminal = computed(() => ProgressComponent.TERMINAL.includes(this.state()));
  readonly isRunning = computed(() => this.state() === 'processing' || this.state() === 'queued');
  readonly isActive = computed(
    () => this.state() === 'queued' || this.state() === 'processing' || this.state() === 'cancelling'
  );

  readonly shortBatchId = computed(() => this.batchId().slice(0, 8));

  readonly batchTypeLabel = computed(() => (this.status()?.download_type || 'xml').toUpperCase());

  readonly batchPeriodLabel = computed(() => {
    const s = this.status();
    if (s?.datainicio || s?.datafim) {
      const ini = s?.datainicio ?? '';
      const fim = s?.datafim ?? '';
      if (ini && fim) return `${ini} → ${fim}`;
      return ini || fim;
    }
    if (this.periodo()) return this.formatPeriodoParam(this.periodo());
    return 'Histórico completo';
  });

  readonly successSummary = computed(() => {
    const empresas = this.status()?.total ?? 0;
    const notas = this.totalNotas();
    const salvas = this.totalSalvas();
    const empresaLabel = empresas === 1 ? 'empresa concluída' : 'empresas concluídas';
    const notaLabel = notas === 1 ? 'nota baixada' : 'notas baixadas';
    const salvaLabel = salvas === 1 ? 'salva' : 'salvas';
    return `${empresas} ${empresaLabel} • ${notas} ${notaLabel} • ${salvas} ${salvaLabel} no banco nesta execução`;
  });

  readonly overallPct = computed(() => {
    const s = this.status();
    if (!s || s.total === 0) return 0;
    return Math.round((s.done / s.total) * 100);
  });

  readonly totalNotas = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.notas_done ?? 0), 0);
  });

  readonly totalSalvas = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.notas_salvas ?? 0), 0);
  });

  readonly totalValorServico = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.valorServico ?? 0), 0);
  });

  readonly totalValorIss = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.valorIss ?? 0), 0);
  });

  readonly totalNotasPrestadas = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.notasPrestadas ?? 0), 0);
  });

  readonly totalNotasTomadas = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.notasTomadas ?? 0), 0);
  });

  readonly totalNotasCanceladas = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.notasCanceladas ?? 0), 0);
  });

  readonly totalNotasOutros = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.notasOutros ?? 0), 0);
  });

  readonly totalValorPrestadoComRetencao = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.valorPrestadoComRetencao ?? 0), 0);
  });

  readonly totalValorPrestadoSemRetencao = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.valorPrestadoSemRetencao ?? 0), 0);
  });

  readonly totalNotasPrestadasComRetencao = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.notasPrestadasComRetencao ?? 0), 0);
  });

  readonly totalNotasPrestadasSemRetencao = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.notasPrestadasSemRetencao ?? 0), 0);
  });

  readonly totalValorOutros = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.valorOutros ?? 0), 0);
  });

  readonly totalValorPrestado = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.valorPrestado ?? 0), 0);
  });

  readonly totalValorTomado = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.valorTomado ?? 0), 0);
  });

  readonly totalValorCancelado = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce((sum, c) => sum + (c?.valorCancelado ?? 0), 0);
  });

  readonly totalEmpresas = computed(() => {
    const companies = this.status()?.companies;
    return companies ? Object.keys(companies).length : 0;
  });

  readonly totalSucesso = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce(
      (sum, c) => sum + (c?.status === 'success' ? 1 : 0),
      0
    );
  });

  readonly totalErro = computed(() => {
    const companies = this.status()?.companies;
    if (!companies) return 0;
    return Object.values(companies).reduce(
      (sum, c) => sum + (c?.status === 'failed' ? 1 : 0),
      0
    );
  });

  /** Linhas da tabela: uma por empresa. Notas só aparecem quando a empresa termina. */
  readonly rows = computed(() => {
    const companies = this.status()?.companies ?? {};
    return Object.entries(companies).map(([id, c]) => ({
      id,
      nome: c?.nome ?? '—',
      cnpj: c?.cnpj ?? '',
      notasDone: c?.notas_done ?? 0,
      notasTotal: c?.notas_total ?? 0,
      notasSalvas: c?.notas_salvas ?? 0,
      valorServico: c?.valorServico ?? 0,
      valorIss: c?.valorIss ?? 0,
      notasPrestadas: c?.notasPrestadas ?? 0,
      notasTomadas: c?.notasTomadas ?? 0,
      notasCanceladas: c?.notasCanceladas ?? 0,
      notasOutros: c?.notasOutros ?? 0,
      valorPrestado: c?.valorPrestado ?? 0,
      valorTomado: c?.valorTomado ?? 0,
      valorCancelado: c?.valorCancelado ?? 0,
      carregandoNotas: c?.carregando_notas ?? false,
      state: (c?.status as BatchState) ?? 'queued',
      mensagem: c?.mensagem ?? ''
    }));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('batchId') ?? '';
    const periodoParam = this.route.snapshot.queryParamMap.get('periodo') ?? '';
    if (!id) {
      this.error.set('Batch ID não encontrado.');
      this.loading.set(false);
      return;
    }
    this.batchId.set(id);
    this.periodo.set(periodoParam);
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    // Primeira consulta imediata; depois a cada 3s durante o processamento (feedback rapido)
    // e a cada 10s quando ja esta em estado terminal.
    this.poll();
    this.intervalId = setInterval(() => this.poll(), 3_000);
  }

  private stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private poll(): void {
    this.api.getBatchStatus(this.batchId()).subscribe({
      next: status => {
        this.status.set(status);
        this.loading.set(false);
        this.polls.update(n => n + 1);
        this.lastUpdated.set(new Date());
        if (ProgressComponent.TERMINAL.includes(status.status as BatchState)) {
          this.stopPolling();
        }
      },
      error: err => {
        this.error.set(err.message || 'Erro ao verificar o status do download.');
        this.loading.set(false);
        this.stopPolling();
      }
    });
  }

  // ── Ações ───────────────────────────────────────────────────────
  cancel(): void {
    if (this.canceling() || !this.batchId()) return;
    this.canceling.set(true);
    this.api.cancelBatch(this.batchId()).subscribe({
      next: () => this.toast.info('Cancelamento solicitado.', 'Download'),
      error: () => this.canceling.set(false)
    });
  }

  retry(): void {
    // Recarrega a rota em vez de window.location.reload().
    this.loading.set(true);
    this.error.set('');
    this.startPolling();
  }

  downloadFile(): void {
    this.api.downloadBatchFile(this.batchId()).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nfse_batch_${this.batchId()}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toast.error('Falha ao baixar o ZIP.', 'Erro')
    });
  }

  downloadRelatorioXlsx(): void {
    const s = this.status();
    const datainicio = s?.datainicio ?? undefined;
    const datafim = s?.datafim ?? undefined;
    let periodo = this.periodo();
    if (!periodo && (datainicio || datafim)) {
      const raw = datainicio || datafim;
      const m = (raw || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) periodo = `${m[3]}-${m[2]}`;
    }
    if (!periodo) {
      this.toast.error('Período não informado para gerar o relatório.', 'Erro');
      return;
    }
    const companies = this.status()?.companies;
    const companyIds = companies ? Object.keys(companies).map(Number) : [];
    this.api.downloadNfseRelatorioXlsx(periodo, companyIds, datainicio, datafim).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_nfse_${periodo}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toast.error('Falha ao baixar o relatório XLSX.', 'Erro')
    });
    this.toast.success('Planilha solicitada', 'O download deve iniciar automaticamente.');
  }

  goBack(): void {
    this.router.navigate(['/companies']);
  }

  // ── Apresentação de status ──────────────────────────────────────
  stateLabel(state: BatchState): string {
    const labels: Record<BatchState, string> = {
      queued: 'Na fila',
      processing: 'Processando',
      cancelling: 'Cancelando',
      cancelled: 'Cancelado',
      success: 'Concluído',
      failed: 'Erro'
    };
    return labels[state] ?? state;
  }

  stateSeverity(state: BatchState): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    const map: Record<BatchState, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
      queued: 'secondary',
      processing: 'info',
      cancelling: 'warn',
      cancelled: 'secondary',
      success: 'success',
      failed: 'danger'
    };
    return map[state] ?? 'secondary';
  }

  rowProgress(row: { notasDone: number; notasTotal: number; state: BatchState }): number {
    if (row.notasTotal > 0) return Math.min(100, Math.round((row.notasDone / row.notasTotal) * 100));
    return row.state === 'success' ? 100 : 0;
  }

  formatPeriodoParam(periodo: string): string {
    const partes = periodo.split('-');
    if (partes.length !== 2) return periodo;
    return `${partes[1]}/${partes[0]}`;
  }

  readonly formatCnpj = formatCnpj;
}
