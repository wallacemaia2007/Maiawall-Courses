import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CourseCardComponent } from '../../../courses/components/course-card/course-card.component';
import {
  COURSE_CATALOG_SERVICE,
  CourseCatalogService,
} from '../../../courses/services/course-catalog.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../section-head/section-head.component';

@Component({
  selector: 'app-featured-courses',
  standalone: true,
  imports: [AsyncPipe, CourseCardComponent, RouterLink, RevealDirective, SectionHeadComponent],
  templateUrl: './featured-courses.component.html',
  styleUrl: './featured-courses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturedCoursesComponent {
  private readonly catalog: CourseCatalogService = inject(COURSE_CATALOG_SERVICE);

  protected readonly courses$ = this.catalog.getFeatured(3);
}