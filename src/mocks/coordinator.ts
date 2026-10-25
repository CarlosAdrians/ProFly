/**
 * Coordenador fictício usado na demonstração (dados do protótipo da tela Conta).
 * O domínio .test é reservado e nunca corresponde a um e-mail real.
 */
export const demoCoordinator = {
  name: 'Felipe Araujo',
  role: 'Coordenador',
  email: 'felipe.araujo@profly.test',
  password: 'profly123',
  courseIds: ['direito'],
} as const;
