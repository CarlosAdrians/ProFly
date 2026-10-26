import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { validateDocument } from '../src/documents/validate.js';
import { createUiFixture } from './ui-fixture.js';
import type { AcademicDocument } from '../src/documents/routes.js';
import { entity } from '../src/shared/model.js';

let fixture: Awaited<ReturnType<typeof createUiFixture>>;
let passive: Buffer;
before(async () => {
  fixture = await createUiFixture();
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('Comprovante sintetico sem dados pessoais');
  passive = Buffer.from(await pdf.save());
});
after(async () => {
  await fixture?.close();
});

test('CASE-064: PDF passivo preservado; scripts, anexos, formularios, excesso e MIME falso recusados', async () => {
  assert.equal(await validateDocument(passive, 'application/pdf', 5242880), passive);
  for (const contents of [
    Buffer.from('%PDF-1.7\nfalso\n%%EOF'),
    passive.subarray(0, -20),
    Buffer.from('<html>arquivo falso</html>'),
  ]) {
    await assert.rejects(validateDocument(contents, 'application/pdf', 5242880), { status: 415 });
  }
  await assert.rejects(validateDocument(passive, 'image/png', 5242880), { status: 415 });
  await assert.rejects(validateDocument(passive, 'application/pdf', 10), { status: 413 });
  await assert.rejects(validateDocument(Buffer.alloc(5242881), 'application/pdf', 20971520), {
    status: 413,
  });
  for (const kind of ['script', 'embedded', 'form', 'pages']) {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    if (kind === 'script') pdf.addJavaScript('startup', 'app.alert("teste sintetico")');
    if (kind === 'embedded') await pdf.attach(Buffer.from('arquivo sintetico'), 'nested.txt');
    if (kind === 'form') pdf.getForm().createTextField('campo').addToPage(pdf.getPages()[0]!);
    if (kind === 'pages') for (let i = 1; i < 51; i++) pdf.addPage();
    await assert.rejects(
      validateDocument(Buffer.from(await pdf.save()), 'application/pdf', 5242880),
      { status: 415 },
    );
  }
  // Flooding a worker pool is bounded; accepted files still finish and later uploads recover.
  const flood = await Promise.allSettled(
    Array.from({ length: 6 }, () => validateDocument(passive, 'application/pdf', 5242880)),
  );
  assert.equal(flood.filter((result) => result.status === 'fulfilled').length, 2);
  for (const result of flood)
    if (result.status === 'rejected') assert.equal(result.reason.code, 'FILE_VALIDATION_BUSY');
  assert.equal(await validateDocument(passive, 'application/pdf', 5242880), passive);
});

