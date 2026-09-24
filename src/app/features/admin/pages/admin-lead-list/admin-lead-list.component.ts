import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { toApiError } from '../../../../core/models/api-error.model';
import { ConfirmDeleteModalComponent } from '../../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { LEAD_STATUSES, Lead, LeadPayload, LeadStatus } from '../../models/admin.model';
import { AdminService } from '../../services/admin.service';

type StatusFilter = 'todos' | LeadStatus;

const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  convertido: 'Convertido',
  descartado: 'Descartado',
};

/* <input type="date"> trabalha com data local; o backend guarda um instante. */
function toDateInput(value: string | Date): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/* Meio-dia local evita o dia "voltar" ao converter para UTC (ex.: Brasil, UTC-3). */
function fromDateInput(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toISOString();
}

@Component({
  selector: 'app-admin-lead-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ConfirmDeleteModalComponent],
  templateUrl: './admin-lead-list.component.html',
  styleUrl: './admin-lead-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLeadListComponent {
  private readonly adminService = inject(AdminService);

  protected readonly statuses = LEAD_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(120)],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    source: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    medium: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(60)] }),
    campaign: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    status: new FormControl<LeadStatus>('novo', { nonNullable: true }),
    capturedAt: new FormControl(toDateInput(new Date()), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });

  protected readonly leads = signal<Lead[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly toDelete = signal<Lead | null>(null);
  protected readonly filter = signal<StatusFilter>('todos');

  protected readonly filtered = computed(() => {
    const filter = this.filter();
    return filter === 'todos' ? this.leads() : this.leads().filter((lead) => lead.status === filter);
  });

  protected readonly counts = computed(() => {
    const counts: Record<StatusFilter, number> = {
      todos: this.leads().length,
      novo: 0,
      contatado: 0,
      convertido: 0,
      descartado: 0,
    };
    for (const lead of this.leads()) counts[lead.status] += 1;
    return counts;
  });

  protected readonly conversionRate = computed(() => {
    const total = this.leads().length;
    return total === 0 ? 0 : Math.round((this.counts().convertido / total) * 100);
  });

  protected readonly topSources = computed(() => {
    const bySource = new Map<string, number>();
    for (const lead of this.leads()) {
      bySource.set(lead.source, (bySource.get(lead.source) ?? 0) + 1);
    }
    return [...bySource.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([source, total]) => ({ source, total }));
  });

  constructor() {
    this.adminService.leads().subscribe({
      next: (leads) => {
        this.leads.set(leads);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: LeadPayload = { ...value, capturedAt: fromDateInput(value.capturedAt) };
    const editingId = this.editingId();

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const request$ = editingId
      ? this.adminService.updateLead(editingId, payload)
      : this.adminService.createLead(payload);

    request$.subscribe({
      next: (lead) => {
        this.leads.update((list) =>
          editingId
            ? list.map((item) => (item.id === lead.id ? lead : item))
            : [lead, ...list],
        );
        this.sortLeads();
        this.successMessage.set(editingId ? 'Lead atualizado.' : 'Lead salvo.');
        this.resetForm();
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.saving.set(false);
      },
    });
  }

  protected edit(lead: Lead): void {
    this.editingId.set(lead.id);
    this.successMessage.set('');
    this.form.reset({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      medium: lead.medium,
      campaign: lead.campaign,
      status: lead.status,
      capturedAt: toDateInput(lead.capturedAt),
      notes: lead.notes,
    });
    document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected changeStatus(lead: Lead, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as LeadStatus;
    if (status === lead.status) return;

    this.errorMessage.set('');
    this.adminService.updateLead(lead.id, { status }).subscribe({
      next: (updated) =>
        this.leads.update((list) => list.map((item) => (item.id === updated.id ? updated : item))),
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        // Volta o <select> para o valor real (o do servidor).
        (event.target as HTMLSelectElement).value = lead.status;
      },
    });
  }

  protected confirmDelete(): void {
    const lead = this.toDelete();
    if (!lead || this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set('');
    this.adminService.deleteLead(lead.id).subscribe({
      next: () => {
        this.leads.update((list) => list.filter((item) => item.id !== lead.id));
        if (this.editingId() === lead.id) this.resetForm();
        this.toDelete.set(null);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.toDelete.set(null);
        this.saving.set(false);
      },
    });
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ status: 'novo', capturedAt: toDateInput(new Date()) });
  }

  private sortLeads(): void {
    this.leads.update((list) =>
      [...list].sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()),
    );
  }
}
