/// <reference types="node" />
import { webcrypto } from 'node:crypto';
import { vi } from 'vitest';
import { registrationFixture, TEST_PASSWORD } from '../../test/registrationFixture';
import { registerDemo, listDemoProfiles } from '../registration/demoService';
import { authenticate } from '../auth/services/authService';
import { getAccount, updateAccount } from './services/accountService';
import { readPhoto, savePhoto } from './photos';
import { demoCoordinator } from '../../mocks/coordinator';
it('muda e-mail docente sem perder solicitacoes, senha e foto; rejeita o acesso antigo', async () => {
  vi.stubGlobal('crypto', webcrypto);
  const data = registrationFixture();
  await registerDemo(data, TEST_PASSWORD, TEST_PASSWORD, true, true);
  savePhoto(data.email, 'data:image/png;base64,AA==');
  const before = listDemoProfiles()[0];
  await updateAccount(data.email, {
    name: 'Nome Atualizado',
    email: 'novo.docente@profly.test',
    phone: '(83) 99999-1111',
  });
  const current = listDemoProfiles()[0];
  expect(current.id).toBe(before.id);
  expect(current.requests).toEqual(before.requests);
  expect(readPhoto(current.email)).toBe('data:image/png;base64,AA==');
  expect(readPhoto(data.email)).toBeUndefined();
  await expect(authenticate(data.email, TEST_PASSWORD)).rejects.toThrow(/inválidos/);
  expect(await authenticate(current.email, TEST_PASSWORD)).toMatchObject({
    name: 'Nome Atualizado',
    email: current.email,
    role: 'teacher',
  });
  expect((await getAccount(current)).phone).toBe('83999991111');
});
it('coordenador usa o e-mail atualizado no proximo login e preserva seu perfil', async () => {
  await updateAccount(demoCoordinator.email, {
    name: demoCoordinator.name,
    email: 'coord.novo@profly.test',
    phone: '83999991111',
  });
  await expect(authenticate(demoCoordinator.email, demoCoordinator.password)).rejects.toThrow();
  expect(await authenticate('coord.novo@profly.test', demoCoordinator.password)).toMatchObject({
    role: 'coordinator',
    email: 'coord.novo@profly.test',
  });
});
it('nao altera perfil ou foto com e-mail duplicado, contato invalido ou falha de persistencia', async () => {
  vi.stubGlobal('crypto', webcrypto);
  const data = registrationFixture();
  await registerDemo(data, TEST_PASSWORD, TEST_PASSWORD, true, true);
  const before = JSON.stringify(listDemoProfiles());
  await expect(
    updateAccount(data.email, { name: data.name, email: demoCoordinator.email }),
  ).rejects.toThrow(/outra conta/);
  await expect(updateAccount(data.email, { name: data.name, phone: '12' })).rejects.toThrow(
    /telefone/,
  );
  const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  await expect(updateAccount(data.email, { name: 'Outra Pessoa' })).rejects.toThrow(/salvar/);
  fail.mockRestore();
  expect(JSON.stringify(listDemoProfiles())).toBe(before);
});
