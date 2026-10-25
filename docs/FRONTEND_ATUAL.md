# ProFly — interface disponível

## Estado em 25/10/2026

A aplicação usa agora a API por padrão. Cadastro, análise por curso, administração, conta/foto, calendário publicado, alocações, score, histórico, ausências e notificações estão ligados ao servidor. Configuração, rotas, evidências e limites em [INTERFACE_API.md](INTERFACE_API.md). Não há fallback silencioso para cadastros do navegador.

O conteúdo a seguir registra a demonstração anterior, preservada somente com `VITE_DEMO_MODE=true`. Suas credenciais fictícias e limitações locais não descrevem o modo conectado.

Atualizado em 24/10/2026. A interface React amplia a base institucional azul e preserva a navegação original. Cartões arredondados, seletores segmentados e modo escuro seguem a direção visual solicitada. O brasão fornecido da UNIFACISA substitui o símbolo de Direito, sem fundo branco na barra lateral.

## Rotas e acesso demonstrativo

| Rota | Acesso e comportamento |
| --- | --- |
| `/login` | Login demonstrativo, marca institucional e link interno Cadastrar, sem seletor de tema. |
| `/esqueceu-senha` | Validação de e-mail e retorno explícito de envio indisponível, sem simular mensagem enviada. |
| `/cadastro` | Cadastro do próprio professor em quatro etapas. |
| `/termos-de-uso`, `/privacidade` | Minutas públicas, também disponíveis no cadastro sem perder os campos. |
| `/inicio` | Professor: agenda, histórico ainda sem ocorrências, horários pretendidos e formação declarada. Solicitações recolhidas, salvo quando há ajustes solicitados. |
| `/disponibilidade` | Professor: consulta semanal, edição explícita dos períodos pretendidos e ligação com o calendário. |
| `/configuracoes` | Ambos: tema, visualização/turno inicial e exibição de feriados. |
| `/conta` | Ambos: identidade, dados de contato e editor da foto pelo avatar; professor também consulta seu perfil acadêmico. Papel protegido. |
| `/professores` | Coordenador: vínculos, visualização do perfil e análise de solicitações por curso. |
| `/disciplinas` | Coordenador: catálogo demonstrativo de Direito, edição e ativação. |
| `/calendario` | Ambos: mês, semana e dia; turnos manhã, tarde e noite. |
| `/alocacoes` | Coordenador: rascunhos locais, edição, pesquisa e cancelamento. |
| `/convite/:token` | Rota legada preservada; ativação indisponível. Não integra o novo fluxo de professores. |

Coordenador fictício: `felipe.araujo@profly.test`, senha `profly123`. O e-mail pode ser alterado na tela Conta; nesse caso, o próximo login usa o novo endereço. Professores entram com a conta de teste que criaram neste navegador. A sessão fica na aba; dados demonstrativos permanecem no navegador. Estes controles não oferecem segurança institucional e não devem receber dados pessoais reais.

## Cadastro e aprovação

1. Conta: nome, e-mail, telefone, senha/confirmacão e foto opcional.
2. Perfil acadêmico: múltiplas formações já concluídas, conhecimentos/níveis, experiência docente e profissional. Dado desconhecido é diferente de não possuir experiência. Titulação, curso, instituição e ano têm erros individuais; um ano futuro destaca e recebe foco somente no campo do ano. Instituição aceita o nome ou a sigla da faculdade/universidade emissora do diploma.
3. Cursos e horários: cursos, disciplinas e disponibilidade por dia/hora. Dedicação semanal pretendida é opcional; em branco significa não informada e pode ser definida depois em Horários. Janelas sobrepostas são recusadas.
4. Revisão: resumo editável e confirmações separadas, inicialmente desmarcadas, dos termos e da leitura do aviso de privacidade.

O cadastro abre solicitações pendentes; não concede aprovação acadêmica. A coordenação registra motivo para aprovar, solicitar ajustes ou recusar cada curso. Aprovar um curso preserva as decisões dos outros. Não há botão Novo Professor nem cadastro público pelo WhatsApp. A derivação local da senha usa PBKDF2/SHA-256 com sal aleatório; isso demonstra o fluxo, sem substituir a autenticação do servidor.

A conta permite acompanhar o próprio cadastro enquanto a análise está pendente. O dashboard mostra um aviso com os cursos que aguardam aprovação; o novo professor só aparece nos vínculos aprovados depois da decisão. A conta fictícia de coordenação está atribuída somente a Direito. A tela e o adaptador de análise recusam decisões fora desse escopo e de perfis de professor. Na versão institucional, essas responsabilidades vêm das atribuições do administrador no servidor; os controles locais não são uma fronteira de segurança.

Telefone usa formato nacional com DDD brasileiro existente, celular iniciado em 9 ou fixo iniciado de 2 a 5; o campo orienta a não incluir +55. A lista de DDDs referencia os [Códigos Nacionais da Anatel](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais). A validação não comprova titularidade. A política de nova senha mantém 8 a 72 caracteres, pelo menos uma letra e um número, e confirmação igual, com checklist visível. Credenciais existentes de login não receberam novas exigências.

