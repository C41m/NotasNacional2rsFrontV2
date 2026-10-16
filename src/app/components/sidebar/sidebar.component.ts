// src/app/components/sidebar/sidebar.component.ts
import { Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  /** Emitido ao navegar — o shell fecha a sidebar no mobile. */
  readonly navigate = output<void>();

  readonly items: NavItem[] = [
    { label: 'Empresas', path: '/companies', icon: 'pi pi-building' },
    { label: 'Auditoria', path: '/auditoria', icon: 'pi pi-verified' },
    { label: 'Documentos Fiscais', path: '/documentos-fiscais', icon: 'pi pi-folder-open' },
    { label: 'Download NFSe', path: '/download', icon: 'pi pi-download' },
    { label: 'Downloads Ativos', path: '/batches', icon: 'pi pi-sync' }
  ];
}
