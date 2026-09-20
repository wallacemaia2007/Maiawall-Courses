import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AlertBannerComponent } from '../../../../shared/ui/alert-banner/alert-banner.component';
import {
  Answer,
  Exercise,
  getExerciseTypeLabel,
  MultipleChoiceQuestion,
  Submission,
} from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import { SubmissionService } from '../../services/submission.service';
import { ExerciseProgress } from '../../../student/models/progress.model';
import { ProgressService } from '../../../student/services/progress.service';

interface ExerciseAnswerState {
  loading: boolean;
  errorMessage: string;
  exercise: Exercise | null;
  questions: MultipleChoiceQuestion[];
  latestSubmission: Submission | null;
  progress: ExerciseProgress | null;
}

@Component({
  selector: 'app-exercise-answer',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent, AlertBannerComponent],
  templateUrl: './exercise-answer.component.html',
  styleUrl: './exercise-answer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseAnswerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly exerciseService = inject(ExerciseService);
  private readonly submissionService = inject(SubmissionService);
  private readonly progressService = inject(ProgressService);
  private readonly notificationService = inject(NotificationService);

  private readonly reload$ = new Subject<void>();

  protected readonly submitting = signal(false);
  protected readonly selectedChoices = signal<Record<string, string>>({});
  protected readonly selectedRate = signal<'true' | 'false' | null>(null);
  protected readonly answerText = signal('');
  protected readonly codeLanguage = signal('javascript');

  protected readonly state = toSignal(
    this.reload$.pipe(
      startWith(null),
      switchMap(() =>
        this.route.paramMap.pipe(
          switchMap((params) => {
            const id = params.get('id') ?? '';

            return forkJoin({
              exercise: this.exerciseService.getById(id),
              questions: this.exerciseService.getQuestions(id).pipe(catchError(() => of([]))),
              submissions: this.submissionService
                .listByExercise(id)
                .pipe(catchError(() => of([]))),
              progress: this.progressService.listExerciseProgress().pipe(
                map((list) => list.find((item) => item.exerciseId === id) ?? null),
                catchError(() => of(null)),
              ),
            }).pipe(
              map(({ exercise, questions, submissions, progress }) => ({
                loading: false,
                errorMessage: '',
                exercise,
                questions,
                latestSubmission: this.latest(submissions),
                progress,
              })),
              catchError((error: unknown) =>
                of({
                  loading: false,
                  errorMessage: apiErrorMessage(
                    error,
                    'Não foi possível carregar o exercício. Tente novamente.',
                  ),
                  exercise: null,
                  questions: [],
                  latestSubmission: null,
                  progress: null,
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
        exercise: null,
        questions: [],
        latestSubmission: null,
        progress: null,
      } satisfies ExerciseAnswerState,
    },
  );

  protected readonly exercise = computed(() => this.state().exercise);

  protected readonly questions = computed(() => this.state().questions);

  protected readonly latestSubmission = computed(() => this.state().latestSubmission);

  protected readonly isAnswered = computed(() => {
    const progress = this.state().progress;
    return progress !== null && progress.status !== 'not-answered';
  });

  protected readonly answered = computed(() => {
    const questions = this.questions();
    if (questions.length === 0) {
      return true;
    }
    return questions.every((question) => this.selectedChoices()[question.id] !== undefined);
  });

  protected readonly canSubmit = computed(() => {
    if (this.submitting()) {
      return false;
    }

    const type = this.exercise()?.type;

    if (this.questions().length > 0) {
      return this.answered();
    }

    if (type === 'true-false') {
      return this.selectedRate() !== null;
    }

    return this.answerText().trim().length > 0;
  });

  protected selectChoice(questionId: string, optionId: string): void {
    this.selectedChoices.update((choices) => ({ ...choices, [questionId]: optionId }));
  }

  protected setRate(value: 'true' | 'false'): void {
    this.selectedRate.set(value);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  protected submit(): void {
    if (!this.canSubmit() || !this.exercise()) {
      return;
    }

    this.submitting.set(true);

    this.submissionService
      .submit({
        exerciseId: this.exercise()!.id,
        answer: this.buildAnswers(),
      })
      .subscribe({
        next: (submission) => {
          this.submitting.set(false);
          this.notificationService.success(
            'Resposta enviada',
            'Seu exercício foi recebido e aguarda correção.',
          );
          this.router.navigate(['/app/submissoes', submission.id]);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.notificationService.error(
            'Não foi possível enviar a resposta',
            apiErrorMessage(error, 'Tente novamente em instantes.'),
          );
        },
      });
  }

  protected getTypeLabel(type: Exercise['type']): string {
    return getExerciseTypeLabel(type);
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected trackQuestion(_index: number, question: MultipleChoiceQuestion): string {
    return question.id;
  }

  private buildAnswers(): Answer[] {
    const questions = this.questions();

    if (questions.length > 0) {
      return questions
        .filter((question) => this.selectedChoices()[question.id] !== undefined)
        .map(
          (question): Answer => ({
            kind: 'choice',
            questionId: question.id,
            optionId: this.selectedChoices()[question.id],
          }),
        );
    }

    const type = this.exercise()?.type;

    if (type === 'true-false') {
      const rate = this.selectedRate();
      return rate ? [{ kind: 'boolean', value: rate === 'true' }] : [];
    }

    const value = this.answerText().trim();

    if (type === 'code') {
      return [{ kind: 'code', language: this.codeLanguage(), value }];
    }

    return value ? [{ kind: 'text', value }] : [];
  }

  private latest(submissions: Submission[]): Submission | null {
    return [...submissions].sort((a, b) =>
      Date.parse(b.submittedAt ?? b.gradedAt ?? '') -
      Date.parse(a.submittedAt ?? a.gradedAt ?? ''),
    )[0] ?? null;
  }
}