import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  templateUrl: './confirm-delete-modal.component.html',
  styleUrl: './confirm-delete-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDeleteModalComponent {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly itemName = input<string>('');
  readonly confirmLabel = input('Excluir');
  readonly cancelLabel = input('Cancelar');
  readonly isOpen = input(true);
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}