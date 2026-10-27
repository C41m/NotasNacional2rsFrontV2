// src/app/components/batch-list/batch-list.component.ts
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { formatDateTime } from '../../shared/format';

type BatchState = 'queued' | 'processing' | 'cancelling' | 'cancelled' | 'success' | 'failed';

interface BatchItem {
  batchId: string;
  total: number;
  done: number;
  status: BatchState;
  datainicio: string;
  datafim: string;
  createdAt: string;
  companyCount: number;
}

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [
    RouterLink,
    TableModule,
    ButtonModule,
    TagModule,
    SkeletonModule,
    TooltipModule
  ],
  templateUrl: './batch-list.component.html'
})
export class BatchListComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly batches = signal<BatchItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly cancelingId = signal<string | null>(null);

  private refreshSub: Subscription | null = null;

  readonly processingCount = computed(
    () => this.batches().filter(b => b.status === 'processing').length
  );
  readonly queuedCount = computed(() => this.batches().filter(b => b.status === 'queued').length);
  readonly completedCount = computed(
    () =>
      this.batches().filter(b => b.status !== 'processing' && b.status !== 'queued').length
  );

  ngOnInit(): void {
    this.loadBatches();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadBatches(silent = false): void {
    if (!silent) this.loading.set(true);
    this.error.set('');

    this.api.listActiveBatches().subscribe({
      next: data => {
        this.batches.set(this.parseBatches(data));
        this.loading.set(false);
        this.syncAutoRefresh();
      },
      error: err => {
        this.error.set(err.message || 'Erro ao carregar downloads.');
        this.loading.set(false);
      }
    });
  }

  /** Converte o dict { batchId: {...} } do backend em lista ordenada. */
  private parseBatches(data: Record<string, Record<string, unknown>> | null): BatchItem[] {
    if (!data) return [];
    return Object.entries(data)
      .map(([batchId, b]) => ({
        batchId,
        total: Number(b['total'] ?? 0),
        done: Number(b['done'] ?? 0),
        status: (b['status'] as BatchState) ?? 'queued',
        datainicio: String(b['datainicio'] ?? ''),
        datafim: String(b['datafim'] ?? ''),
        createdAt: String(b['created_at'] ?? ''),
        companyCount: Object.keys((b['companies'] as object) ?? {}).length
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Só faz polling enquanto houver algo em andamento. */
  private syncAutoRefresh(): void {
    const hasActive = this.batches().some(b => b.status === 'processing' || b.status === 'queued');
    if (hasActive) this.startAutoRefresh();
    else this.stopAutoRefresh();
  }

  private startAutoRefresh(): void {
    if (this.refreshSub) return;
    this.refreshSub = interval(10_000).subscribe(() => this.loadBatches(true));
  }

  private stopAutoRefresh(): void {
    this.refreshSub?.unsubscribe();
    this.refreshSub = null;
  }

  // ── Ações ───────────────────────────────────────────────────────
  cancelBatch(batch: BatchItem): void {
    if (this.cancelingId()) return;
    this.cancelingId.set(batch.batchId);
    this.api.cancelBatch(batch.batchId).subscribe({
      next: () => {
        this.cancelingId.set(null);
        this.toast.info(`Download ${batch.batchId.slice(0, 8)} cancelado.`, 'Cancelado');
        this.loadBatches(true);
      },
      error: () => this.cancelingId.set(null)
    });
  }

  openBatch(batchId: string, datainicio?: string, datafim?: string): void {
    const periodo = datainicio ? `${datainicio.split('/')[2]}-${datainicio.split('/')[1]}` : undefined;
    this.router.navigate(['/download', batchId], { queryParams: { periodo } });
  }

  progressOf(batch: BatchItem): number {
    if (!batch.total) return 0;
    return Math.round((batch.done / batch.total) * 100);
  }

  shortId(batchId: string): string {
    return `${batchId.slice(0, 12)}…`;
  }

  // ── Apresentação ────────────────────────────────────────────────
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

  isActive(batch: BatchItem): boolean {
    return batch.status === 'processing' || batch.status === 'queued';
  }

  readonly formatDateTime = formatDateTime;
}
