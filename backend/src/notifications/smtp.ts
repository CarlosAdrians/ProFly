import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import type { Notifications } from '../identity/models.js';
import type { MailConfig } from './config.js';

export function smtpOptions(config: MailConfig): SMTPTransport.Options {
  return {
    host: config.host,
    port: config.port,
    auth: config.auth,
    secure: config.security === 'implicit',
    requireTLS: config.security === 'starttls',
    ignoreTLS: config.security === 'plain',
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function createSmtpNotifications(config: MailConfig | undefined): Notifications | undefined {
  if (!config) return undefined;
  const transport = nodemailer.createTransport(smtpOptions(config));
  return {
    async send(message) {
      if (
        !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(message.email) ||
        !/^[a-f0-9]{64}$/.test(message.token) ||
        !['VERIFY_EMAIL', 'RESET'].includes(message.purpose)
      )
        throw new Error('Mensagem de acesso invalida.');
      const verification = message.purpose === 'VERIFY_EMAIL';
      const action = verification ? 'Confirmar meu e-mail' : 'Redefinir minha senha';
      const link = new URL(
        verification ? '/verificar-email' : '/redefinir-senha',
        config.appOrigin,
      );
      // Fragments keep bearer tokens out of HTTP paths, access logs and Referer headers.
      link.hash = new URLSearchParams({ token: message.token }).toString();
      const explanation = verification
        ? 'Confirme seu e-mail para continuar seu cadastro no ProFly. Isso não aprova sua entrada em nenhum curso; cada coordenação analisa sua solicitação.'
        : 'Recebemos uma solicitação para redefinir sua senha no ProFly. Se você não solicitou, ignore este e-mail; sua senha continua a mesma.';
      const lifetime =
        'Este link é de uso único e expira em até 1 hora. Um novo pedido pode invalidar este link.';
      try {
        const result = await transport.sendMail({
          from: { name: 'ProFly', address: config.from },
          to: { address: message.email, name: '' },
          subject: `ProFly - ${action}`,
          text: `${explanation}\n\n${action}: ${link.href}\n\n${lifetime}`,
          html: `<div lang="pt-BR" style="font-family:Arial,sans-serif;line-height:1.6;color:#252b35;max-width:560px;margin:auto;padding:24px"><h1 style="font-size:24px">${action}</h1><p>${explanation}</p><p><a href="${link.href}" style="display:inline-block;background:#21499b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${action}</a></p><p>${lifetime}</p><p>ProFly · Gestão docente</p></div>`,
        });
        if (result.accepted.length !== 1 || result.rejected.length)
          throw new Error('SMTP rejeitou o destinatario.');
      } catch {
        throw new Error('Servico de envio indisponivel.');
      }
    },
  };
}
