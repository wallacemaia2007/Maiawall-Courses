import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { toApiError } from '../../../../core/models/api-error.model';
import { ConfirmDeleteModalComponent } from '../../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { AdminAccessEntry } from '../../models/admin.model';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-access-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ConfirmDeleteModalComponent],
  templateUrl: './admin-access-list.component.html',
  styleUrl: './admin-access-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAccessListComponent {
  private readonly adminService = inject(AdminService);

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  protected readonly admins = signal<AdminAccessEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly toRevoke = signal<AdminAccessEntry | null>(null);

  constructor() {
    this.load();
  }

  protected grant(): void {
    if (this.email.invalid || this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.adminService.grantAccess(this.email.value.trim()).subscribe({
      next: (entry) => {
        this.admins.update((list) =>
          list.some((item) => item.id === entry.id) ? list : [...list, entry],
        );
        this.successMessage.set(`${entry.name} agora pode acessar o painel.`);
        this.email.reset('');
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.saving.set(false);
      },
    });
  }

  protected confirmRevoke(): void {
    const entry = this.toRevoke();
    if (!entry || this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.adminService.revokeAccess(entry.id).subscribe({
      next: () => {
        this.admins.update((list) => list.filter((item) => item.id !== entry.id));
        this.successMessage.set(`${entry.name} não acessa mais o painel.`);
        this.toRevoke.set(null);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.toRevoke.set(null);
        this.saving.set(false);
      },
    });
  }

  private load(): void {
    this.adminService.accessList().subscribe({
      next: (admins) => {
        this.admins.set(admins);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }
}
