import { createServer, type Socket } from 'node:net';
import { once } from 'node:events';

/** Captures only synthetic mail on an ephemeral loopback port; never relays it. */
export async function smtpFixture() {
  const state = { rejectRecipients: false, messages: [] as string[], recipients: [] as string[] };
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.once('close', () => sockets.delete(socket));
    socket.setEncoding('utf8');
    let buffer = '';
    let data = false;
    let body: string[] = [];
    socket.write('220 loopback.test ESMTP\r\n');
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      let index: number;
      while ((index = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (data) {
          if (line === '.') {
            state.messages.push(body.join('\r\n'));
            body = [];
            data = false;
            socket.write('250 2.0.0 captured\r\n');
          } else body.push(line.replace(/^\.\./, '.'));
        } else if (/^(EHLO|HELO) /i.test(line))
          socket.write('250-loopback.test\r\n250 8BITMIME\r\n');
        else if (/^RCPT TO:/i.test(line)) {
          if (state.rejectRecipients) socket.write('550 5.1.1 synthetic-private-detail\r\n');
          else {
            state.recipients.push(line);
            socket.write('250 2.1.5 ok\r\n');
          }
        } else if (line === 'DATA') {
          data = true;
          socket.write('354 send data\r\n');
        } else if (line === 'QUIT') socket.end('221 bye\r\n');
        else socket.write('250 ok\r\n');
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('SMTP fixture unavailable');
  return {
    ...state,
    state,
    port: address.port,
    async close() {
      const closed = once(server, 'close');
      for (const socket of sockets) socket.destroy();
      server.close();
      await closed;
    },
  };
}
