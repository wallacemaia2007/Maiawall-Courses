import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, map, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { toApiError } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { CourseCardComponent } from '../../components/course-card/course-card.component';
import {
  CourseSummary,
  getCourseCategoryLabel,
  getCourseLevelLabel,
} from '../../models/course.model';
import { CourseService } from '../../services/course.service';

type DurationFilter = 'todos' | 'curto' | 'medio' | 'longo';

interface CourseListState {
  courses: CourseSummary[];
  loading: boolean;
  errorMessage: string;
}

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [
    FormsModule,
    CourseCardComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseListComponent {
  private readonly courseService = inject(CourseService);

  protected readonly search = signal('');
  protected readonly category = signal('todos');
  protected readonly level = signal('todos');
  protected readonly duration = signal<DurationFilter>('todos');

  protected readonly state = toSignal(
    this.courseService.list({ size: 100 }).pipe(
      map((page) => ({
        courses: page.content,
        loading: false,
        errorMessage: '',
      })),
      catchError((error: unknown) =>
        of({
          courses: [],
          loading: false,
          errorMessage: toApiError(error).message,
        }),
      ),
    ),
    {
      initialValue: {
        courses: [],
        loading: true,
        errorMessage: '',
      } satisfies CourseListState,
    },
  );

  protected readonly categories = computed(() =>
    this.uniqueValues(this.state().courses.map((course) => course.category).filter(Boolean)),
  );

  protected readonly levels = computed(() =>
    this.uniqueValues(this.state().courses.map((course) => course.level).filter(Boolean)),
  );

  protected readonly filteredCourses = computed(() => {
    const searchTerm = this.normalize(this.search());
    const category = this.category();
    const level = this.level();
    const duration = this.duration();

    return this.state().courses.filter((course) => {
      const matchesText =
        searchTerm === '' ||
        this.normalize(
          `${course.title} ${course.shortDescription ?? ''} ${course.instructorName}`,
        ).includes(searchTerm);

      const matchesCategory = category === 'todos' || course.category === category;
      const matchesLevel = level === 'todos' || course.level === level;
      const matchesDuration = this.matchesDuration(course.durationMinutes, duration);
      return matchesText && matchesCategory && matchesLevel && matchesDuration;
    });
  });

  protected readonly hasActiveFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.category() !== 'todos' ||
      this.level() !== 'todos' ||
      this.duration() !== 'todos',
  );

  protected getCategoryLabel(category: string): string {
    return getCourseCategoryLabel(category);
  }

  protected getLevelLabel(level: string): string {
    return getCourseLevelLabel(level);
  }

  protected resetFilters(): void {
    this.search.set('');
    this.category.set('todos');
    this.level.set('todos');
    this.duration.set('todos');
  }

  private matchesDuration(minutes: number | undefined, filter: DurationFilter): boolean {
    if (filter === 'todos') {
      return true;
    }

    if (!minutes) {
      return false;
    }

    if (filter === 'curto') {
      return minutes <= 60;
    }

    if (filter === 'medio') {
      return minutes > 60 && minutes <= 180;
    }

    return minutes > 180;
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private uniqueValues(values: (string | undefined)[]): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  }
}
