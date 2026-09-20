import "server-only";

/** pdfjs-dist tenta carregar seu worker via `import(GlobalWorkerOptions.workerSrc)`
 * com `/*webpackIgnore* /`, escondendo esse import da análise estática do bundler.
 * Isso funciona em Node local (resolve o caminho relativo em disco), mas quebra
 * em runtimes serverless (Vercel): o arquivo `pdf.worker.mjs` nunca é incluído
 * no trace da function, e o import dinâmico falha com "Cannot find module" em
 * produção. Importar o worker aqui (import estático, o bundler inclui de
 * verdade) faz o módulo setar `globalThis.pdfjsWorker` como efeito colateral —
 * pdfjs detecta isso e usa esse handler direto, sem tentar o import dinâmico. */
export async function loadPdfjs() {
  const [pdfjsLib] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    // @ts-expect-error -- sem .d.ts; importado só pelo efeito colateral (globalThis.pdfjsWorker)
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);
  return pdfjsLib;
}
