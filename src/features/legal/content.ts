export const LEGAL_VERSION = '2026-10-24.1';
export interface LegalSection {
  title: string;
  text: string;
}
export const legalContent: Record<
  'terms' | 'privacy',
  { title: string; intro: string; sections: LegalSection[] }
> = {
  terms: {
    title: 'Termos de uso',
    intro:
      'Versão do projeto acadêmico ProFly. Estes termos descrevem a demonstração em desenvolvimento e ainda dependem de revisão institucional para uma implantação oficial.',
    sections: [
      {
        title: '1. Finalidade do ProFly',
        text: 'O ProFly apoia o cadastro docente, a análise de solicitações por curso e a organização de aulas. Esta versão é uma demonstração local: seus dados ficam neste navegador. Use informações fictícias e uma senha de teste, diferente das senhas dos seus serviços pessoais.',
      },
      {
        title: '2. Conta e responsabilidades',
        text: 'O cadastro é feito pelo próprio professor. Informe dados de sua autoria, mantenha os horários atualizados e não use o nome, a foto ou as credenciais de outra pessoa. Coordenadores analisam solicitações nos cursos sob sua responsabilidade. Criar uma conta não significa receber aprovação acadêmica, emprego ou atribuição de aulas.',
      },
      {
        title: '3. Solicitações e análise',
        text: 'Cada curso possui uma decisão independente: pendente, aprovada, com ajustes solicitados ou recusada. A coordenação registra o motivo da decisão. Conhecimentos e experiências preenchidos pelo professor são declarações; o envio não os transforma automaticamente em dados confirmados.',
      },
      {
        title: '4. Horários e recomendações',
        text: 'O calendário de demonstração utiliza exemplos editáveis. Um rascunho de alocação não é uma escala oficial publicada. Recomendações futuras devem explicar seus critérios e apoiar a decisão da coordenação. Não constituem garantia de aptidão nem atribuem aulas sem decisão humana.',
      },
      {
        title: '5. Foto e conteúdo enviado',
        text: 'A foto de perfil é opcional e serve para identificação na plataforma. Envie uma imagem que você tenha direito de usar. Você pode substituí-la ou removê-la. Não inclua documentos pessoais, diagnósticos ou informações de terceiros nos campos de conhecimento e experiência.',
      },
      {
        title: '6. Uso responsável',
        text: 'Não tente acessar contas alheias, alterar permissões indevidamente ou enviar conteúdo que prejudique o funcionamento da plataforma. A demonstração não deve ser utilizada para compromissos oficiais. Os controles locais do navegador não substituem a autenticação e a autorização do servidor institucional.',
      },
      {
        title: '7. Disponibilidade e alterações',
        text: 'O projeto pode mudar durante o desenvolvimento. Limpar os dados do site ou trocar de navegador pode remover o conteúdo local. O sistema registra a versão dos termos aceita no cadastro. Mudanças relevantes devem ser apresentadas antes de uma nova utilização institucional.',
      },
      {
        title: '8. Responsáveis e implantação',
        text: 'A equipe acadêmica que apresenta o projeto responde pela demonstração. A identificação formal do controlador, o canal de privacidade, os prazos de retenção e a homologação destes termos devem ser definidos com a instituição antes da coleta de dados reais.',
      },
    ],
  },
  privacy: {
    title: 'Aviso de privacidade',
    intro:
      'Saiba quais informações entram no ProFly, para que são utilizadas e quais são os limites desta demonstração. A confirmação de leitura não autoriza publicidade nem usos incompatíveis com o cadastro docente.',
    sections: [
      {
        title: '1. Dados e finalidades',
        text: 'Nome, e-mail e telefone identificam o cadastro e permitem contato. Formação, conhecimentos e experiências apoiam a análise acadêmica. Cursos, disciplinas e disponibilidade ajudam a organizar as solicitações e os horários. A foto é opcional e serve somente para identificação no ProFly. Não coletamos CPF, biometria ou dados bancários neste formulário.',
      },
      {
        title: '2. Armazenamento nesta versão',
        text: 'Na demonstração, perfis, solicitações, horários e fotos são armazenados no navegador deste computador. A sessão fica no armazenamento da aba. Uma derivação da senha de teste com sal aleatório é guardada para demonstrar o login; a senha não é gravada em texto simples. Não há envio de e-mails nem sincronização desses dados com o MongoDB nesta interface.',
      },
      {
        title: '3. Acesso e compartilhamento',
        text: 'O fluxo demonstra o professor acompanhando seus dados e a coordenação analisando os cursos solicitados. Dados locais podem ser acessados por outras pessoas que utilizem o mesmo perfil do navegador: evite informações reais em computadores compartilhados. Não enviamos os cadastros a serviços de publicidade ou a modelos de linguagem. As referências legais externas só são abertas quando você escolhe visitá-las.',
      },
      {
        title: '4. Foto e informações de saúde',
        text: 'A foto pode ser removida sem impedir o uso das outras funções. Arquivos de imagem são reduzidos para exibição no perfil. O cadastro não recebe atestados. O fluxo reservado de ausências e documentos de saúde ainda será implementado; esses documentos não devem aparecer nas recomendações acadêmicas nem reduzir o score do professor.',
      },
      {
        title: '5. Controle dos dados locais',
        text: 'Você pode atualizar sua conta e remover a foto. A limpeza dos dados deste site pelas configurações do navegador apaga os registros locais, inclusive as contas de demonstração e os rascunhos. A versão aceita dos termos e deste aviso fica registrada com a data de criação da conta. Não há prazo automático de expiração dos cadastros locais nesta versão.',
      },
      {
        title: '6. Direitos e informações',
        text: 'A LGPD prevê direitos como acesso, correção e informações sobre o tratamento, além de eliminação e outros direitos nas hipóteses aplicáveis. Para a implantação institucional, o aviso deverá identificar o controlador e seu contato, as bases legais, os destinatários e os prazos de retenção. A confirmação deste aviso não substitui essa definição.',
      },
      {
        title: '7. Responsável e canal institucional',
        text: 'O controlador e o canal formal de atendimento ainda serão definidos na revisão com a faculdade. Esta versão não se apresenta como aviso institucional homologado. Antes de utilizar dados pessoais reais, a equipe do projeto deve publicar essas informações e integrar os mecanismos de atendimento e exclusão ao servidor.',
      },
    ],
  },
};
