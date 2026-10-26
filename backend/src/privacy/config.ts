import { z } from 'zod';

export function loadPrivacyConfig(input: Record<string, string | undefined>, environment: string) {
  const parsed = z
    .strictObject({
      approved: z.enum(['true', 'false']).default('false'),
      controller: z.string().trim().min(3).max(200).optional(),
      contact: z.email().max(254).optional(),
      retention: z.string().trim().min(20).max(2000).optional(),
      basis: z.string().trim().min(20).max(2000).optional(),
      healthBasis: z.string().trim().min(20).max(2000).optional(),
      healthUploads: z.enum(['true', 'false']).default('false'),
    })
    .safeParse({
      approved: input.PRIVACY_APPROVED,
      controller: input.PRIVACY_CONTROLLER,
      contact: input.PRIVACY_CONTACT_EMAIL,
      retention: input.PRIVACY_RETENTION_NOTICE,
      basis: input.PRIVACY_PROCESSING_BASIS,
      healthBasis: input.PRIVACY_HEALTH_BASIS,
      healthUploads: input.PRIVACY_HEALTH_UPLOADS_ENABLED,
    });
  if (!parsed.success) throw new Error('Configuracao invalida: PRIVACY');
  const value = parsed.data;
  const approved = value.approved === 'true';
  if (
    (environment === 'production' || approved) &&
    (!approved || !value.controller || !value.contact || !value.retention || !value.basis)
  )
    throw new Error(
      'Configuracao invalida: PRIVACY_APPROVED e politica institucional obrigatorias.',
    );
  if (value.healthUploads === 'true' && environment !== 'test' && (!approved || !value.healthBasis))
    throw new Error('Configuracao invalida: PRIVACY_HEALTH_BASIS e homologacao obrigatorias.');
  return {
    approved,
    controller: value.controller ?? null,
    contactEmail: value.contact ?? null,
    retentionNotice: value.retention ?? null,
    processingBasis: value.basis ?? null,
    healthBasis: value.healthBasis ?? null,
    healthUploads:
      value.healthUploads !== 'true'
        ? ('BLOCKED' as const)
        : environment === 'test'
          ? ('SYNTHETIC_ONLY' as const)
          : ('ENABLED' as const),
  };
}
export type PrivacyConfig = ReturnType<typeof loadPrivacyConfig>;
