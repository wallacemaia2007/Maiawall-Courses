import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-password-change-modal',
  standalone: true,
  templateUrl: './password-change-modal.component.html',
  styleUrl: './password-change-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordChangeModalComponent {
  readonly isOpen = input(true);
  readonly busy = input(false);

  readonly closed = output<void>();
  readonly saved = output<void>();

  private readonly userService = inject(UserService);
}