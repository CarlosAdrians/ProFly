import { Link } from 'react-router';
import { Button } from '../components/ui/Button/Button';
import { Icon } from '../components/ui/Icon/Icon';
import styles from './RouteErrorPage.module.css';

export function RouteErrorPage() {
  return (
    <main className={styles.page}>
      <title>Não foi possível abrir a tela | ProFly</title>
      <section className={styles.card} aria-labelledby="route-error-title">
        <img src="/images/unifacisa-logo.png" alt="UNIFACISA Centro Universitário" />
        <h1 id="route-error-title">Não foi possível abrir esta tela</h1>
        <p>
          Ocorreu um erro inesperado. Tente carregar novamente ou volte ao início. Os dados salvos
          não foram apagados. Alterações ainda não salvas podem precisar ser preenchidas novamente.
        </p>
        <div className={styles.actions}>
          <Button onClick={() => window.location.reload()}>
            <Icon name="reset" /> Tentar novamente
          </Button>
          <Link to="/">Voltar ao início</Link>
        </div>
      </section>
    </main>
  );
}
