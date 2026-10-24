# ProFly — interface disponível

Atualizado em 24/10/2026. A interface React amplia a base institucional azul e preserva a navegação original. Cartões arredondados, seletores segmentados e modo escuro seguem a direção visual solicitada. O brasão fornecido da UNIFACISA substitui o símbolo de Direito, sem fundo branco na barra lateral.

## Rotas e acesso demonstrativo

| Rota | Acesso e comportamento |
| --- | --- |
| `/login` | Login simulado e link interno Cadastrar. |
| `/cadastro` | Cadastro do próprio professor em quatro etapas. |
| `/termos-de-uso`, `/privacidade` | Minutas públicas, também disponíveis no cadastro sem perder os campos. |
| `/inicio` | Professor: perfil, solicitações e estados independentes por curso. |
| `/conta` | Ambos: nome, e-mail, telefone e foto; papel permanece protegido na interface. |
| `/professores` | Coordenador: vínculos, visualização do perfil e análise de solicitações por curso. |
| `/disciplinas` | Coordenador: catálogo demonstrativo de Direito, edição e ativação. |
| `/calendario` | Ambos: mês, semana e dia; turnos manhã, tarde e noite. |
| `/alocacoes` | Coordenador: rascunhos locais, edição, pesquisa e cancelamento. |
| `/esqueceu-senha` | Recuperação ilustrativa, sem envio de mensagem. |
| `/convite/:token` | Rota legada preservada; ativação indisponível. Não integra o novo fluxo de professores. |

Coordenador fictício: `felipe.araujo@profly.test`, senha `profly123`. O e-mail pode ser alterado na tela Conta; nesse caso, o próximo login usa o novo endereço. Professores entram com a conta de teste que criaram neste navegador. A sessão fica na aba; dados demonstrativos permanecem no navegador. Estes controles não oferecem segurança institucional e não devem receber dados pessoais reais.

## Cadastro e aprovação

1. Conta: nome, e-mail, telefone, senha/confirmacão e foto opcional.
2. Perfil acadêmico: múltiplas formações, conhecimentos/níveis, experiência docente e profissional. Dado desconhecido é diferente de não possuir experiência.
3. Cursos e horários: cursos, disciplinas, disponibilidade por dia/hora e carga semanal declarada. Janelas sobrepostas são recusadas.
4. Revisão: resumo editável e confirmações separadas, inicialmente desmarcadas, dos termos e da leitura do aviso de privacidade.

O cadastro abre solicitações pendentes; não concede aprovação acadêmica. A coordenação registra motivo para aprovar, solicitar ajustes ou recusar cada curso. Aprovar um curso preserva as decisões dos outros. Não há botão Novo Professor nem cadastro público pelo WhatsApp. A derivação local da senha usa PBKDF2/SHA-256 com sal aleatório; isso demonstra o fluxo, sem substituir a autenticação do servidor.

A foto aceita JPEG, PNG e WebP de até 2 MB, é recortada/reduzida a 256 pixels e pode ser trocada ou removida. Nome, e-mail e telefone são editáveis; a mudança do e-mail preserva identidade, solicitações e foto e passa a valer no próximo login demonstrativo. A versão institucional precisará de verificação de e-mail no servidor.

## Calendário e alocações

A coordenação mantém a visão semanal e pode alternar para dia ou mês. Cartões mostram disciplina, professor, turma e horário. Podem ser arrastados na grade semanal/diária ou editados pelo formulário, inclusive pelo teclado. Cartões sem horário ficam em Para alocar. A lista de alocações compartilha os mesmos rascunhos. Horários fora dos blocos ilustrativos também são mostrados.

São recusados conflitos de professor entre cursos e de turma no mesmo curso, datas/intervalos inválidos, referências inativas e versões obsoletas. Erros não substituem a posição anterior. O cancelamento conserva o registro no filtro Canceladas. A consistência local entre abas não equivale a uma transação no servidor.

O professor abre o mês e consulta feriados. Sua escala não exibe rascunhos da coordenação. Sem publicação implementada, há um estado explícito de aulas ainda não publicadas; nenhum histórico ou encontro é inventado.

## Feriados e aparência

A [BrasilAPI](https://brasilapi.com.br/docs#tag/Feriados-Nacionais) é consultada por ano, sem credenciais ou dados de perfil. A resposta é validada e guardada por até 24 horas. Se a consulta falhar, a tela informa que está indisponível e distingue cache antigo de lista ainda não carregada. Carnaval, Corpus Christi e outras datas fora da lista civil fixa recebem Confirmar localmente. A API não define o calendário letivo da faculdade.

O dia 5 de agosto recebe o marcador estadual Data Magna da Paraíba, com [referência do Governo da Paraíba](https://codata.pb.gov.br/mural-de-avisos/reparticoes-estaduais-fecham-no-feriado-do-dia-5-de-agosto). O [calendário federal de 2026](https://www.gov.br/gestao/pt-br/assuntos/noticias/2025/dezembro/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026) diferencia feriados e pontos facultativos. Feriados municipais, recessos e alterações institucionais ainda precisam de cadastro/revisão. Nenhuma dessas datas cancela automaticamente uma aula.

O seletor Modo escuro aplica o tema imediatamente, respeita a preferência do sistema na primeira visita e guarda a escolha local. Fundos, textos, campos, tabelas, modais, cartões e avisos compartilham cores semânticas para os dois temas. Fotos e logo não são invertidos. Em telas estreitas, a navegação recolhe e as grades preservam rolagem horizontal.

## Persistência e limites

Chaves locais: `profly:demo:registrations:v1`, `profly:demo:photos:v1`, `profly:demo:planning:v1`, `profly:account`, `profly:theme`, `profly:holidays:v1:<ano>` e sessão `profly:session`. Os catálogos originais utilizam `profly:teachers` e `profly:subjects`. Limpar os dados do site remove esses registros.

**A interface não está integrada à API/MongoDB.** O servidor possui autenticação, autorização por curso, perfis e catálogo reais, descritos em [backend/README.md](../backend/README.md). O envio de e-mail, motor de elegibilidade/score, publicação, atestados e histórico ainda não estão implementados. Minutas de termos e privacidade precisam de revisão e identificação do controlador institucional antes de uso real.

## Validação

Comandos na raiz: `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`. Os testes usam dados sintéticos e bloqueiam consultas de rede por padrão. Evidências de execução e limites estão em [STATUS.md](validation/STATUS.md).
