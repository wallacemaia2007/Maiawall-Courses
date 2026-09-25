import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { toApiError } from '../../../../core/models/api-error.model';
import { CourseQuestion, CourseQuestionAuthor } from '../../../courses/models/course-question.model';
import { CourseQuestionService } from '../../../courses/services/course-question.service';
import { AdminUserProfileModalComponent } from '../../components/admin-user-profile-modal/admin-user-profile-modal.component';

type QuestionFilter = 'todas' | 'pendentes' | 'respondidas';

@Component({
  selector: 'app-admin-question-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, AdminUserProfileModalComponent],
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
  protected readonly starringId = signal<string | null>(null);
  protected readonly collapsed = signal<Record<string, boolean>>({});
  protected readonly filter = signal<QuestionFilter>('todas');
  protected readonly profileAuthor = signal<CourseQuestionAuthor | null>(null);

  protected readonly pendingCount = computed(
    () => this.questions().filter((question) => !question.answer).length,
  );
  protected readonly answeredCount = computed(
    () => this.questions().filter((question) => question.answer).length,
  );

  /* Em "pendentes", a dúvida recém-respondida continua na tela até trocar de filtro. */
  protected readonly visibleQuestions = computed(() => {
    const list = this.questions();
    switch (this.filter()) {
      case 'pendentes':
        return list.filter((question) => !question.answer || question.id === this.savedId());
      case 'respondidas':
        return list.filter((question) => question.answer);
      default:
        return list;
    }
  });

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

  protected isCollapsed(question: CourseQuestion): boolean {
    return this.collapsed()[question.id] ?? false;
  }

  protected toggleCollapsed(question: CourseQuestion): void {
    this.collapsed.update((current) => ({
      ...current,
      [question.id]: !(current[question.id] ?? false),
    }));
  }

  protected setPublished(questionId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    // Ao despublicar, a dúvida perde a condição de estrela.
    this.questions.update((items) =>
      items.map((item) =>
        item.id === questionId ? { ...item, published: checked } : item,
      ),
    );
  }

  protected save(question: CourseQuestion): void {
    const answer = this.answerControl(question);
    if (answer.invalid || this.savingId()) return;

    this.savingId.set(question.id);
    this.savedId.set(null);
    this.errorMessage.set('');
    this.questionService.answer(question.id, {
      answer: answer.value,
      published: question.published,
    }).subscribe({
      next: (updated) => {
        this.questions.update((items) =>
          items.map((item) => item.id === updated.id ? updated : item),
        );
        this.controls.get(question.id)?.setValue(updated.answer, { emitEvent: false });
        this.savingId.set(null);
        this.savedId.set(updated.id);
      },
      error: (error: unknown) => {
        this.savingId.set(null);
        this.errorMessage.set(toApiError(error).message);
      },
    });
  }

  protected authoredBy(question: CourseQuestion): CourseQuestionAuthor {
    if (question.author) {
      return question.author;
    }
    return {
      id: null,
      name: question.authorName,
      email: question.authorEmail ?? '',
      avatarUrl: null,
      questionsCount: 0,
    };
  }

  protected initials(author: CourseQuestionAuthor): string {
    const name = author.name?.trim();
    if (!name) return '?';
    const parts = name.split(/\s+/);
    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }

  protected openProfile(question: CourseQuestion): void {
    this.profileAuthor.set(this.authoredBy(question));
  }

  protected canStar(question: CourseQuestion): boolean {
    return Boolean(question.answer && question.published);
  }

  protected toggleStar(question: CourseQuestion): void {
    if (!this.canStar(question) || this.starringId()) return;

    this.starringId.set(question.id);
    this.errorMessage.set('');
    this.questionService.toggleFeatured(question.id, !question.featured).subscribe({
      next: (updated) => {
        this.questions.update((items) =>
          items.map((item) => item.id === updated.id ? updated : item),
        );
        this.starringId.set(null);
      },
      error: (error: unknown) => {
        this.starringId.set(null);
        this.errorMessage.set(toApiError(error).message);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.questionService.listForAdmin().subscribe({
      next: (questions) => {
        this.questions.set(questions);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }
}