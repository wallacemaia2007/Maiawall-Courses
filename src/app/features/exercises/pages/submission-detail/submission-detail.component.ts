import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import {
  Answer,
  Exercise,
  getExerciseTypeLabel,
  MultipleChoiceQuestion,
  Submission,
  SubmissionFeedback,
  SUBMISSION_STATUS_LABELS,
} from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import { SubmissionService } from '../../services/submission.service';
import { formatDateTime } from '../../../../shared/utils/date.utils';
import { Attachment } from '../../../../core/models/attachment.model';

interface SubmissionDetailState {
  loading: boolean;
  errorMessage: string;
  submission: Submission | null;
  exercise: Exercise | null;
  questions: MultipleChoiceQuestion[];
  feedback: SubmissionFeedback | null;
}

interface AnswerView {
  kind: Answer['kind'];
  label: string;
  value: string;
}

@Component({
  selector: 'app-submission-detail',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent],
  templateUrl: './submission-detail.component.html',
  styleUrl: './submission-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmissionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly submissionService = inject(SubmissionService);
  private readonly exerciseService = inject(ExerciseService);

  private readonly reload$ = new Subject<void>();

  protected readonly state = toSignal(
    this.reload$.pipe(
      startWith(null),
      switchMap(() =>
        this.route.paramMap.pipe(
          switchMap((params) => {
            const id = params.get('id') ?? '';

            return forkJoin({
              submission: this.submissionService.getById(id),
              questions: this.submissionService
                .getById(id)
                .pipe(
                  switchMap((submission) =>
                    submission
                      ? this.exerciseService.getQuestions(submission.exerciseId)
                      : of([]),
                  ),
                )
                .pipe(catchError(() => of([]))),
              feedback: this.submissionService.getFeedback(id).pipe(catchError(() => of(null))),
            }).pipe(
              switchMap(({ submission, questions, feedback }) =>
                submission
                  ? this.exerciseService.getById(submission.exerciseId).pipe(
                      map((exercise) => ({
                        loading: false,
                        errorMessage: '',
                        submission,
                        exercise,
                        questions,
                        feedback,
                      })),
                    )
                  : of({
                      loading: false,
                      errorMessage: '',
                      submission: null,
                      exercise: null,
                      questions,
                      feedback,
                    }),
              ),
              catchError((error: unknown) =>
                of({
                  loading: false,
                  errorMessage: apiErrorMessage(
                    error,
                    'Não foi possível carregar a resposta. Tente novamente.',
                  ),
                  submission: null,
                  exercise: null,
                  questions: [],
                  feedback: null,
                }),
              ),
            );
          }),
        ),
      ),
    ),
    {
      initialValue: {
        loading: true,
        errorMessage: '',
        submission: null,
        exercise: null,
        questions: [],
        feedback: null,
      } satisfies SubmissionDetailState,
    },
  );

  protected readonly submission = computed(() => this.state().submission);

  protected readonly exercise = computed(() => this.state().exercise);

  protected readonly answers = computed<AnswerView[]>(() => {
    const submission = this.state().submission;
    if (!submission) {
      return [];
    }

    const mappedChoices = this.choiceWithLabels();

    return submission.answer.map((answer) => {
      switch (answer.kind) {
        case 'text':
          return { kind: answer.kind, label: 'Resposta', value: answer.value };
        case 'code':
          return {
            kind: answer.kind,
            label: 'Código',
            value: answer.value,
          };
        case 'choice': {
          const match = mappedChoices.find((item) => item.questionId === answer.questionId);
          if (match) {
            return {
              kind: answer.kind,
              label: `Questão ${match.questionIndex}`,
              value: `${match.statement} → ${match.optionLabel ?? 'sem opção'}`,
            };
          }
          return { kind: answer.kind, label: 'Questão', value: `Opção ${answer.optionId}` };
        }
        case 'boolean':
          return {
            kind: answer.kind,
            label: 'Resposta',
            value: answer.value ? 'Verdadeiro' : 'Falso',
          };
      }
    });
  });

  protected readonly choiceWithLabels = computed(() => {
    const questions = this.state().questions;
    const submission = this.state().submission;
    const answerChoices = submission?.answer.filter((answer) => answer.kind === 'choice') ?? [];

    return questions.map((question, index) => {
      const chosen = answerChoices.find((answer) => {
        if (answer.kind !== 'choice') {
          return false;
        }
        return answer.questionId === question.id;
      });

      let optionLabel: string | null = null;
      if (chosen?.kind === 'choice') {
        optionLabel = question.options.find((option) => option.id === chosen.optionId)?.label ?? null;
      }

      return {
        questionId: question.id,
        questionIndex: index + 1,
        statement: question.statement,
        optionId: chosen?.kind === 'choice' ? chosen.optionId : undefined,
        optionLabel,
      };
    });
  });

  protected getStatusLabel(status: Submission['status']): string {
    return SUBMISSION_STATUS_LABELS[status] ?? status;
  }

  protected getTypeLabel(type: Exercise['type']): string {
    return getExerciseTypeLabel(type);
  }

  protected formatSubmittedAt(): string {
    return formatDateTime(this.submission()?.submittedAt ?? this.submission()?.gradedAt);
  }

  protected formatGradedAt(): string {
    return formatDateTime(this.submission()?.gradedAt);
  }

  protected attachments(): Attachment[] {
    return this.submission()?.attachments ?? [];
  }

  protected trackAnswer(_index: number, answer: AnswerView): string {
    return `${answer.kind}-${_index}`;
  }

  protected trackAttachment(_index: number, attachment: Attachment): string {
    return attachment.id;
  }

  protected retry(): void {
    this.reload$.next();
  }
}