A leitura dos perfis valida a estrutura completa antes de fornecer listas às páginas, acompanha alterações entre abas por snapshot e preserva o conteúdo original em erro. Perfis malformados geram aviso na listagem, sem limpar cadastros. Erros inesperados de rota recebem uma tela institucional com nova tentativa e retorno ao início, sem exibir stack técnico.

A foto aceita JPEG, PNG e WebP de até 2 MB, é recortada/reduzida a 256 pixels e pode ser trocada ou removida. Nome, e-mail e telefone são editáveis; a mudança do e-mail preserva identidade, solicitações e foto e passa a valer no próximo login demonstrativo. A versão institucional precisará de verificação de e-mail no servidor.

## Conta e ações de acesso

Conta reúne identidade e acesso em uma coluna e organiza dados cadastrais e perfil acadêmico em seções com navegação interna. A edição preserva nome, e-mail, telefone e papel protegido; o telefone tem formatação de leitura sem alterar o valor salvo. A saída da conta é uma ação discreta no bloco de acesso.

Clicar no avatar abre um diálogo com seleção de arquivo, prévia circular, zoom, posição horizontal/vertical e centralização. Escolher ou ajustar uma imagem não salva automaticamente. Salvar foto grava um JPEG de 256 × 256; Cancelar preserva a imagem atual. Remover foto também exige ação explícita. O editor limita formatos, tamanho e dimensões, libera URLs temporárias e bloqueia fechamento durante processamento/gravação. Em falha, a imagem anterior e a edição são preservadas.

Login mantém a composição aprovada e a foto do campus. As ações de Login e Conta recebem ícones SVG locais, com texto ou nome acessível. Os avisos de demonstração do login e o rodapé compartilhado das telas internas foram removidos por solicitação do usuário. Essa alteração visual não muda o armazenamento local nem representa integração com a API; os limites técnicos continuam documentados aqui e em Segurança do ambiente.

O bloco de marca do login exibe somente a logo completa da UNIFACISA centralizada, sem o nome ProFly ao lado. Foto e composição em duas metades foram preservadas; no celular a foto continua recolhida. Cadastro recebeu seletores nativos com seta SVG, ícones nas ações e erros por campo. Seu aviso visual de demonstração foi removido; limites técnicos continuam nesta documentação. Toggle usa sol/lua em SVG, preservando teclado, foco, preferência e semântica de switch nos dois temas. Pins têm hierarquia de horário, disciplina, professor e turma; a grade mantém uma largura mínima de célula e rolagem interna em telas estreitas. Handlers de arraste e alternativa por formulário foram preservados.

O progresso de horas realizadas em relação à meta semanal ainda depende do histórico de ocorrências confirmadas. A interface informa essa dependência e não inventa horas cumpridas, percentuais ou aulas realizadas a partir da disponibilidade.

## Calendário e alocações

A coordenação mantém a visão semanal e pode alternar para dia ou mês. Cartões mostram disciplina, professor, turma e horário. Podem ser arrastados na grade semanal/diária ou editados pelo formulário, inclusive pelo teclado. Cartões sem horário ficam em Para alocar. A lista de alocações compartilha os mesmos rascunhos. Horários fora dos blocos ilustrativos também são mostrados.

São recusados conflitos de professor entre cursos e de turma no mesmo curso, datas/intervalos inválidos, datas anteriores a hoje, referências inativas e versões obsoletas. Erros não substituem a posição anterior. O cancelamento conserva o registro no filtro Canceladas. A consistência local entre abas não equivale a uma transação no servidor. Hoje é calculado no fuso America/Fortaleza. Datas antigas continuam visíveis; o bloqueio vale para salvar e mover aulas para o passado, com nova verificação antes da gravação.

O professor abre o mês e consulta feriados. Sua escala não exibe rascunhos da coordenação. Sem publicação implementada, há um estado explícito de aulas ainda não publicadas; nenhum histórico ou encontro é inventado.

Horários pretendidos podem aparecer no mês, semana e dia, com identificação própria e aparência diferente de aula atribuída. A ligação da página de horários abre a semana com essa opção ativa. Preferências que atravessam turnos são recortadas visualmente no limite de cada turno, sem alterar o registro. São declarações semanais atuais, sem comprovar disponibilidade histórica ou cancelar feriados. O aviso de feriados fica depois da grade.

## Feriados e aparência

