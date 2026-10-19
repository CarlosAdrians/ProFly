import { buildWhatsAppUrl, COORDINATOR_WHATSAPP } from './registrationRequest';

describe('solicitação de cadastro pelo WhatsApp', () => {
  it('usa o número do coordenador no formato internacional', () => {
    expect(COORDINATOR_WHATSAPP).toBe('5583986693221');
  });

  it('codifica acentos, espaços e pontuação da mensagem', () => {
    expect(buildWhatsAppUrl('5583986693221', 'Olá! Como posso prosseguir?')).toBe(
      'https://wa.me/5583986693221?text=Ol%C3%A1!%20Como%20posso%20prosseguir%3F',
    );
  });
});
