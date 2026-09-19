import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { SubmissionService } from '../../services/submission.service';

@Component({
  selector: 'app-submission-list',
  standalone: true,
  templateUrl: './submission-list.component.html',
  styleUrl: './submission-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmissionListComponent {
  private readonly submissionService = inject(SubmissionService);

  protected readonly submissions$ = this.submissionService.listMine();
}