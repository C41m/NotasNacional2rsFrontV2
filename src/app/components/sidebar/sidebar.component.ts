// src/app/components/sidebar/sidebar.component.ts
import { Component, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
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

  readonly envLabel = environment.production ? 'Produção' : 'Desenvolvimento';

  private readonly openGroups = signal<Set<string>>(new Set(['Notas', 'Auditoria']));

  isGroupOpen(label: string): boolean {
    return this.openGroups().has(label);
  }

  toggleGroup(label: string): void {
    const next = new Set(this.openGroups());
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    this.openGroups.set(next);
  }

  readonly groups: NavGroup[] = [
    {
      label: 'Notas',
      items: [
        { label: 'Empresas', path: '/companies', icon: 'pi pi-building' },
        { label: 'Download NFSe', path: '/download', icon: 'pi pi-download' },
        { label: 'Downloads Ativos', path: '/batches', icon: 'pi pi-sync' }
      ]
    },
    {
      label: 'Auditoria',
      items: [
        { label: 'Auditoria', path: '/auditoria', icon: 'pi pi-verified' },
        { label: 'Documentos Fiscais', path: '/documentos-fiscais', icon: 'pi pi-file' }
      ]
    }
  ];
}
