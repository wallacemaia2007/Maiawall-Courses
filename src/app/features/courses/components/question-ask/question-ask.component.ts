import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthStateService } from '../../../../core/auth/auth-state.service';
import {
  GENERAL_QUESTION_COURSE_ID,
  GENERAL_QUESTION_COURSE_TITLE,
} from '../../../../core/constants/question.constants';
import { toApiError } from '../../../../core/models/api-error.model';
import { CourseSummary } from '../../models/course.model';
import { CourseQuestion } from '../../models/course-question.model';
import { CourseQuestionService } from '../../services/course-question.service';

let nextFieldId = 0;

/*
 * Campo para o aluno enviar uma duvida: mesmos campos do FAQ dos minicursos
 * (nome + duvida), com a escolha do minicurso — a pagina /duvidas reuni as
 * perguntas de varios cursos — e a opcao "Outras duvidas" para quem nao tem
 * um curso em mente. Exige login para identificar quem perguntou.
 */
@Component({
  selector: 'app-question-ask',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './question-ask.component.html',
  styleUrl: './question-ask.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionAskComponent {
  private readonly authState = inject(AuthStateService);
  private readonly questionService = inject(CourseQuestionService);

  /** Minicursos disponíveis no seletor (página /duvidas). */
  readonly courses = input<CourseSummary[]>([]);
  /** Minicurso fixo: usado na página do curso, que já sabe qual é. */
  readonly fixedCourseId = input<string | null>(null);
  readonly fixedCourseTitle = input('');
  readonly eyebrow = input('Não encontrou sua resposta?');
  readonly heading = input('Envie sua dúvida');
  /** Nível do título: 2 na página /duvidas, 3 dentro do FAQ do minicurso. */
  readonly headingLevel = input<2 | 3>(2);
  readonly description = input(
    'Escolha o minicurso e mande sua pergunta ao instrutor. Depois de respondida e publicada, ela poderá entrar nas dúvidas em destaque.',
  );
  readonly redirectPath = input('/duvidas');
  readonly sent = output<CourseQuestion>();

  protected readonly generalCourseId = GENERAL_QUESTION_COURSE_ID;
  protected readonly generalCourseTitle = GENERAL_QUESTION_COURSE_TITLE;
  protected readonly fieldId = `question-ask-${++nextFieldId}`;
  protected readonly headingId = `${this.fieldId}-title`;
  protected readonly isAuthenticated = this.authState.isAuthenticated;
  protected readonly submitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly form = new FormGroup({
    courseId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    authorName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    }),
    question: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(1000)],
    }),
  });

  constructor() {
    effect(() => {
      const name = this.authState.user()?.name ?? '';
      if (name && !this.form.controls.authorName.dirty) {
        this.form.controls.authorName.setValue(name);
      }
    });

    /* Na página do curso o minicurso já vem preenchido. */
    effect(() => {
      const fixedCourseId = this.fixedCourseId();
      if (fixedCourseId && !this.form.controls.courseId.dirty) {
        this.form.controls.courseId.setValue(fixedCourseId);
      }
    });
  }

  protected submit(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { courseId, authorName, question } = this.form.getRawValue();
    this.submitting.set(true);
    this.questionService.send(courseId, { authorName, question }).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.successMessage.set(
          'Sua dúvida foi enviada e aparecerá aqui depois de respondida e publicada.',
        );
        this.form.controls.question.reset('');
        this.sent.emit(created);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(toApiError(error).message);
      },
    });
  }
}
