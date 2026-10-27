// src/app/components/auditoria/auditoria.component.ts
//
// Auditoria — visão geral por competência e análise por empresa.
//
// O backend responde dict em /visao-geral (kpis + empresas) e
// AuditoriaOut em /empresa/{cnpj}. Enums vêm sem acento do Postgres.
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import {
  Auditoria,
  AuditoriaEmpresaResumo,
  Gravidade,
  StatusGeral,
  StatusPendencia,
  GRAVIDADE_LABELS,
  STATUS_GERAL_LABELS,
  STATUS_PENDENCIA_LABELS
} from '../../models/auditoria.model';
// PassThrough: no PrimeNG 22 o p-tag não tem input `class` — bindings arbitrários
// são descartados silenciosamente. pt é o canal correto para classes customizadas.
import { TagPassThrough } from 'primeng/tag';
import {
  formatCnpj,
  formatCurrency,
  formatMesAno,
  formatPercent,
  formatPercentValue,
  maskPeriodoInput,
  toApiPeriodo
} from '../../shared/format';

type Faixa = 'conforme' | 'atencao' | 'critico';
type SortKey = 'pendencias' | 'nome' | 'conformidade';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
    SelectButtonModule,
    TableModule,
    TagModule,
    SkeletonModule,
    TooltipModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule
  ],
  templateUrl: './auditoria.component.html'
})
export class AuditoriaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  // ── Competência (YYYY-MM) ───────────────────────────────────────
  readonly periodoInput = signal('');
  readonly periodo = signal('');
  readonly periodos = signal<string[]>([]);

  // ── Visão geral ─────────────────────────────────────────────────
  readonly empresas = signal<AuditoriaEmpresaResumo[]>([]);
  readonly kpis = signal({
    total_empresas: 0,
    conformes: 0,
    criticas: 0,
    total_documentos_faltantes: 0
  });
  readonly loading = signal(true);
  readonly error = signal('');

  // ── Detalhe ─────────────────────────────────────────────────────
  readonly selected = signal<Auditoria | null>(null);
  readonly detailLoading = signal(false);

  // ── Ordenação e busca ───────────────────────────────────────────
  readonly sortKey = signal<SortKey>('pendencias');
  readonly search = signal('');

  // ── Filtros de pendência (aplicam ao detalhe) ───────────────────
  readonly gravidades = signal<Gravidade[]>([]);
  readonly statusPend = signal<StatusPendencia[]>([]);

  // ═══ Formatadores expostos ao template ═══════════════════════
  readonly formatCnpj = formatCnpj;
  readonly formatCurrency = formatCurrency;
  readonly formatPercent = formatPercent;
  readonly formatMesAno = formatMesAno;
  readonly formatPercentValue = formatPercentValue;
  readonly statusLabels = STATUS_GERAL_LABELS;
  readonly gravidadeLabels = GRAVIDADE_LABELS;
  readonly statusPendLabels = STATUS_PENDENCIA_LABELS;

  // ═══ Derivados ═════════════════════════════════════════════════

  /** Faixa fiscal de um status — usada em cor, arco e margem. */
  static faixa(status: StatusGeral | null | undefined): Faixa {
    if (status === 'CRITICO') return 'critico';
    if (status === 'ATENCAO') return 'atencao';
    return 'conforme';
  }

  readonly kpiAtencao = computed(
    () => this.kpis().total_empresas - this.kpis().conformes - this.kpis().criticas
  );

  /** A régua segmentada: proporção de cada faixa no período. */
  readonly trilha = computed(() => {
    const k = this.kpis();
    const total = k.total_empresas || 1;
    return {
      conforme: (k.conformes / total) * 100,
      atencao: (this.kpiAtencao() / total) * 100,
      critico: (k.criticas / total) * 100
    };
  });

  /** Conformidade média do período — a leitura primária da trilha. */
  readonly conformidadeMedia = computed(() => {
    const list = this.empresas();
    if (list.length === 0) return null;
    return list.reduce((s, e) => s + (e.conformidade_pct ?? 0), 0) / list.length;
  });

  readonly faixaMedia = computed(() =>
    AuditoriaComponent.faixa(this.empresaMaiorPendencia()?.status_geral)
  );

  /** Empresas filtradas por busca + ordenadas — alimenta a lista do razão. */
  readonly empresasVisiveis = computed(() => {
    const termo = this.search().trim().toLowerCase();
    const base = termo
      ? this.empresas().filter(
          e =>
            e.razao_social.toLowerCase().includes(termo) ||
            e.cnpj.includes(termo.replace(/\D/g, ''))
        )
      : [...this.empresas()];

    const dir = this.sortKey() === 'nome' ? 1 : -1;
    base.sort((a, b) => {
      switch (this.sortKey()) {
        case 'nome':
          return dir * a.razao_social.localeCompare(b.razao_social, 'pt-BR');
        case 'conformidade':
          return (a.conformidade_pct ?? 0) - (b.conformidade_pct ?? 0);
        default:
          return (
            (b.pendencias_criticas_count ?? 0) - (a.pendencias_criticas_count ?? 0) ||
            (a.conformidade_pct ?? 0) - (b.conformidade_pct ?? 0)
          );
      }
    });
    return base;
  });

  /** Pendências do detalhe, após os filtros locais. */
  readonly pendenciasVisiveis = computed(() => {
    const all = this.selected()?.pendencias ?? [];
    const g = this.gravidades();
    const s = this.statusPend();
    return all.filter(p => (!g.length || g.includes(p.gravidade)) && (!s.length || s.includes(p.status)));
  });

  readonly filtrosPendenciaAtivos = computed(
    () => this.gravidades().length + this.statusPend().length
  );

  readonly empresaMaiorPendencia = computed(() => {
    const list = this.empresas();
    if (!list.length) return null;
    return list.reduce((max, e) =>
      (e.pendencias_criticas_count ?? 0) > (max.pendencias_criticas_count ?? 0) ? e : max
    );
  });

  /** Propriedades do arco SVG (240° de volta). */
  readonly arco = computed(() => {
    const pct = this.selected()?.conformidade_pct ?? 0;
    const r = 62;
    const circumference = 2 * Math.PI * r;
    const arc = circumference * (240 / 360);
    return {
      r,
      trackDash: `${arc} ${circumference}`,
      offset: arc * (1 - Math.max(0, Math.min(100, pct)) / 100)
    };
  });

  // ═══ Ciclo de vida ═════════════════════════════════════════════

  ngOnInit(): void {
    const agora = new Date();
    const inicial = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    this.periodoInput.set(formatMesAno(inicial));
    this.periodo.set(inicial);
    this.loadPeriodos();
    this.load();
  }

  loadPeriodos(): void {
    this.api.getPeriodos().subscribe({
      next: list => this.periodos.set(list ?? []),
      error: () => this.periodos.set([]) // silencioso: o input manual cobre
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getVisaoGeral(this.periodo()).subscribe({
      next: res => {
        this.kpis.set(res.kpis ?? {
          total_empresas: 0,
          conformes: 0,
          criticas: 0,
          total_documentos_faltantes: 0
        });
        this.empresas.set(res.empresas ?? []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Erro ao carregar a auditoria.');
        this.loading.set(false);
      }
    });
  }

  // ═══ Ações ═════════════════════════════════════════════════════

  onPeriodoInput(raw: string): void {
    this.periodoInput.set(maskPeriodoInput(raw));
  }

  aplicarPeriodo(): void {
    const api = toApiPeriodo(this.periodoInput());
    if (api.length !== 7) {
      this.toast.warn('Informe a competência no formato MM/AAAA.', 'Período inválido');
      return;
    }
    this.periodo.set(api);
    this.selected.set(null);
    this.load();
  }

  /** Navega entre competências mantendo o MM/AAAA visível. */
  navegar(delta: number): void {
    const [yyyy, mm] = this.periodo().split('-').map(Number);
    if (!yyyy || !mm) return;
    const d = new Date(yyyy, mm - 1 + delta, 1);
    const novo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.periodo.set(novo);
    this.periodoInput.set(formatMesAno(novo));
    this.selected.set(null);
    this.load();
  }

  selecionarEmpresa(emp: AuditoriaEmpresaResumo): void {
    this.gravidades.set([]);
    this.statusPend.set([]);
    this.detailLoading.set(true);
    this.api.getAuditoriaEmpresa(emp.cnpj, this.periodo()).subscribe({
      next: full => {
        this.selected.set(full);
        this.detailLoading.set(false);
      },
      error: () => {
        this.selected.set(null);
        this.detailLoading.set(false);
      }
    });
  }

  fecharDetalhe(): void {
    this.selected.set(null);
  }

  limparFiltros(): void {
    this.gravidades.set([]);
    this.statusPend.set([]);
  }

  // ═══ Apresentação ══════════════════════════════════════════════

  faixa(status: StatusGeral | null | undefined): Faixa {
    return AuditoriaComponent.faixa(status);
  }

  statusSeverity(status: StatusGeral | null | undefined): string {
    return `status-tag status-${this.faixa(status)}`;
  }

  gravidadesDisponiveis(): { label: string; value: Gravidade }[] {
    return [
      { label: 'Alta', value: 'ALTA' },
      { label: 'Média', value: 'MEDIA' },
      { label: 'Baixa', value: 'BAIXA' }
    ];
  }

  statusDisponiveis(): { label: string; value: StatusPendencia }[] {
    return [
      { label: 'Faltante', value: 'FALTANTE' },
      { label: 'Inconsistente', value: 'INCONSISTENTE' }
    ];
  }

  /** Fator R é um índice (%), não uma moeda — evita "R$ 38,70". */
  fatorR(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return formatPercent(v, 2);
  }

  aliquota(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return `${formatPercentValue(v, 2)}%`;
  }

  /** Impressão do laudo — o @media print do styles-ledger.css remove a casca. */
  printRelatorio(): void {
    window.print();
  }

  /** Download do relatório em XLSX (duas abas: RESUMO + DETALHAMENTO). */
  downloadXlsx(): void {
    this.api.downloadAuditoriaXlsx(this.periodo());
    this.toast.success('Planilha gerada', 'O download deve iniciar automaticamente.');
  }

  /** Rótulo do tipo de documento da pendência — o banco é varchar livre. */
  tipoDocLabel(tipo: string | null | undefined): string {
    if (!tipo) return '—';
    const mapa: Record<string, string> = {
      pgdas_d: 'PGDAS-D',
      iss: 'ISS',
      das: 'DAS',
      folha_pagamento: 'Folha de Pagamento',
      defis: 'DEFIS',
      dirf: 'DIRF',
      efd_reinf: 'EFD-REINF',
      dap: 'DAP'
    };
    return mapa[tipo.toLowerCase()] ?? tipo.toUpperCase();
  }
}