A [BrasilAPI](https://brasilapi.com.br/docs#tag/Feriados-Nacionais) é consultada por ano, sem credenciais ou dados de perfil. A resposta é validada e guardada por até 24 horas. Se a consulta falhar, a tela informa que está indisponível e distingue cache antigo de lista ainda não carregada. Carnaval, Corpus Christi e outras datas fora da lista civil fixa recebem Confirmar localmente. A API não define o calendário letivo da faculdade.

O dia 5 de agosto recebe o marcador estadual Data Magna da Paraíba, com [referência do Governo da Paraíba](https://codata.pb.gov.br/mural-de-avisos/reparticoes-estaduais-fecham-no-feriado-do-dia-5-de-agosto). O [calendário federal de 2026](https://www.gov.br/gestao/pt-br/assuntos/noticias/2025/dezembro/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026) diferencia feriados e pontos facultativos. Feriados municipais, recessos e alterações institucionais ainda precisam de cadastro/revisão. Nenhuma dessas datas cancela automaticamente uma aula.

O seletor Modo escuro fica no rodapé da barra lateral, junto ao acesso Ajustes, e aplica o tema imediatamente, respeita a preferência do sistema na primeira visita e guarda a escolha local. Fundos, textos, campos, tabelas, modais, cartões e avisos compartilham cores semânticas para os dois temas. Fotos e logo não são invertidos. Em telas estreitas, a navegação recolhe e as grades preservam rolagem horizontal.

O aviso de feriados reúne cartões com dia, nome e abrangência. Fontes, atualização e limites ficam em uma explicação recolhível, sem ocultar falha de consulta.

## Configurações, disponibilidade e modais

Configurações permite escolher tema claro, escuro ou do sistema, visualização e turno iniciais do calendário, além de mostrar/ocultar feriados. As preferências do calendário são salvas por conta neste navegador; a aparência é compartilhada pelo dispositivo. Ocultar feriados também evita consultar o provedor enquanto a opção estiver desligada. Nada disso muda a disponibilidade acadêmica do professor.

Horários pretendidos abre na consulta da semana. Atualizar horários pretendidos inicia uma edição para incluir/remover períodos e alterar as horas pretendidas. Alterações ficam em edição até Salvar disponibilidade; Cancelar edição restaura os dados salvos. Sobreposição, ausência de intervalos, dedicação inválida, versão obsoleta e falha de armazenamento são recusadas. Os vínculos e decisões por curso são preservados; editar disponibilidade não publica nem redistribui aulas. Edições abertas são preservadas quando o perfil muda em outra tela, com aviso para conferir os dados salvos.

Disciplinas mantém o catálogo demonstrativo de Direito, com pesquisa por nome/código e filtros Todas/Ativas/Inativas. Códigos são imutáveis. A gravação agora falha explicitamente quando o armazenamento não está disponível e não substitui catálogo corrompido por exemplos.

Os modais têm nome acessível, foco inicial quando indicado, retorno do foco ao acionador e controles bloqueados durante o salvamento. Clicar no conteúdo não fecha o diálogo. Erros de cadastro preservam os campos e permitem tentar novamente. As ações usam nomes de operação e cancelamento claros; em telas estreitas, os diálogos e ações se reorganizam.

## Entrada e início docente

O login preserva a composição anterior: foto à esquerda ocupando metade da tela, cartão sobre fundo azul, marca ProFly e link Cadastrar centralizados. O seletor de tema continua ausente. A foto original foi tratada com a ferramenta de imagem integrada para reduzir pixelização e melhorar a nitidez, passando de 399 × 501 para 1119 × 1405 pixels. O login carrega campus-hd.webp (415.752 bytes), com campus-hd.jpg como alternativa, dimensões explícitas, prioridade de carregamento e recorte cover central preservado. O original foi mantido. A reconstrução por IA estima detalhes e não equivale à recuperação de uma captura original em alta resolução. Processo e prompt em [Tratamento da foto do campus](assets/CAMPUS.md). A recuperação mantém seu fluxo e sua apresentação atuais. O escudo da UNIFACISA também identifica a guia. O início docente foi revisto sem bloco de apresentação nem contadores de perfil: agenda, histórico, formação e preferências têm prioridade. Formação declarada não significa certificado anexado; documentos ainda não estão disponíveis na interface.

## Persistência e limites

Chaves locais: `profly:demo:registrations:v1`, `profly:demo:photos:v1`, `profly:demo:planning:v1`, `profly:account`, `profly:theme`, `profly:preferences:v1:<email>`, `profly:holidays:v1:<ano>` e sessão `profly:session`. Os catálogos originais utilizam `profly:teachers` e `profly:subjects`. Limpar os dados do site remove esses registros.

A demonstração só abre em hosts locais exatos. Os limites e controles verificados estão em [SEGURANCA.md](SEGURANCA.md).

**A interface não está integrada à API/MongoDB.** O servidor possui autenticação, autorização por curso, perfis e catálogo reais, descritos em [backend/README.md](../backend/README.md). O envio de e-mail, motor de elegibilidade/score, publicação, atestados e histórico ainda não estão implementados. Minutas de termos e privacidade precisam de revisão e identificação do controlador institucional antes de uso real.

## Validação

Comandos na raiz: `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`. Os testes usam dados sintéticos e bloqueiam consultas de rede por padrão. Evidências de execução e limites estão em [STATUS.md](validation/STATUS.md).
