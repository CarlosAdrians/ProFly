/**
 * Solicitação de cadastro: o professor fala com o coordenador pelo WhatsApp.
 * Nenhum dado é enviado pelo ProFly; o link apenas abre a conversa.
 */

/** Telefone do coordenador no formato internacional (55 + DDD 83 + número). */
export const COORDINATOR_WHATSAPP = '5583986693221';

export const REGISTRATION_REQUEST_MESSAGE =
  'Olá! Sou professor e gostaria de solicitar meu cadastro no ProFly para ter acesso ao sistema. Como posso prosseguir?';

/** Link wa.me: funciona no celular (aplicativo) e no desktop (WhatsApp Web/aplicativo). */
export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export const registrationRequestUrl = buildWhatsAppUrl(
  COORDINATOR_WHATSAPP,
  REGISTRATION_REQUEST_MESSAGE,
);
