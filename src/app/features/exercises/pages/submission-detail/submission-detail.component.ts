import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';

import { SubmissionService } from '../../services/submission.service';

@Component({
  selector: 'app-submission-detail',
  standalone: true,
  templateUrl: './submission-detail.component.html',
  styleUrl: './submission-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmissionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly submissionService = inject(SubmissionService);

  protected readonly submission$ = this.route.paramMap.pipe(
    switchMap((params) => this.submissionService.getById(params.get('id') ?? '')),
  );
}