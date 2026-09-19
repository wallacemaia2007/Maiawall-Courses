import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { SubmissionService } from '../../../exercises/services/submission.service';

@Component({
  selector: 'app-admin-submission-list',
  standalone: true,
  templateUrl: './admin-submission-list.component.html',
  styleUrl: './admin-submission-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSubmissionListComponent {
  private readonly submissionService = inject(SubmissionService);

  protected readonly submissions$ = this.submissionService.listAll();
}