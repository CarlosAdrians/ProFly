export const LEGAL_VERSION = '2026-10-24.4';
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
        text: 'O ProFly apoia o cadastro docente, a análise de solicitações por curso e a organização de aulas. No ambiente conectado, cadastros e horários são persistidos pelo servidor. O modo demonstrativo explícito usa este navegador. A implantação institucional depende de homologação; nesta apresentação, use dados fictícios e senha de teste exclusiva.',
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
        text: 'No modo conectado, rascunhos reservam horários e somente uma publicação atualiza a escala do professor. Recomendações explicam critérios configurados, ainda propostos para revisão institucional, e apoiam a coordenação. Não constituem garantia de aptidão nem atribuem aulas sem decisão humana.',
      },
      {
        title: '5. Foto e conteúdo enviado',
        text: 'A foto de perfil é opcional e serve para identificação na plataforma. Envie uma imagem que você tenha direito de usar. Você pode substituí-la ou removê-la. Não inclua documentos pessoais, diagnósticos ou informações de terceiros nos campos de conhecimento e experiência.',
      },
      {
        title: '6. Uso responsável',
        text: 'Não tente acessar contas alheias, alterar permissões indevidamente ou enviar conteúdo que prejudique o funcionamento da plataforma. O ambiente de homologação não deve ser utilizado para compromissos oficiais. No modo conectado, o servidor confere identidade e autorização por curso em cada operação protegida.',
      },
      {
        title: '7. Disponibilidade e alterações',
        text: 'O projeto pode mudar durante o desenvolvimento. Limpar o navegador pode remover conteúdo demonstrativo. No modo conectado, os dados persistem no servidor. O sistema registra a versão dos termos aceita no cadastro. Mudanças relevantes devem ser apresentadas antes de uma nova utilização institucional.',
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
        text: 'No modo conectado, o servidor persiste contas, perfis, solicitações, fotos, escalas, avisos e histórico no MongoDB. A senha recebe derivação criptográfica com sal e a sessão usa cookie protegido contra leitura por JavaScript. O ambiente atual captura e-mails em caixa fictícia local, sem entrega externa. O modo demonstrativo explícito mantém dados separados no navegador.',
      },
      {
        title: '3. Acesso e compartilhamento',
        text: 'O professor acompanha seus dados e cada coordenação analisa somente seus cursos. A administração mantém estrutura e acessos. Encerre a sessão em computador compartilhado; o modo demonstrativo pode expor dados a quem utilize o mesmo perfil do navegador. Não enviamos os cadastros a serviços de publicidade ou a modelos de linguagem. O calendário consulta a BrasilAPI por ano, sem enviar dados do perfil; o provedor recebe dados técnicos da conexão, como o IP. A lista pública de datas é guardada por até 24 horas no navegador. As referências externas são abertas quando você escolhe visitá-las.',
      },
      {
        title: '4. Foto e informações de saúde',
        text: 'A foto pode ser removida sem impedir o uso das outras funções. Arquivos de imagem são reduzidos para exibição no perfil. O cadastro acadêmico não recebe atestados. O fluxo reservado de ausências aceita opcionalmente imagem do documento em armazenamento privado, acessível ao professor e às coordenações selecionadas. Original e hash são preservados e downloads são auditados. O documento não aparece nas recomendações nem reduz fatores acadêmicos. Não envie documentos reais neste ambiente de homologação.',
      },
      {
        title: '5. Controle dos dados locais',
        text: 'Você pode atualizar sua conta e remover a foto. Limpar o navegador apaga somente registros demonstrativos e preferências locais; não elimina dados da API. A versão aceita destes documentos fica registrada no cadastro conectado. Retenção, eliminação e canal institucional precisam ser definidos para homologação.',
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
