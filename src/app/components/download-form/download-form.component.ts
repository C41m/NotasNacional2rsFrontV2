// src/app/components/download-form/download-form.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { DownloadType } from '../../models/download.model';

interface DownloadTypeOption {
  label: string;
  value: DownloadType;
  icon: string;
  disabled?: boolean;
  tooltip?: string;
}

@Component({
  selector: 'app-download-form',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    SelectButtonModule,
    MessageModule,
    TooltipModule,
    CheckboxModule
  ],
  templateUrl: './download-form.component.html'
})
export class DownloadFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly companyIds = signal<number[]>([]);
  readonly downloadType = signal<DownloadType>('xml');
  readonly dataInicial = signal<string>('');
  readonly dataFinal = signal<string>('');
  readonly forceUpdate = signal(false);
  readonly loading = signal(false);

  readonly typeOptions: DownloadTypeOption[] = [
    { label: 'XML', value: 'xml', icon: 'pi pi-code' },
    { label: 'PDF', value: 'pdf', icon: 'pi pi-file-pdf', disabled: true, tooltip: 'Em desenvolvimento' },
    { label: 'Ambos', value: 'both', icon: 'pi pi-clone', disabled: true, tooltip: 'Em desenvolvimento' }
  ];

  readonly canSubmit = computed(() => this.companyIds().length > 0 && !this.loading());

  private periodoValido(): boolean {
    const ini = this.dataInicial();
    const fim = this.dataFinal();
    if (!ini || !fim) return true; // opcional
    return fim >= ini;
  }

  private ddMmAaaa(iso: string): string | null {
    if (!iso) return null;
    const partes = iso.split("-");
    if (partes.length !== 3) return null;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  ngOnInit(): void {
    const stored = localStorage.getItem('selectedCompanyIds');
    if (stored) {
      try {
        this.companyIds.set(JSON.parse(stored) as number[]);
      } catch {
        this.companyIds.set([]);
      }
      localStorage.removeItem('selectedCompanyIds');
    }

    if (this.companyIds().length === 0) {
      this.toast.warn('Nenhuma empresa selecionada.', 'Seleção vazia');
      this.router.navigate(['/companies']);
    }
  }

  onTypeChange(value: DownloadType): void {
    this.downloadType.set(value);
  }

  submit(): void {
    const ids = this.companyIds();
    if (ids.length === 0) {
      this.toast.warn('Selecione pelo menos uma empresa.', 'Seleção vazia');
      return;
    }

    if (!this.periodoValido()) {
      this.toast.error('O período final deve ser maior ou igual ao período inicial.', 'Período inválido');
      return;
    }

    this.loading.set(true);
    this.api
      .startBatchDownload({
        company_ids: ids,
        datainicio: this.ddMmAaaa(this.dataInicial()),
        datafim: this.ddMmAaaa(this.dataFinal()),
        download_type: this.downloadType(),
        force_update: this.forceUpdate()
      })
      .subscribe({
        next: response => {
          this.loading.set(false);
          this.router.navigate(['/download', response.batch_id]);
        },
        error: () => this.loading.set(false)
      });
  }
}
