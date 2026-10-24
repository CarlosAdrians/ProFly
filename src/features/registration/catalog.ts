/** Catálogo ilustrativo da demonstração. A API institucional é a fonte na integração. */
export const courses = [
  {
    id: 'direito',
    name: 'Direito',
    subjects: [
      'Direito Civil I',
      'Direito Penal I',
      'Direito Constitucional I',
      'Direito Administrativo',
    ],
  },
  {
    id: 'sistemas',
    name: 'Sistemas de Informação',
    subjects: [
      'Algoritmos e Programação',
      'Banco de Dados',
      'Engenharia de Software',
      'Redes de Computadores',
    ],
  },
  {
    id: 'administracao',
    name: 'Administração',
    subjects: ['Gestão de Pessoas', 'Marketing', 'Finanças', 'Empreendedorismo'],
  },
  {
    id: 'enfermagem',
    name: 'Enfermagem',
    subjects: ['Saúde Coletiva', 'Anatomia', 'Fundamentos de Enfermagem'],
  },
] as const;
export const knowledgeOptions = [
  'Direito Civil',
  'Direito Penal',
  'Direito Constitucional',
  'Direito Administrativo',
  'Programação',
  'Banco de Dados',
  'Engenharia de Software',
  'Redes',
  'Gestão',
  'Marketing',
  'Finanças',
  'Saúde Coletiva',
  'Anatomia',
  'Didática e Metodologias de Ensino',
];
export const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const degreeOptions = [
  'Graduação',
  'Especialização',
  'Mestrado',
  'Doutorado',
  'Pós-doutorado',
];
