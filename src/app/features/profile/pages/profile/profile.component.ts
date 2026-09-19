import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly userService = inject(UserService);

  protected readonly user$ = this.userService.getCurrentUser();
  protected readonly currentUser = this.userService.currentUser;
}