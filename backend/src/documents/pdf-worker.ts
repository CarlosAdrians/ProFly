async function inspectPdf() {
  const { parentPort, workerData } = await import('node:worker_threads');
  try {
    const { PDFDocument, PDFDict, PDFArray, PDFName, PDFStream } = await import('pdf-lib');
    const pdf = await PDFDocument.load(workerData, {
      ignoreEncryption: false,
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
    if (pdf.isEncrypted || pdf.getPageCount() < 1 || pdf.getPageCount() > 50) throw new Error();
    const objects = pdf.context.enumerateIndirectObjects();
    if (objects.length > 10000) throw new Error();
    const blocked = new Set([
      'js',
      'javascript',
      'openaction',
      'aa',
      'embeddedfiles',
      'ef',
      'acroform',
      'xfa',
      'richmedia',
      'launch',
      'submitform',
      'importdata',
      'gotor',
      'gotoe',
      'uri',
      'sound',
      'movie',
      '3d',
      'rendition',
      'screen',
    ]);
    const seen = new Set<unknown>();
    let nodes = 0;
    function visit(value: unknown, depth = 0) {
      if (seen.has(value)) return;
      seen.add(value);
      if (++nodes > 100000 || depth > 50) throw new Error();
      if (value instanceof PDFName && blocked.has(value.decodeText().toLowerCase()))
        throw new Error();
      if (value instanceof PDFDict) {
        for (const [key, entry] of value.entries()) {
          if (blocked.has(key.decodeText().toLowerCase())) throw new Error();
          visit(entry, depth + 1);
        }
      } else if (value instanceof PDFArray) {
        for (const entry of value.asArray()) visit(entry, depth + 1);
      } else if (value instanceof PDFStream) visit(value.dict, depth + 1);
    }
    for (const [, object] of objects) visit(object);
    // Resolve every page dictionary as well; an unresolved page tree must not pass as a valid file.
    for (const page of pdf.getPages()) {
      if (
        !Number.isFinite(page.getWidth()) ||
        !Number.isFinite(page.getHeight()) ||
        page.getWidth() <= 0 ||
        page.getHeight() <= 0
      )
        throw new Error();
    }
    parentPort!.postMessage(true);
  } catch {
    parentPort!.postMessage(false);
  }
}

await inspectPdf();
