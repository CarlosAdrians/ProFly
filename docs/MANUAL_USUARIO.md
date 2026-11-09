# Manual do usuário do ProFly

Atualizado em 09/11/2026. As telas mostram contas e dados fictícios. O manual segue a ordem de uso: o administrador prepara a estrutura, o professor se cadastra, a coordenação analisa e monta a escala, e o professor acompanha as aulas. Arquitetura, dados, regras e API estão na [documentação técnica](DOCUMENTACAO_TECNICA.md); as contas de demonstração, no [README](../README.md#usuários-de-demonstração).

- [Acesso](#acesso)
- [Professor](#professor)
- [Coordenação](#coordenação)
- [Como o ProFly indica professores (árvore de decisão)](#como-o-profly-indica-professores-árvore-de-decisão)
- [Administração](#administração)
- [Perguntas frequentes](#perguntas-frequentes)
- [Como executar](#como-executar)

## Acesso

Abra o endereço do ProFly e entre com e-mail e senha. O link **Cadastrar** leva ao cadastro de professor; **Esqueceu senha** envia um link de redefinição quando o envio de e-mail está configurado.

![Tela de login](manual/telas/01-login.jpg)

Cada pessoa vê apenas o que seu papel permite:

| Papel | O que faz |
| --- | --- |
| Professor | Cadastra o perfil, pede entrada nos cursos, informa horários e acompanha suas aulas. |
| Coordenação | Aprova ou recusa professores do seu curso, organiza disciplinas, turmas e ofertas, compara candidatos e publica a escala. |
| Administração | Cria cursos, convida coordenadores, cadastra competências, períodos/grade e o limite de carga de cada professor. |

Uma pessoa pode ter mais de um papel. Quem é coordenador e professor escolhe a **Área de trabalho** no topo da tela.

## Professor

### 1. Cadastro em quatro etapas

1. **Sua conta**: nome, e-mail, telefone com DDD e senha (8 a 72 caracteres, com letra e número).
2. **Perfil acadêmico**: formações concluídas, conhecimentos com nível declarado e experiências docente e profissional. Responder "Ainda não possuo" é diferente de "Ainda vou informar".
3. **Cursos e horários**: marque o curso e **ao menos uma disciplina** em cada curso marcado; informe sua disponibilidade semanal e a vigência.
4. **Revisão**: confira o resumo e aceite os termos e o aviso de privacidade.

| Conta | Perfil acadêmico |
| --- | --- |
| ![Etapa da conta](manual/telas/02-cadastro-conta.jpg) | ![Etapa do perfil acadêmico](manual/telas/03-cadastro-perfil.jpg) |

| Cursos e horários | Revisão |
| --- | --- |
| ![Etapa de cursos e horários](manual/telas/04-cadastro-cursos-horarios.jpg) | ![Etapa de revisão](manual/telas/05-cadastro-revisao.jpg) |

Cada etapa avisa o que falta antes de seguir. Para pedir entrada em um curso, o perfil precisa estar completo: formação, conhecimento, respostas sobre experiências e disponibilidade. Quem ainda não tem tudo pode desmarcar os cursos e pedir depois, em **Meu início**.

Ao concluir:

- **Sem envio de e-mail configurado** (padrão da apresentação), a conta é criada na hora e o pedido segue para a coordenação. O professor já pode entrar.
- **Com envio de e-mail configurado**, o professor confirma o e-mail pelo link recebido; o pedido segue para a coordenação depois da confirmação. A página **Reenviar confirmação** envia um novo link.

![Cadastro enviado à coordenação](manual/telas/06-cadastro-enviado.jpg)

A conta criada não dá acesso ao curso. Somente a coordenação daquele curso aprova a entrada.

### 2. Meu início

Mostra a situação de cada pedido por curso (em análise, aprovado, ajustes solicitados ou recusado), as próximas aulas publicadas e atalhos para horários e perfil. **Solicitar entrada ou reenviar perfil** pede entrada em outro curso ou reenvia o perfil depois de mudanças acadêmicas.

![Início do professor](manual/telas/15-professor-inicio.jpg)

### 3. Disponibilidade

Informe os dias, horários e a vigência em que pretende lecionar, além da dedicação semanal (opcional).

![Disponibilidade do professor](manual/telas/17-professor-disponibilidade.jpg)

Mudar **horários, dedicação ou telefone não exige nova análise**: a coordenação confere a disponibilidade automaticamente ao alocar. Mudar **formação, conhecimentos ou experiências** exige reenviar o perfil para análise em cada curso.

### 4. Calendário e histórico

O calendário mostra somente aulas **publicadas** pela coordenação, por mês, semana ou dia, com filtros de turno. Use **Próximo período** e **Período anterior** para navegar. Aulas aos domingos aparecem em um aviso com acesso ao dia.

![Calendário do professor](manual/telas/16-professor-calendario.jpg)

O **Histórico** lista as aulas já ocorridas e sua situação (realizada, a confirmar, cancelada ou remarcada).

![Histórico do professor](manual/telas/18-professor-historico.jpg)

### 5. Conta

Dados de identificação, foto, perfil acadêmico e troca protegida de e-mail e senha.

![Conta do professor](manual/telas/19-professor-conta.jpg)

## Coordenação

Escolha o **Curso de trabalho** no topo. A escolha fica salva para a próxima visita.

### 1. Meu início

Reúne as próximas aulas do curso e o que precisa de atenção: cadastros aguardando análise, rascunhos de alocação e aulas passadas a confirmar. O sino no topo também avisa novos pedidos.

![Início da coordenação](manual/telas/07-coordenador-inicio.jpg)

### 2. Aprovar ou recusar professores

Em **Professores**, a lista mostra quem pediu entrada, o e-mail, a situação e quantas disciplinas foram pedidas. **Analisar perfil** abre o pedido.

![Pedidos e vínculos do curso](manual/telas/08-coordenador-professores.jpg)

Na análise:

1. Confira as **disciplinas pedidas**: a aprovação vale para elas.
2. Marque cada formação, conhecimento ou experiência como **Confirmado**, **Evidência recusada** ou, para conhecimento, **Ausência confirmada**. Itens sem análise deixam a recomendação pendente.
3. Escolha **Aprovar neste curso**, **Solicitar ajustes** ou **Recusar neste curso**, escreva o motivo e registre.

![Análise do cadastro](manual/telas/09-coordenador-analise.jpg)

**Encerrar vínculo** remove o professor do curso, com motivo obrigatório. Só é possível quando ele não tem aulas futuras: cancele ou reatribua as aulas e publique a revisão antes. O professor é avisado e pode pedir entrada novamente.

### 3. Disciplinas e critérios

Cada disciplina tem uma **ficha de critérios**: conhecimentos obrigatórios (com nível mínimo), conhecimentos desejáveis (com peso), formação mínima, experiências mínimas e os pesos da pontuação. A ficha precisa estar marcada como **revisada** para que alguém fique elegível.

![Disciplinas do curso](manual/telas/10-coordenador-disciplinas.jpg)

### 4. Turmas, ofertas e alocações

Em **Alocações → Turmas e ofertas**, crie as turmas do período e as ofertas (disciplina + turma + encontros da grade). Depois:

1. **Nova alocação** → escolha a oferta. Os encontros vêm preenchidos.
2. **Comparar professores** lista os professores aprovados no curso: primeiro os elegíveis, por posição e pontuação; depois os demais, com o motivo principal na própria linha.
3. **Ver motivos** abre a árvore completa daquele professor.
4. Escolha o professor e **Salvar rascunho**. O servidor confere tudo de novo.
5. **Publicar revisão** envia a escala aos professores. Se alguma alocação não puder ser publicada, a mensagem lista disciplina, turma, professor e motivo.

| Alocações | Comparar professores |
| --- | --- |
| ![Alocações do curso](manual/telas/11-coordenador-alocacoes.jpg) | ![Comparação de professores](manual/telas/12-comparar-professores.jpg) |

Por padrão aparecem as alocações atuais e futuras; marque **Mostrar alocações já encerradas** para consultar semestres anteriores. Cancelar uma alocação publicada pede confirmação e só retira as aulas futuras depois da nova publicação; o histórico é preservado.

### 5. Calendário do curso

Mês, semana ou dia. Datas futuras mostram o planejamento (inclusive rascunhos); datas passadas mostram as aulas ocorridas. É possível arrastar uma aula para outro dia ou editar pelo formulário.

![Calendário da coordenação](manual/telas/14-coordenador-calendario.jpg)

## Como o ProFly indica professores (árvore de decisão)

Para cada professor e oferta, o ProFly responde uma sequência de perguntas de sim ou não. Todas são respondidas, e cada uma termina em uma de quatro situações:

| Situação | Significado | Efeito |
| --- | --- | --- |
| Sim | A condição foi atendida. | Segue. |
| Não | A condição impede a alocação. | Professor **não elegível**. |
| Pendente | Falta dado do professor ou análise da coordenação. | Professor **pendente**. |
| Configuração pendente | Falta configurar o curso ou a instituição. | Ninguém fica elegível até resolver. |

![Motivos de um professor](manual/telas/13-arvore-motivos.jpg)

As perguntas, em ordem, e quem resolve quando a resposta não é "sim":

| Pergunta | Quem resolve |
| --- | --- |
| O professor tem vínculo aprovado no curso? | Coordenação (Professores) |
| A ficha de critérios da disciplina está revisada? | Coordenação (Disciplinas) |
| A grade do período está revisada e os encontros definidos? | Administração (Períodos e grade) |
| O perfil atual foi analisado neste curso, para esta disciplina? | Coordenação (Analisar perfil) |
| Tem a formação mínima exigida? | Professor informa, coordenação confirma |
| Cada conhecimento obrigatório foi confirmado no nível mínimo? | Coordenação confirma na análise |
| Tem a experiência mínima exigida? | Professor informa, coordenação confirma |
| A disponibilidade cobre todos os encontros? | Professor (Disponibilidade) |
| Está livre nesses horários em todos os cursos? | Coordenação (escolher outro horário ou professor) |
| A turma está livre nesses horários? | Coordenação |
| Fica dentro do limite semanal de carga? | Administração (Carga docente) |

Entre os elegíveis, a pontuação ordena os candidatos: conhecimentos desejáveis (60), experiência docente (25) e experiência profissional (15), conforme a ficha da disciplina. **Esses pesos são uma proposta para revisão com a coordenação**, e a pontuação não atribui aulas sozinha: a decisão é sempre da coordenação.

## Administração

| Cursos | Coordenadores |
| --- | --- |
| ![Cursos](manual/telas/20-admin-cursos.jpg) | ![Coordenadores](manual/telas/21-admin-coordenadores.jpg) |

| Períodos e grade | Carga docente |
| --- | --- |
| ![Períodos e grade](manual/telas/22-admin-periodos.jpg) | ![Carga docente](manual/telas/23-admin-carga.jpg) |

- **Cursos**: criar, renomear e desativar.
- **Coordenadores**: convidar por e-mail para um ou mais cursos. O link de ativação aparece na tela para ser enviado à pessoa.
- **Competências**: catálogo usado nos perfis e nas fichas das disciplinas.
- **Períodos e grade**: vigência, fuso, blocos de horário e situação da grade. Com ofertas já criadas, ainda é possível renomear, revisar a grade, incluir blocos e ampliar a vigência; mudanças que deixariam aulas fora da grade são recusadas.
- **Carga docente**: busque o professor por nome ou e-mail e defina o limite semanal e a vigência. Sem esse limite o professor não fica elegível.

## Perguntas frequentes

**O professor se cadastrou, mas não aparece para alocar.** Ele precisa ser aprovado no curso (Professores → Analisar perfil). Depois, a árvore mostra o que falta.

**Todos aparecem como "Configuração pendente".** Confira se a ficha da disciplina e a grade do período estão revisadas e se o professor tem limite de carga.

**O professor mudou o horário e sumiu da lista?** Não deve sumir: horário não exige nova análise. Se ele mudou formação, conhecimento ou experiência, precisa reenviar o perfil e a coordenação analisa de novo.

**Por que a publicação foi recusada?** A mensagem lista cada alocação que impede a publicação e o motivo. A publicação é tudo ou nada, para a escala nunca ficar pela metade.

**Posso fazer cadastro sem e-mail configurado?** Sim. Sem envio de e-mail, o cadastro completo cria a conta na hora e o pedido vai direto para a coordenação. Recuperação de senha e troca de e-mail continuam dependendo do envio de e-mail.

## Como executar

Requisitos: Node.js 24, pnpm e acesso ao MongoDB (Atlas ou local com replica set).

1. Na raiz: `npm ci`. Em `backend`: `pnpm install`.
2. Copie `backend/.env.example` para `backend/.env` e preencha `MONGODB_URI` e `MONGODB_DATABASE`. Para apresentar sem e-mail, mantenha `EMAIL_TRANSPORT=disabled`.
3. Em `backend`: `pnpm dev`. Na raiz: `npm run dev`. Abra `http://127.0.0.1:5174`.

No Atlas, o IP do computador precisa estar liberado em **Network Access**. Se o servidor mostrar `querySrv ECONNREFUSED` no Windows, troque o endereço `mongodb+srv://` pelo formato direto com os três hosts do cluster (`mongodb://usuario:senha@host1:27017,host2:27017,host3:27017/?tls=true&authSource=admin&replicaSet=...`), que o Atlas mostra em *Connect → Drivers* ao escolher uma versão antiga do driver.

Sem administrador no banco, crie o primeiro com `pnpm create-admin` em `backend`, definindo `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD`. Mais detalhes em [backend/README.md](../backend/README.md).
