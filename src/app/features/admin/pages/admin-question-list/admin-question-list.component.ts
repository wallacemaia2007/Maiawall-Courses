import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { toApiError } from '../../../../core/models/api-error.model';
import { CourseQuestion } from '../../../courses/models/course-question.model';
import { CourseQuestionService } from '../../../courses/services/course-question.service';

@Component({
  selector: 'app-admin-question-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-question-list.component.html',
  styleUrl: './admin-question-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQuestionListComponent implements OnInit {
  private readonly questionService = inject(CourseQuestionService);
  private readonly controls = new Map<string, FormControl<string>>();

  protected readonly questions = signal<CourseQuestion[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly savingId = signal<string | null>(null);
  protected readonly savedId = signal<string | null>(null);
  protected readonly publication = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.load();
  }

  protected answerControl(question: CourseQuestion): FormControl<string> {
    let control = this.controls.get(question.id);
    if (!control) {
      control = new FormControl(question.answer, {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(2000)],
      });
      this.controls.set(question.id, control);
    }
    return control;
  }

  protected setPublished(questionId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.publication.update((current) => ({ ...current, [questionId]: checked }));
  }

  protected save(question: CourseQuestion): void {
    const answer = this.answerControl(question);
    if (answer.invalid || this.savingId()) return;

    this.savingId.set(question.id);
    this.savedId.set(null);
    this.errorMessage.set('');
    this.questionService.answer(question.id, {
      answer: answer.value,
      published: this.publication()[question.id] ?? question.published,
    }).subscribe({
      next: (updated) => {
        this.questions.update((items) =>
          items.map((item) => item.id === updated.id ? updated : item),
        );
        this.publication.update((current) => ({ ...current, [updated.id]: updated.published }));
        this.savingId.set(null);
        this.savedId.set(updated.id);
      },
      error: (error: unknown) => {
        this.savingId.set(null);
        this.errorMessage.set(toApiError(error).message);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.questionService.listForAdmin().subscribe({
      next: (questions) => {
        this.questions.set(questions);
        this.publication.set(
          Object.fromEntries(questions.map((question) => [question.id, question.published])),
        );
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }
}
