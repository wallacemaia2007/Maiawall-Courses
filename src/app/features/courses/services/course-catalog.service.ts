import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { CourseSummary } from '../models/course.model';
import { MockCourseService } from './mock-course.service';

/*
 * Contrato de acesso ao catálogo de cursos usado pela Home.
 *
 * Hoje a Home consome o `MockCourseService` (dados estáticos). Quando o
 * backend estiver pronto, basta trocar a factory do token
 * `COURSE_CATALOG_SERVICE` para retornar o `CourseService` da API — os
 * componentes não precisam mudar.
 */
export interface CourseCatalogService {
  getFeatured(limit?: number): Observable<CourseSummary[]>;
}

export const COURSE_CATALOG_SERVICE = new InjectionToken<CourseCatalogService>(
  'COURSE_CATALOG_SERVICE',
  {
    providedIn: 'root',
    factory: () => new MockCourseService(),
  },
);