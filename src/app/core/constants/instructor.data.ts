import { CourseInstructor } from '../../features/courses/models/course.model';

export const COURSE_INSTRUCTOR: CourseInstructor = {
  id: 'wallace-maia',
  name: 'Wallace Maia',
  bio: 'Full-stack Developer | Angular, Spring Boot, Node.js/Express, NestJS | AWS & Firebase',
  avatarUrl: '/assets/instructor.png',
  tagline: 'Wallace Maia',
  bioParagraphs: [
    'Sou full-stack developer sob a marca MaiaWall e escrevo código que vai para produção: Angular (standalone components, signals, reactive forms) no front, e Spring Boot, Node.js/Express e NestJS no back, com AWS e Firebase na infra.',
    'Também sou estudante de Sistemas de Informação na UFU. Os cursos da Maiawall nascem da prática em projetos reais e de cliente — a mesma tecnologia, no mesmo contexto e na mesma sequência das aulas que ministro.',
  ],
  highlights: ['Angular', 'Spring Boot', 'Node.js / Express', 'NestJS', 'AWS', 'Firebase'],
  socialLinks: [
    { label: 'Site', url: 'https://maiawall.com', icon: 'site' },
    { label: 'GitHub', url: 'https://github.com/maiawall', icon: 'github' },
    { label: 'LinkedIn', url: 'https://linkedin.com/company/maiawall', icon: 'linkedin' },
  ],
};
