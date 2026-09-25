import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';

import { CourseQuestionAuthor } from '../../../courses/models/course-question.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-admin-user-profile-modal',
  standalone: true,
  imports: [DatePipe, ModalComponent],
  templateUrl: './admin-user-profile-modal.component.html',
  styleUrl: './admin-user-profile-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserProfileModalComponent {
  readonly author = input<CourseQuestionAuthor | null>(null);
  readonly isOpen = input(true);

  readonly closed = output<void>();

  protected initials(author: CourseQuestionAuthor | null): string {
    const name = author?.name?.trim();
    if (!name) return '?';
    const parts = name.split(/\s+/);
    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }

  protected emailHref(author: CourseQuestionAuthor | null): string {
    return `mailto:${author?.email ?? ''}`;
  }
}