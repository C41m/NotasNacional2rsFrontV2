import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'companies' },

  {
    path: 'companies',
    loadComponent: () =>
      import('./components/company-list/company-list.component').then(m => m.CompanyListComponent)
  },
  {
    path: 'companies/new',
    loadComponent: () =>
      import('./components/company-form/company-form.component').then(m => m.CompanyFormComponent)
  },
  {
    path: 'companies/:id/edit',
    loadComponent: () =>
      import('./components/company-form/company-form.component').then(m => m.CompanyFormComponent)
  },
  {
    path: 'auditoria',
    loadComponent: () =>
      import('./components/auditoria/auditoria.component').then(m => m.AuditoriaComponent)
  },
  {
    path: 'documentos-fiscais',
    loadComponent: () =>
      import('./components/documentos-fiscais/documentos-fiscais.component').then(
        m => m.DocumentosFiscaisComponent
      )
  },
  {
    path: 'notas/visao-geral',
    loadComponent: () =>
      import('./components/notas-dashboard/notas-dashboard.component').then(m => m.NotasDashboardComponent)
  },
  {
    path: 'notas',
    loadComponent: () =>
      import('./components/notas-list/notas-list.component').then(m => m.NotasListComponent)
  },
  {
    path: 'download',
    loadComponent: () =>
      import('./components/download-form/download-form.component').then(m => m.DownloadFormComponent)
  },
  {
    path: 'download/:batchId',
    loadComponent: () => import('./components/progress/progress.component').then(m => m.ProgressComponent)
  },
  {
    path: 'batches',
    loadComponent: () =>
      import('./components/batch-list/batch-list.component').then(m => m.BatchListComponent)
  },

  { path: '**', redirectTo: 'companies' }
];
