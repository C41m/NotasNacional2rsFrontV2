// src/app/components/progress/progress.component.ts
import { CommonModule, DecimalPipe } from '@angular/common';
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

type BatchState = 'queued' | 'processing' | 'cancelling' | 'cancelled' | 'success' | 'failed';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [
    CommonModule,
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
  readonly periodo = signal<string>('');

  /** Estados terminais — o polling para quando um deles é atingido. */
  private static readonly TERMINAL: BatchState[] = ['success', 'failed', 'cancelled'];

  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly state = computed<BatchState>(() => (this.status()?.status as BatchState) ?? 'queued');
  readonly isTerminal = computed(() => ProgressComponent.TERMINAL.includes(this.state()));
  readonly isRunning = computed(() => this.state() === 'processing');

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
      notasSalvas: c?.notas_salvas ?? 0,
      valorServico: c?.valorServico ?? 0,
      valorIss: c?.valorIss ?? 0,
      notasPrestadas: c?.notasPrestadas ?? 0,
      notasTomadas: c?.notasTomadas ?? 0,
      notasCanceladas: c?.notasCanceladas ?? 0,
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
    let periodo = this.periodo();
    if (!periodo) {
      // Usa a competência atual (mês/ano atual) como fallback
      const hoje = new Date();
      periodo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    }
    const companies = this.status()?.companies;
    const companyIds = companies ? Object.keys(companies).map(Number) : [];
    this.api.downloadNfseRelatorioXlsx(periodo, companyIds).subscribe({
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
}
