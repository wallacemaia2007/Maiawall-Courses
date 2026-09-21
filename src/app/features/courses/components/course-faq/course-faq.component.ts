import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { toApiError } from '../../../../core/models/api-error.model';
import { CourseFaqItem } from '../../models/course.model';
import { CourseQuestion } from '../../models/course-question.model';
import { CourseQuestionService } from '../../services/course-question.service';

@Component({
  selector: 'app-course-faq',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './course-faq.component.html',
  styleUrl: './course-faq.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseFaqComponent {
  private readonly authState = inject(AuthStateService);
  private readonly questionService = inject(CourseQuestionService);

  readonly courseId = input.required<string>();
  readonly courseSlug = input.required<string>();
  readonly items = input<CourseFaqItem[]>([]);

  protected readonly isAuthenticated = this.authState.isAuthenticated;
  protected readonly publishedQuestions = signal<CourseQuestion[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly form = new FormGroup({
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

    effect((onCleanup) => {
      const courseId = this.courseId();
      this.loading.set(true);
      const subscription = this.questionService.listPublished(courseId).subscribe({
        next: (questions) => {
          this.publishedQuestions.set(questions);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected submit(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.questionService.send(this.courseId(), this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Sua dúvida foi enviada e aparecerá aqui depois de respondida e publicada.');
        this.form.controls.question.reset('');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(toApiError(error).message);
      },
    });
  }
}
