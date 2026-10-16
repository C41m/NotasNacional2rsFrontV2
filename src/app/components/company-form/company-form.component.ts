// src/app/components/company-form/company-form.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { PasswordModule } from 'primeng/password';
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Company, CompanyCreate, CompanyUpdate } from '../../models/company.model';
import { isValidCnpj } from '../../shared/format';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    RouterLink,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    PasswordModule,
    FileUploadModule,
    MessageModule,
    SkeletonModule,
    TooltipModule
  ],
  templateUrl: './company-form.component.html'
})
export class CompanyFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  // ── Estado ──────────────────────────────────────────────────────
  readonly nome = signal('');
  readonly cnpj = signal('');
  readonly idDominio = signal<number | null>(null);
  readonly password = signal('');
  readonly pfxBase64 = signal('');

  readonly selectedFileName = signal<string | null>(null);
  readonly currentCertDate = signal<string | null>(null);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly isEdit = signal(false);
  readonly companyId = signal<number | null>(null);
  readonly submitted = signal(false);

  /** Mostra erro só após blur — evita erro durante colar/digitar. */
  readonly cnpjTouched = signal(false);
  readonly cnpjInvalid = computed(
    () =>
      this.cnpjTouched() &&
      this.cnpj().replace(/\D/g, '').length > 0 &&
      !isValidCnpj(this.cnpj())
  );

  onCnpjBlur(): void {
    this.cnpjTouched.set(true);
  }

  readonly title = computed(() => (this.isEdit() ? 'Editar Empresa' : 'Cadastrar Nova Empresa'));
  readonly subtitle = computed(() =>
    this.isEdit()
      ? 'Atualize as informações da empresa abaixo'
      : 'Preencha os dados para cadastrar uma nova empresa'
  );

  /** No cadastro o certificado e a senha são obrigatórios; na edição, opcionais. */
  readonly certRequired = computed(() => !this.isEdit());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.companyId.set(Number(id));
      this.loadCompany(Number(id));
    } else {
      this.isEdit.set(false);
    }
  }

  private loadCompany(id: number): void {
    this.loading.set(true);
    this.api.getCompany(id).subscribe({
      next: (company: Company) => {
        this.nome.set(company.nome);
        this.cnpj.set(company.cnpj);
        this.idDominio.set(company.id_dominio ?? null);
        this.currentCertDate.set(company.validade_cert ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onCnpjInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    // Máscara progressiva: 00 → 00.0 → 00.000 → 00.000.000 → 00.000.000/0000 → 00.000.000/0000-00
    let masked = digits;
    if (digits.length > 2) masked = digits.slice(0, 2) + '.' + digits.slice(2);
    if (digits.length > 5) masked = digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5);
    if (digits.length > 8) masked = digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5, 8) + '/' + digits.slice(8);
    if (digits.length > 12) masked = digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5, 8) + '/' + digits.slice(8, 12) + '-' + digits.slice(12);
    this.cnpj.set(masked);
  }

  onFileSelect(event: FileSelectEvent): void {
    const file = event.files?.[0];
    if (!file) return;

    this.selectedFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // DataURL → base64 puro (o backend espera o base64, sem o prefixo).
      this.pfxBase64.set(result.split(',')[1] ?? '');
    };
    reader.readAsDataURL(file);
  }

  clearFile(): void {
    // No v22 o `onClear` emite `void` — não há objeto de evento para inspecionar.
    this.selectedFileName.set(null);
    this.pfxBase64.set('');
  }

  isFormValid(): boolean {
    if (!this.nome().trim() || !this.cnpj().trim()) return false;
    if (!isValidCnpj(this.cnpj())) return false;
    if (this.certRequired()) {
      if (!this.pfxBase64() || !this.password()) return false;
    }
    return true;
  }

  submit(): void {
    this.submitted.set(true);

    if (!this.isFormValid()) {
      this.toast.warn('Verifique os campos destacados antes de salvar.', 'Formulário inválido');
      return;
    }

    this.saving.set(true);

    if (this.isEdit() && this.companyId() !== null) {
      const updateData: CompanyUpdate = {
        nome: this.nome().trim()
      };
      if (this.idDominio() !== null) updateData.id_dominio = this.idDominio()!;
      if (this.pfxBase64()) updateData.pfx_base64 = this.pfxBase64();
      if (this.password()) updateData.password = this.password();

      this.api.updateCompany(this.companyId()!, updateData).subscribe({
        next: () => {
          this.toast.success('Empresa atualizada com sucesso!', 'Sucesso');
          this.router.navigate(['/companies']);
        },
        error: () => this.saving.set(false)
      });
    } else {
      const createData: CompanyCreate = {
        nome: this.nome().trim(),
        cnpj: this.cnpj(),
        pfx_base64: this.pfxBase64(),
        password: this.password()
      };
      if (this.idDominio() !== null) createData.id_dominio = this.idDominio()!;

      this.api.createCompany(createData).subscribe({
        next: () => {
          this.toast.success('Empresa cadastrada com sucesso!', 'Sucesso');
          this.router.navigate(['/companies']);
        },
        error: () => this.saving.set(false)
      });
    }
  }
  // ── Helpers de template ─────────────────────────────────────────
  readonly isValidCnpj = isValidCnpj;
}
