import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar.component';

/*
 * ViewEncapsulation.None de propósito: as classes `.adm-*` deste layout são o
 * kit visual compartilhado das páginas do admin (cards, tabelas, badges,
 * formulários), evitando repetir o mesmo CSS em cada página.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, AdminSidebarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AdminLayoutComponent {}
