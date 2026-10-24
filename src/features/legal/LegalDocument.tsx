import { Link } from 'react-router';
import { LEGAL_VERSION, legalContent } from './content';
import styles from './LegalDocument.module.css';
export function LegalDocument({ kind }: { kind: 'terms' | 'privacy' }) {
  const document = legalContent[kind];
  return (
    <article className={styles.document}>
      <h1>{document.title}</h1>
      <p className={styles.version}>Versão {LEGAL_VERSION} · Projeto acadêmico</p>
      <p className={styles.intro}>{document.intro}</p>
      {document.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.text}</p>
        </section>
      ))}
      <aside className={styles.references}>
        <strong>Referências para a revisão institucional</strong>
        <a
          href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm"
          target="_blank"
          rel="noreferrer"
        >
          Lei Geral de Proteção de Dados Pessoais
        </a>
        <a
          href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares"
          target="_blank"
          rel="noreferrer"
        >
          ANPD: direitos dos titulares
        </a>
      </aside>
    </article>
  );
}
export function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  return (
    <main className={styles.page}>
      <title>{legalContent[kind].title} | ProFly</title>
      <Link to="/login" className={styles.back}>
        Voltar ao login
      </Link>
      <LegalDocument kind={kind} />
    </main>
  );
}
