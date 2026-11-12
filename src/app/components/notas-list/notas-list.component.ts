// src/app/components/notas-list/notas-list.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Company } from '../../models/company.model';
import { NotaDetalhe, NotaResumo, notaRoleLabel } from '../../models/nota.model';
import { formatCnpj, formatCurrency, formatDate, formatMesAno } from '../../shared/format';

interface LazyEvent {
  first?: number;
  rows?: number;
  sortField?: string | null | ((a: unknown, b: unknown) => number);
  sortOrder?: number | null;
}

@Component({
  selector: 'app-notas-list',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    ButtonModule,
    TableModule,
    TagModule,
    SkeletonModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    DialogModule,
    MessageModule
  ],
  templateUrl: './notas-list.component.html'
})
export class NotasListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly notas = signal<NotaResumo[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly total = signal(0);
  readonly first = signal(0);
  readonly rows = signal(20);
  readonly sortField = signal('competencia');
  readonly sortOrder = signal(-1); // PrimeNG: 1 asc, -1 desc

  readonly empresas = signal<Company[]>([]);
  readonly empresaId = signal<number | null>(null);
  readonly competenciaInicial = signal<Date | null>(null);
  readonly competenciaFinal = signal<Date | null>(null);
  readonly role = signal<string | null>(null);
  readonly search = signal('');

  readonly roleOptions = [
    { label: 'Todas', value: null },
    { label: 'Prestadas', value: 'prestado' },
    { label: 'Tomadas', value: 'tomado' }
  ];

  readonly selected = signal<NotaDetalhe | null>(null);
  readonly detailVisible = signal(false);
  readonly detailLoading = signal(false);
  readonly xmlText = signal('');
  readonly xmlLoading = signal(false);
  readonly downloadingXml = signal(false);

  readonly formatCnpj = formatCnpj;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatMesAno = formatMesAno;
  readonly notaRoleLabel = notaRoleLabel;

  readonly page = computed(() => Math.floor(this.first() / this.rows()) + 1);

  readonly filtrosAtivos = computed(() => {
    const out: { label: string; value: string }[] = [];
    if (this.empresaId()) {
      const emp = this.empresas().find(e => e.id === this.empresaId());
      out.push({ label: 'Empresa', value: emp ? emp.nome : `#${this.empresaId()}` });
    }
    if (this.competenciaInicial()) out.push({ label: 'Competência de', value: this.mesAno(this.competenciaInicial()) });
    if (this.competenciaFinal()) out.push({ label: 'Competência até', value: this.mesAno(this.competenciaFinal()) });
    if (this.role()) out.push({ label: 'Papel', value: this.role() === 'prestado' ? 'Prestadas' : 'Tomadas' });
    if (this.search().trim()) out.push({ label: 'Busca', value: this.search().trim() });
    return out;
  });

  readonly temFiltro = computed(() => this.filtrosAtivos().length > 0);

  ngOnInit(): void {
    this.readQueryParams();
    this.loadEmpresas();
    this.load();
  }

  private readQueryParams(): void {
    const q = this.route.snapshot.queryParamMap;
    const empresa = q.get('empresa_id');
    if (empresa) this.empresaId.set(Number(empresa));
    const ini = q.get('competencia_inicio');
    const fim = q.get('competencia_fim');
    if (ini) this.competenciaInicial.set(this.parseMes(ini));
    if (fim) this.competenciaFinal.set(this.parseMes(fim));
    const role = q.get('role');
    if (role) this.role.set(role);
  }

  private parseMes(yyyyMm: string): Date | null {
    const [ano, mes] = yyyyMm.split('-').map(Number);
    if (!ano || !mes) return null;
    return new Date(ano, mes - 1, 1);
  }

  private mesAno(date: Date | null): string {
    if (!date) return '';
    return formatMesAno(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  private mesParaYYYYMM(date: Date | null): string | null {
    if (!date || Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  loadEmpresas(): void {
    this.api.listCompanies(1, 1000, '').subscribe({
      next: list => this.empresas.set(list ?? []),
      error: () => this.empresas.set([])
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const filtros = {
      empresa_id: this.empresaId(),
      competencia_inicio: this.mesParaYYYYMM(this.competenciaInicial()),
      competencia_fim: this.mesParaYYYYMM(this.competenciaFinal()),
      role: this.role(),
      search: this.search().trim() || null
    };
    this.api.listNotas(filtros, this.page(), this.rows(), this.sortField(), this.sortOrder() === 1 ? 'asc' : 'desc').subscribe({
      next: res => {
        this.notas.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Erro ao carregar notas.');
        this.notas.set([]);
        this.loading.set(false);
      }
    });
  }

  onLazyLoad(event: unknown): void {
    const e = event as LazyEvent;
    const first = e.first ?? 0;
    const rows = e.rows ?? 20;
    const sortField = typeof e.sortField === 'string' ? e.sortField : this.sortField();
    const sortOrder = e.sortOrder ?? this.sortOrder();
    const changed =
      first !== this.first() ||
      rows !== this.rows() ||
      sortField !== this.sortField() ||
      sortOrder !== this.sortOrder();
    if (!changed) return;
    this.first.set(first);
    this.rows.set(rows);
    this.sortField.set(sortField);
    this.sortOrder.set(sortOrder);
    this.load();
  }

  applyFilters(): void {
    this.first.set(0);
    this.load();
  }

  clearFilters(): void {
    this.empresaId.set(null);
    this.competenciaInicial.set(null);
    this.competenciaFinal.set(null);
    this.role.set(null);
    this.search.set('');
    this.first.set(0);
    this.load();
  }

  parteLabel(nota: NotaResumo): string {
    const role = (nota.role || '').toLowerCase();
    if (role === 'tomado') return nota.razao_social_prestador || nota.cnpj_prestador || '—';
    if (role === 'prestado') return nota.razao_social_tomador || nota.cnpj_tomador || '—';
    return nota.razao_social_prestador || nota.cnpj_prestador || nota.razao_social_tomador || nota.cnpj_tomador || '—';
  }

  retencoesFederais(nota: NotaDetalhe): string {
    const total =
      (nota.valor_retido_cp ?? 0) +
      (nota.valor_retido_irrf ?? 0) +
      (nota.valor_retido_csll ?? 0) +
      (nota.valor_retido_pis ?? 0) +
      (nota.valor_retido_cofins ?? 0);
    return total > 0 ? this.formatCurrency(total) : '—';
  }

  openDetail(nota: NotaResumo): void {
    this.detailVisible.set(true);
    this.detailLoading.set(true);
    this.selected.set(null);
    this.xmlText.set('');
    this.api.getNota(nota.id).subscribe({
      next: full => {
        this.selected.set(full);
        this.detailLoading.set(false);
        if (full.tem_xml) this.loadXml(nota.id);
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
    this.xmlText.set('');
  }

  private loadXml(id: number): void {
    this.xmlLoading.set(true);
    this.api.downloadNotaXml(id).subscribe({
      next: blob => {
        blob.text().then(text => {
          this.xmlText.set(this.prettyXml(text));
          this.xmlLoading.set(false);
        });
      },
      error: () => {
        this.xmlText.set('');
        this.xmlLoading.set(false);
      }
    });
  }

  downloadXml(nota: NotaDetalhe): void {
    this.downloadingXml.set(true);
    this.api.downloadNotaXml(nota.id).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NFSe_${nota.chave_acesso || nota.numero_nfse || nota.id}.xml`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.downloadingXml.set(false);
      },
      error: () => {
        this.toast.error('Falha ao baixar o XML.', 'Erro');
        this.downloadingXml.set(false);
      }
    });
  }

  copyChave(chave?: string | null): void {
    if (!chave) return;
    navigator.clipboard?.writeText(chave).then(
      () => this.toast.success('Chave copiada.', 'Sucesso'),
      () => this.toast.warn('Não foi possível copiar a chave.', 'Aviso')
    );
  }

  private prettyXml(xmlText: string): string {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const serializer = new XMLSerializer();
      const pretty = (node: Node, indent = 0): string => {
        const pad = '  '.repeat(indent);
        let out = '';
        node.childNodes.forEach((child: Node) => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as Element;
            const kids = [...el.childNodes].filter(n => n.nodeType === Node.ELEMENT_NODE);
            if (kids.length === 0) {
              out += `${pad}${serializer.serializeToString(el)}\n`;
            } else {
              const open = serializer.serializeToString(el).split('>')[0] + '>';
              out += `${pad}${open}\n${pretty(el, indent + 1)}${pad}</${el.nodeName}>\n`;
            }
          }
        });
        return out;
      };
      return pretty(doc.documentElement);
    } catch {
      return xmlText;
    }
  }
}