function upload(url: string, bytes: Buffer, headers = fixture.teacher, type = 'application/pdf') {
  const boundary = 'profly-private-file-boundary';
  return fixture.app.inject({
    method: 'POST',
    url,
    headers: { ...headers, 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="comprovante.pdf"\r\nContent-Type: ${type}\r\n\r\n`,
      ),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
  });
}

test('CASE-065: comprovantes vinculados ao perfil, privados, imutaveis e retirados com versao', async () => {
  const f = fixture;
  const metadata = {
    profileVersion: 1,
    section: 'education',
    itemId: f.profile.education![0]!.id,
    title: 'Comprovante de formacao sintetico',
  };
  const create = (body: object) =>
    f.app.inject({
      method: 'POST',
      url: '/api/v1/me/academic-documents',
      headers: f.teacher,
      payload: body,
    });
  assert.equal((await create({ ...metadata, approved: true })).statusCode, 422);
  assert.equal((await create({ ...metadata, profileVersion: 2 })).statusCode, 409);
  assert.equal((await create({ ...metadata, itemId: crypto.randomUUID() })).statusCode, 422);
  const created = await create(metadata);
  assert.equal(created.statusCode, 201, created.body);
  const doc = created.json();
  const path = `/api/v1/me/academic-documents/${doc.id}/file`;
  const denied = await upload(path, passive, { cookie: f.teacher.cookie } as typeof f.teacher);
  assert.equal(denied.statusCode, 403);
  assert.equal((await upload(path, Buffer.from('falso'))).statusCode, 415);
  assert.equal((await f.app.inject({ url: path, headers: f.admin })).statusCode, 403);
  const courses = `/api/v1/courses/${f.courseA.id}/academic-documents/${doc.id}/file`;
  assert.equal((await f.app.inject({ url: courses, headers: f.admin })).statusCode, 403);
  const reviewBefore = await f.database.db
    .collection('reviews')
    .findOne({ teacherId: f.teacherId });
  const raced = await Promise.all([upload(path, passive), upload(path, passive)]);
  assert.deepEqual(raced.map((result) => result.statusCode).sort(), [201, 409]);
  const original = await f.app.inject({ url: path, headers: f.teacher });
  assert.equal(original.statusCode, 200, original.body);
  assert.deepEqual(original.rawPayload, passive);
  assert.match(String(original.headers['content-disposition']), /attachment;.*\.pdf/);
  assert.equal(original.headers['content-type'], 'application/pdf');
  assert.equal(original.headers['cache-control'], 'no-store');
  assert.equal(original.headers['x-content-type-options'], 'nosniff');
  const reviewed = await f.app.inject({ url: courses, headers: f.coordinatorHeaders });
  assert.equal(reviewed.statusCode, 200, reviewed.body);
  assert.deepEqual(reviewed.rawPayload, passive);
  assert.equal(
    (
      await f.app.inject({
        url: courses.replace(f.courseA.id, f.courseB.id),
        headers: f.coordinatorHeaders,
      })
    ).statusCode,
    404,
  );
  const application = await f.database.db
    .collection('applications')
    .findOne({ teacherId: f.teacherId, courseId: f.courseA.id });
  const docs = await f.call(
    `/api/v1/courses/${f.courseA.id}/applications/${application!._id}/documents`,
    undefined,
    f.coordinatorHeaders,
  );
  assert.equal(docs.items[0].id, doc.id);
  assert.ok(!JSON.stringify(docs).includes('JVBER')); // no document bytes in metadata responses
  assert.deepEqual(
    await f.database.db.collection('reviews').findOne({ teacherId: f.teacherId }),
    reviewBefore,
  );

  const withdrawal = await Promise.all(
    [1, 2].map(() =>
      f.app.inject({
        method: 'POST',
        url: `/api/v1/me/academic-documents/${doc.id}/withdraw`,
        headers: f.teacher,
        payload: { expectedVersion: 2 },
      }),
    ),
  );
  assert.deepEqual(withdrawal.map((result) => result.statusCode).sort(), [200, 409]);
  assert.equal(
    (await f.app.inject({ url: courses, headers: f.coordinatorHeaders })).statusCode,
    404,
  );
  assert.deepEqual((await f.app.inject({ url: path, headers: f.teacher })).rawPayload, passive);
  const bundle = await f.call(
    '/api/v1/me/privacy/export',
    { currentPassword: f.password },
    f.teacher,
  );
  assert.equal(bundle.datasets.academicDocuments[0].state, 'WITHDRAWN');
  assert.ok(bundle.privateFiles.academicDocuments.includes(path));
  assert.ok(!JSON.stringify(bundle).includes('JVBER'));
  assert.equal(await f.database.db.collection('academicFiles').countDocuments({ _id: doc.id }), 1);
});

test('CASE-064/065: PDF de atestado usa bloqueio de saude, original privado e isolamento entre titulares', async () => {
  const f = fixture;
  const absence = await f.call(
    '/api/v1/me/absences',
    { startsOn: f.from, endsOn: f.until, courseIds: [f.courseA.id] },
    f.teacher,
  );
  const path = `/api/v1/me/absences/${absence.id}/attachment`;
  assert.equal((await upload(path, passive)).statusCode, 201);
  const download = await f.app.inject({ url: path, headers: f.teacher });
  assert.deepEqual(download.rawPayload, passive);
  assert.match(String(download.headers['content-disposition']), /atestado\.pdf/);
  assert.equal((await upload(path, passive)).statusCode, 409);
  const stranger = await f.call('/api/v1/auth/register', {
    name: 'Outra Pessoa Sintetica',
    email: 'documents-stranger@profly.test',
    password: f.password,
  });
  await f.call('/api/v1/auth/verify-email', {
    token: f.messages.findLast((m) => m.email === 'documents-stranger@profly.test')!.token,
  });
  const other = await f.login(stranger.user.email);
  const document = (await f.call('/api/v1/me/academic-documents', undefined, f.teacher)).items[0];
  assert.equal(
    (
      await f.app.inject({
        url: `/api/v1/me/academic-documents/${document.id}/file`,
        headers: other,
      })
    ).statusCode,
    404,
  );
  assert.equal((await f.app.inject({ url: path, headers: other })).statusCode, 404);
});

test('CASE-065: paginacao propria e limite de documentos impedem respostas truncadas ou uso ilimitado', async () => {
  const f = fixture;
  const base = {
    teacherId: f.teacherId,
    profileVersion: 1,
    section: 'education' as const,
    itemId: f.profile.education![0]!.id,
    title: 'Comprovante sintetico',
    state: 'ACTIVE' as const,
  };
  await f.database.db
    .collection<AcademicDocument>('academicDocuments')
    .insertMany(Array.from({ length: 99 }, () => ({ ...entity(), ...base })));
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const page: { items: { id: string }[]; nextCursor: string | null } = await f.call(
      `/api/v1/me/academic-documents?limit=13${cursor ? `&cursor=${cursor}` : ''}`,
      undefined,
      f.teacher,
    );
    for (const document of page.items) {
      assert.ok(!seen.has(document.id));
      seen.add(document.id);
    }
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(seen.size, 100);
  assert.equal(
    (await f.app.inject({ url: '/api/v1/me/academic-documents?cursor=bad', headers: f.teacher }))
      .statusCode,
    422,
  );
  const full = await f.app.inject({
    method: 'POST',
    url: '/api/v1/me/academic-documents',
    headers: f.teacher,
    payload: { profileVersion: 1, section: 'education', itemId: base.itemId, title: base.title },
  });
  assert.equal(full.statusCode, 413);
  assert.equal(full.json().error.code, 'DOCUMENT_QUOTA');
});
