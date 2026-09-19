import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';

import { ExerciseService } from '../../services/exercise.service';
import { SubmissionService } from '../../services/submission.service';

@Component({
  selector: 'app-exercise-answer',
  standalone: true,
  templateUrl: './exercise-answer.component.html',
  styleUrl: './exercise-answer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseAnswerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly exerciseService = inject(ExerciseService);
  private readonly submissionService = inject(SubmissionService);

  protected readonly data$ = this.route.paramMap.pipe(
    switchMap((params) => {
      const id = params.get('id') ?? '';
      return forkJoin({
        exercise: this.exerciseService.getById(id),
        questions: this.exerciseService.getQuestions(id),
      });
    }),
  );
}