export const LEGAL_VERSION = '2026-10-25.1';
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
      'Este aviso descreve o tratamento de dados no ProFly. A implantação institucional ainda aguarda definição do controlador, do canal de atendimento e das políticas aplicáveis. Até essa definição, utilize somente dados fictícios. Confirmar a leitura deste aviso não equivale a consentir com qualquer uso de dados.',
    sections: [
      {
        title: '1. Quem responde pelo tratamento',
        text: 'A faculdade ainda não definiu formalmente o controlador e o canal de privacidade desta implantação. As informações configuradas no servidor aparecem na seção de responsabilidade. A equipe acadêmica desenvolve o sistema; o uso da marca da instituição não comprova sua autorização como controlador ou operador.',
      },
      {
        title: '2. Informações utilizadas',
        text: 'A conta contém nome, e-mail, telefone, credencial protegida e, se você escolher, uma foto. O perfil reúne formação, conhecimentos, experiência, cursos de interesse e horários pretendidos. A operação registra solicitações, análises, critérios e resultados de recomendação, aulas publicadas, ocorrências, avisos, preferências e trilhas de auditoria. O cadastro não solicita CPF, dados bancários, biometria ou diagnóstico. Não inclua informações desnecessárias nos campos livres.',
      },
      {
        title: '3. Finalidades e bases legais',
        text: 'Os dados apoiam acesso à conta, comunicação operacional, análise por curso, planejamento de aulas, segurança e atendimento ao titular. A instituição deve documentar a base legal adequada a cada finalidade antes do uso real; não há uma autorização geral pelo aceite dos termos. Informações opcionais, como foto e dedicação pretendida, não condicionam a criação de uma conta. A matrícula docente depende da análise da coordenação do curso.',
      },
      {
        title: '4. Atestados e dados de saúde',
        text: 'Atestados podem conter dados pessoais sensíveis. Novos envios ficam bloqueados no ambiente comum até a configuração institucional da finalidade e base específica para dados de saúde. A prévia isolada permite somente documentos fictícios. Quando habilitado, o fluxo privado recebe imagem JPG, PNG ou WebP, com limite de 5 MB e 16 megapixels; PDF não é suportado. Professor e coordenações selecionadas acessam o documento mediante autorização. O arquivo original é preservado e downloads são auditados. Documento médico não é fator do score acadêmico. Não inclua CID ou detalhes clínicos nos outros formulários.',
      },
      {
        title: '5. Destinatários e provedores',
        text: 'O professor consulta seus registros; cada coordenação atua em seus cursos e a administração mantém acessos e atendimento de privacidade. O servidor usa MongoDB; provedores, operadores, localização, compartilhamentos e eventual transferência internacional precisam ser identificados na implantação. Nesta prévia, e-mails são capturados localmente sem entrega externa. O calendário consulta a BrasilAPI por ano sem enviar perfil docente, mas a conexão informa dados técnicos como IP ao provedor. Não há envio de cadastros a publicidade ou a modelos de linguagem neste fluxo.',
      },
      {
        title: '6. Sessão, armazenamento local e segurança',
        text: 'A sessão utiliza cookie essencial HttpOnly e SameSite=Strict, com Secure na configuração HTTPS. Tema e cache público de feriados podem ficar no navegador; o cache de feriados dura até 24 horas. Não há ferramenta de publicidade ou rastreamento comportamental nesta implementação. Limpar o navegador não exclui dados do servidor. Senhas recebem derivação criptográfica com sal; o sistema aplica autorização, controle de versões e proteção contra comandos indevidos. Nenhuma dessas medidas elimina todos os riscos.',
      },
      {
        title: '7. Retenção e encerramento',
        text: 'A faculdade ainda precisa fixar prazos e critérios de descarte por categoria, incluindo cópias de segurança. Não há prazo institucional inventado neste aviso. Tokens e sessões possuem expiração e limpeza técnica; registros acadêmicos e protocolos não são apagados automaticamente ao sair ou limpar o navegador. A prévia isolada usa banco efêmero, encerrado com o processo. Pedidos de eliminação serão analisados considerando necessidade, bases aplicáveis e eventuais obrigações de guarda, com resposta justificada.',
      },
      {
        title: '8. Como exercer seus direitos',
        text: 'Na conta, Meus dados e privacidade permite baixar uma cópia estruturada com confirmação de senha e abrir pedidos gratuitos de confirmação, acesso, correção, eliminação, anonimização, bloqueio, informações de compartilhamento, portabilidade, oposição, revogação de consentimento quando aplicável e revisão. O protocolo conserva a resposta e a análise; enviar um pedido não executa automaticamente exclusão ou portabilidade. Para acesso ou confirmação completos, o sistema registra o prazo geral de até 15 dias. A cópia automática não substitui a declaração completa nem a portabilidade regulamentada. Você também pode buscar orientação e peticionar à ANPD pelos canais oficiais.',
      },
      {
        title: '9. Recomendações e decisões',
        text: 'O sistema apresenta elegibilidade, fatores e pontuação para apoiar a coordenação. Requisitos e pesos são propostas configuráveis pendentes de validação institucional. Publicar uma escala depende de ação da coordenação; a recomendação não contrata nem atribui aulas automaticamente. Você pode solicitar esclarecimento, correção dos dados ou revisão pelo protocolo de privacidade. Não use dados de saúde, religião, raça ou outros atributos sensíveis para pontuar o professor.',
      },
      {
        title: '10. Versões e comunicação',
        text: 'O cadastro registra a versão dos termos e a ciência do aviso, com data. Novas versões não substituem retroativamente registros anteriores e não criam consentimentos presumidos. Mudanças relevantes de tratamento devem ser comunicadas e avaliadas pela instituição. O canal formal ainda será publicado; enquanto isso, os protocolos internos são ferramentas de homologação, sem representar atendimento institucional já designado.',
      },
    ],
  },
};
