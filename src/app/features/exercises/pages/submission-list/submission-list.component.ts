import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import {
  Answer,
  Exercise,
  getExerciseTypeLabel,
  Submission,
  SUBMISSION_STATUS_LABELS,
} from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import { SubmissionService } from '../../services/submission.service';

interface SubmissionListState {
  loading: boolean;
  errorMessage: string;
  submissions: Submission[];
  exercises: Exercise[];
}

interface SubmissionListItem {
  submission: Submission;
  exercise: Exercise | undefined;
}

@Component({
  selector: 'app-submission-list',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent],
  templateUrl: './submission-list.component.html',
  styleUrl: './submission-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmissionListComponent {
  private readonly submissionService = inject(SubmissionService);
  private readonly exerciseService = inject(ExerciseService);

  private readonly reload$ = new Subject<void>();

  protected readonly state = toSignal(
    this.reload$.pipe(
      startWith(null),
      switchMap(() =>
        forkJoin({
          submissions: this.submissionService.listMine(),
          exercises: this.exerciseService.listMine().pipe(catchError(() => of([]))),
        }).pipe(
          map(({ submissions, exercises }) => ({
            loading: false,
            errorMessage: '',
            submissions,
            exercises,
          })),
          catchError((error: unknown) =>
            of({
              loading: false,
              errorMessage: apiErrorMessage(
                error,
                'Não foi possível carregar as respostas. Tente novamente.',
              ),
              submissions: [],
              exercises: [],
            }),
          ),
        ),
      ),
    ),
    {
      initialValue: {
        loading: true,
        errorMessage: '',
        submissions: [],
        exercises: [],
      } satisfies SubmissionListState,
    },
  );

  protected readonly items = computed<SubmissionListItem[]>(() => {
    const exercisesById = new Map(this.state().exercises.map((exercise) => [exercise.id, exercise]));

    return [...this.state().submissions]
      .sort(
        (a, b) =>
          Date.parse(b.submittedAt ?? b.gradedAt ?? '') -
          Date.parse(a.submittedAt ?? a.gradedAt ?? ''),
      )
      .map((submission) => ({
        submission,
        exercise: exercisesById.get(submission.exerciseId),
      }));
  });

  protected getStatusLabel(status: Submission['status']): string {
    return SUBMISSION_STATUS_LABELS[status] ?? status;
  }

  protected getTypeLabel(type: Exercise['type']): string {
    return getExerciseTypeLabel(type);
  }

  protected answerSummary(submission: Submission): string {
    const parts = submission.answer.map((answer) => this.renderAnswer(answer)).filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Sem conteúdo';
  }

  protected trackItem(_index: number, item: SubmissionListItem): string {
    return item.submission.id;
  }

  protected retry(): void {
    this.reload$.next();
  }

  private renderAnswer(answer: Answer): string {
    switch (answer.kind) {
      case 'text':
        return this.clamp(answer.value, 70);
      case 'code':
        return this.clamp(answer.value, 40);
      case 'choice':
        return `Questão ${answer.questionId.slice(0, 8)}`;
      case 'boolean':
        return answer.value ? 'Verdadeiro' : 'Falso';
    }
  }

  private clamp(value: string, maxLength: number): string {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned;
  }
}