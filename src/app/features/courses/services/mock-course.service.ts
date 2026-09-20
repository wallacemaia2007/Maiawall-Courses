import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { CourseSummary } from '../models/course.model';
import { CourseCatalogService } from './course-catalog.service';

/*
 * Fonte de dados mockada do catálogo (Home).
 * Substituir pelo `CourseService` real quando a API de cursos estiver conectada.
 */
@Injectable({ providedIn: 'root' })
export class MockCourseService implements CourseCatalogService {
  private readonly featured: CourseSummary[] = [
    {
      id: 'c1',
      title: 'Docker Compose na Prática',
      slug: 'docker-compose-na-pratica',
      shortDescription:
        'Subir ambientes com múltiplos serviços nunca foi tão simples. Aprenda a definir e orquestrar containers com Docker Compose.',
      category: 'devops',
      level: 'iniciante',
      durationMinutes: 48,
      instructorName: 'Wallace Maia',
      chapterCount: 6,
    },
    {
      id: 'c2',
      title: 'APIs, Métodos HTTP e JSON',
      slug: 'apis-metodos-http-e-json',
      shortDescription:
        'Entenda como as APIs funcionam por dentro: métodos HTTP, status codes, JSON e boas práticas para consumir serviços.',
      category: 'backend',
      level: 'iniciante',
      durationMinutes: 36,
      instructorName: 'Wallace Maia',
      chapterCount: 5,
    },
    {
      id: 'c3',
      title: 'Git para Iniciantes',
      slug: 'git-para-iniciantes',
      shortDescription:
        'Versionamento sem medo. Aprenda os comandos essenciais do Git e organize seu código com segurança.',
      category: 'desenvolvimento',
      level: 'iniciante',
      durationMinutes: 55,
      instructorName: 'Wallace Maia',
      chapterCount: 7,
    },
  ];

  getFeatured(limit = 3): Observable<CourseSummary[]> {
    return of(this.featured.slice(0, limit));
  }
}
