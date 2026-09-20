import { CourseInstructor } from '../../features/courses/models/course.model';

/*
 * Instrutor por trás da Maiawall Cursos.
 *
 * Consumido pelo instructor-card (course-details / student-course-detail),
 * pela página Sobre e pelo SEO do course-list.
 */
export const COURSE_INSTRUCTOR: CourseInstructor = {
  id: 'wallace-maia',
  name: 'Wallace Maia',
  bio: 'Full-stack developer sob a marca MaiaWall, ensinando o que uso no dia a dia.',
  avatarUrl: '/assets/instructor.png',
  tagline: 'Sou o Wallace, e ensino o que eu mesmo uso no dia a dia.',
  bioParagraphs: [
    'Sou full-stack developer sob a marca MaiaWall e escrevo código que vai para produção: Angular (standalone components, signals, reactive forms) no front, e Spring Boot, Node.js/Express e NestJS no back, com AWS e Firebase na infra.',
    'Também sou estudante de Sistemas de Informação na UFU. Os cursos da Maiawall nascem da prática em projetos reais e de cliente — a mesma tecnologia, no mesmo contexto e na mesma sequência das aulas que ministro.',
  ],
  highlights: [
    'Angular',
    'Spring Boot',
    'Node.js / Express',
    'NestJS',
    'AWS',
    'Firebase',
  ],
  socialLinks: [
    { label: 'Site', url: 'https://maiawall.com', icon: 'site' },
    { label: 'GitHub', url: 'https://github.com/maiawall', icon: 'github' },
    { label: 'LinkedIn', url: 'https://linkedin.com/company/maiawall', icon: 'linkedin' },
  ],
};