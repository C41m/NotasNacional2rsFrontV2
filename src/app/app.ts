// src/app/app.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { UiService } from './services/ui.service';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    ButtonModule,
    DrawerModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule
  ],
  templateUrl: './app.html'
})
export class App implements OnInit {
  private readonly router = inject(Router);
  readonly ui = inject(UiService);

  /** Rótulo da rota atual, exibido no breadcrumb da topbar. */
  readonly pageTitle = signal('Empresas');

  private readonly routeLabels: Record<string, string> = {
    '/companies': 'Empresas',
    '/companies/new': 'Nova Empresa',
    '/auditoria': 'Auditoria',
    '/documentos-fiscais': 'Documentos Fiscais',
    '/download': 'Download NFSe',
    '/batches': 'Downloads Ativos'
  };

  readonly breadcrumbVisible = computed(() => this.pageTitle() !== 'Empresas');

  ngOnInit(): void {
    // O tema precisa estar aplicado antes do primeiro paint dos tokens.
    this.ui.applyTheme();

    this.router.events.subscribe(() => {
      const url = this.router.url.split('?')[0];
      this.pageTitle.set(this.routeLabels[url] ?? this.resolveDynamicLabel(url));
      this.ui.closeSidebar();
    });
  }

  /** Rótulos para rotas com parâmetro (ex.: /companies/12/edit, /download/<id>). */
  private resolveDynamicLabel(url: string): string {
    if (url.startsWith('/companies/') && url.endsWith('/edit')) return 'Editar Empresa';
    if (url.startsWith('/download/')) return 'Acompanhamento';
    return this.routeLabels['/companies'];
  }

  toggleTheme(): void {
    this.ui.toggleTheme();
  }
}
