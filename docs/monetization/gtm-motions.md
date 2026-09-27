# Priorização por motion de GTM

Complementa `README.md` (o que é vendido, por quanto, em que fase), `gtm.md` (canais,
mensagem, portões e roadmap) e `offer-page.md` (a página). Este documento responde a uma
pergunta só: **qual das sete motions de go-to-market esta operação deve rodar, e em
qual ordem.**

`gtm.md` já decidiu canal por canal. O que ele não tinha é um critério explícito de
escolha, e três motions nunca nomeadas — uma delas já sendo executada sem saber que
existia.

## O que este documento não é

- **Não substitui `gtm.md`.** Especificação de canal, tabela de mensagem por canal,
  contadores e portões continuam lá e continuam autoritativos.
- **Não repropõe o roadmap de 90 dias** (§6 de `gtm.md`). Nada aqui muda a sequência
  lista → página → ímã, nem o portão de 14 dias.
- **Não é uma segunda fonte de verdade.** Todo dado de produto aqui é citado, não
  repetido como fato novo. Se este documento e `README.md` divergirem, `README.md`
  vence.
- **Não reabilita canal pago nem assinatura.** As duas exclusões de `gtm.md` §9 foram
  testadas contra o framework e sobreviveram (ver §3, motions 3 e 7).

Todos os números continuam sendo hipóteses. A Fase 0 existe para substituí-los.

---

## 1. Step 1 — Características do produto

Derivado de `README.md` e `gtm.md` §1. Citado, não reinventado.

| Atributo | Valor | Fonte |
| --- | --- | --- |
| Ofertas | A serviço por episódio, B Starter Kit, C institucional | `README.md` |
| Ticket | R$1.200–4.000/ep · US$39–79 · R$8.000–30.000/projeto | `README.md` |
| Margem | 70–85% · ~95% · ~85% | `README.md` |
| Ciclo de venda | 2–6 semanas · ~1 semana · 3–9 meses | `gtm.md` §1 |
| Times de compra | 3 (criador, criador técnico, instituição) | `gtm.md` §1 |
| Equipe | 1 fundador | `gtm.md` §7 (capacidade de fundador) |
| Capacidade de conversa | ~6 h/semana como teto | `gtm.md` (decisão em uma linha) |
| Orçamento de mídia | ~US$0 | `gtm.md` §9 |
| Ativo vendável | O portão determinístico, não o código | `README.md` |
| Restrição dura | Página, formulário, checkout e analytics vivem **fora** do repositório | `README.md` (Restrições) |

Duas linhas dessa tabela decidem quase toda a pontuação: **orçamento zero** e
**capacidade de seis horas**. Qualquer motion que exija escala de mídia ou uma equipe
de vendas não é Candidata, por melhor que pontue no encaixe de produto.

## 2. Step 2 — Condições de mercado

- **Três compradores, três vocabulários** (`gtm.md` §1). Uma motion que force mensagem
  única perde dois dos três.
- **O conjunto de busca técnica é defensável** porque os concorrentes não o ocupam.
  Webtoon, Tapas e Inkitt não publicam conteúdo de performance nem de acessibilidade, e
  temas como Madara não publicam orçamento de bytes. Ninguém disputa `webcomic
  accessibility` ou `comic reader lighthouse`.
- **O não-comprador existe e é o público mais visível** (`gtm.md` §1): leitor de
  webcomic de terror. Alcance de leitor não entra em contador nenhum.
- **O atrito técnico é o maior vazamento conhecido** (`README.md`, ímã de captura): o
  relatório exige Node 20, ffmpeg e Playwright, e o comprador da Oferta A é justamente
  quem não programa.
- **C está travado fora de A e B por dois motivos independentes**: nota fiscal
  (CNPJ/MEI) e ausência de estudos de caso.

## 3. Step 3 — Scorecard das sete motions

Escala 1–10 = encaixe para *esta* operação, neste estágio. A coluna final é a
veredito; as três colunas da esquerda dizem **para qual oferta a motion serve**, porque
a mesma motion pode ser primária numa oferta e ruído em outra.

| # | Motion | A — Serviço | B — Starter Kit | C — Institucional | Veredito |
| --- | --- | --- | --- | --- | --- |
| 1 | Inbound (conteúdo, SEO técnico) | 2 | 7 | 4 | secundária (B) |
| 2 | **Outbound nomeado** | **9** | 4 | 8 | **primária (A)** |
| 3 | Mídia paga | 1 | 3 | 2 | **excluída** |
| 4 | Comunidades | 3 | 7 | 1 | suporte (B) |
| 5 | Parceiros | 4 | 5 | 6 | **especificada aqui, Fase 2+** |
| 6 | **ABM** | 5 | 2 | 9 | **especificada aqui, C** |
| 7 | PLG | 1 | 5 | 1 | não é motion de aquisição ainda |

Racional, uma linha por motion:

**1 — Inbound.** Para A é quase irrelevante: a Oferta A precisa de um cliente, não de
seguidores, e conteúdo leva meses para virar conversa. Para B é forte, e por um motivo
específico: as buscas que o público de quadrinhos já digita (`WCAG webcomic`,
`avif webcomic performance`, `CLS comic reader`) não têm resposta honesta publicada. O
relatório de compatibilidade é o ativo, e ele se atualiza sozinho com o repositório.
Cobra 1 página/mês, o que cabe.

**2 — Outbound.** Primária para A porque o custo marginal é tempo e a lista é
construível em 40 minutos (§2.1 de `gtm.md`): 80–120 nomes, uma observação específica
cada. A oferta A de ticket baixo não justifica prospecção fria de venda; justifica
perguntar sobre o site da pessoa. Continua sendo o canal primário de C, e a
especificação completa desse uso está na §6 deste documento.

**3 — Mídia paga. Excluída, e o framework concorda.** Orçamento zero elimina a motion.
O segundo motivo é mais forte que o primeiro: sem dado de conversão, anúncio compra
aprendizado que a conversa de 20 minutos dá de graça, e a 20 minutos é o único dado que
esta operação produz. Reavaliação só depois do portão de 45 dias, com conversão conhecida.

**4 — Comunidades.** Baixa para A porque comunidade gera indicação, não a venda de
R$1.200–4.000 que precisa de escopo, prazo e proposta. Alta para B: a resposta técnica
com link para o repositório é a postagem de maior credibilidade disponível em r/webdev
e similares, e CAC é praticamente zero. Custa 1 h/semana.

**5 — Parceiros.** 5, mas o número é o menos informativo da tabela: a motion vale pelo
tipo de parceiro, não pelo volume. Dois parceiros reais existem e nenhum estava escrito
— especificados na §7. Não começa antes da Fase 2, porque um parceiro sem caso de uso
para mostrar não tem o que revender.

**6 — ABM.** 9 em C e é a maior lacuna deste documento. Compra de R$8.000–30.000 com
ciclo de 3–9 meses e aprovação de três áreas não é uma motion de lista, é conta a
conta. Detalhado na §6. Vale registrar que as motions 2 e 6 já estão, de fato,
operando: uma mensagem nominal para um criador específico é ABM em escala um, e a
institucional do §2.6 de `gtm.md` é ABM sem o nome. Nomear isso muda o que se escreve.

**7 — PLG.** 1 para A e C, porque nenhuma das duas é self-service. 5 para B: o checkout
de pagamento único com 95% de margem e zero backend **já é** conversão PLG — venda sem
nenhuma intervenção de vendas. O que falta não é a motion, é a métrica que distingue
quem comprou de quem publicou. Ver §8.

## 4. Step 4 — Motion stack

| Papel | Motion | Ofertas | Esforço |
| --- | --- | --- | --- |
| **Primária** | Outbound nomeado | A (e C, a partir da Fase 3) | 2 h/semana, recorrente |
| **Secundária 1** | Inbound técnico (SEO + relatório como ímã) | B | 1 página/mês |
| **Secundária 2** | Comunidades | B | 1 h/semana |
| **De instrumentação** | PLG (ativação) | B | contagem manual |
| **Especificada, Fase 3** | ABM | C | por conta |
| **Especificada, Fase 2+** | Parceiros | B, C | 30 min/semana |
| **Excluídas** | Mídia paga, assinatura | — | — |

Soma em operação: ~4 h/semana de acquisition, contra o teto de 6 h. O resto da semana
é entrega de A. Não sobra margem para uma quinta motion, e essa é a razão pela qual
parceiro e ABM são Fase 2 e 3 e não concorrentes de A e B agora.

A pergunta "qual motion ganha a hora da semana 9" já tem dono em `gtm.md` §6: os
contadores consolidados por canal, dobrando no de melhor razão conversa/esforço. Este
documento não redefine esse critério — só classifica o que está sendo medido.

## 5. Motion 2 em A — o que não mudou

Para não deixar dúvida: a primária continua sendo uma lista de 80–120 nomes e mensagens
uma a uma, com a mensagem sendo uma pergunta sobre o site da pessoa e uma prova
anexada. Tudo isso está em `gtm.md` §2.1 e §2.2 e **não é reescrito aqui**.

O que §6 acrescenta é a segunda metade dessa primária: o uso institucional, que `gtm.md`
§2.6 descreve em quatro linhas de e-mail.

## 6. Motion 6 — ABM, especificação

### Por que ABM e não "outbound institucional"

Três diferenças, e cada uma muda o que se escreve:

1. **Um mercado por conta.** A instituição não é um lead; é um sistema com dono da
   exigência, dono da assinatura e dono da construção, e eles não são a mesma pessoa.
2. **O conteúdo é por conta.** Não é a mesma página para todos, e o material que
   convence a área de acessibilidade não é o material que libera a compra.
3. **A cadência é longa e a saída é rarefeita.** 3–9 meses, com janela de compras
   públicas. Isso inverte a métrica: não se conta respostas, conta-se avanço de estágio.

### As três linhas

| Thread | Pergunta que essa pessoa faz | Conteúdo que essa pessoa precisa | Bloqueio próprio |
| --- | --- | --- | --- |
| **Acessibilidade / conformidade** | "Isto satisfaz a norma que me obrigam?" | Registro de auditoria, dossiê de 1 página, escopo do que **não** é verificado | é quem pede a auditoria |
| **Jurídico / compras** | "Quem assina, com que risco, e quem paga?" | Declaração de conformidade de escopo delimitado, escopo e prazo | **exige CNPJ/nota fiscal** |
| **Técnico** | "Cabe no que eu tenho?" | Relatório rodado no ativo que a instituição já tem, matriz de navegador | é quem decide se o projeto vira |

O erro previsível é tratar as três como um e-mail só. A segunda thread é a que trava o
negócio, e é a única que não se destrava com mais conteúdo — destrava com CNPJ.

### Conteúdo por conta

Três peças, na ordem em que cada thread as pede:

1. **Dossiê de acessibilidade e desempenho, 1 página** — extração de
   `docs/delivery.md` e `specs/001-cinematic-player/notes/wcag-aaa.md`, não escrita
   nova. Já é pendência em `README.md`.
2. **Registro de auditoria anexado**, com o que ele não cobre visível no mesmo peso do
   que cobre. `notes/wcag-aaa.md` já é honesto por construção: ele declara que registra
   evidência automatizada e **não** afirma auditoria WCAG 2.2 AAA completa. É essa
   ressalva que sustenta a venda. Uma nota técnica que esconde a própria limitação
   perde para um comprador técnico na segunda conversa.
3. **Relatório de compatibilidade rodado no ativo que a instituição já tem** — site
   institucional, portal do acervo, página de exposição. Substitui o pitch pela
   pergunta: "isto é o que a sua narrativa está errando".

### Formulação

Herdada de `gtm.md` §3 e inegociável: **nunca** "WCAG 2.2 AAA conforme" nem
"conforme AAA". Vende-se "AA verificado por auditoria, alvo AAA, com o registro da
auditoria anexado", mais declaração de escopo delimitado. A tabela de §3 de `gtm.md` é
o gabarito.

### Atributos

| Atributo | Valor |
| --- | --- |
| Esforço | 2 h/semana a partir da Fase 3, por conta ativa |
| Custo | US$0 + tempo |
| Sinal de vida | ≥1 thread de conformidade responde em 3 meses |
| Kill | 0 respostas de qualquer thread em 6 meses → a instituição não é este mercado; manter A+B e não abrir C |

### Quando começa

Três condições, todas obrigatórias: **Fase 3** (portão de 90 dias de `gtm.md` §5
aprovado), **≥1 estudo de caso** publicado, e **CNPJ/MEI resolvido**. Começar antes
gera proposta que não pode ser assinada — a forma mais cara de descobrir que o
segmento era real.

## 7. Motion 5 — Parceiros, especificação

### Parceiro 1 — consultor freelance de acessibilidade (WCAG)

**Quem é.** O profissional que a instituição ou o estúdio já chama quando aparece a
pergunta "alguém pode revisar isto?". Ele já é a resposta padrão para a demanda que a
Oferta C atende — e hoje responde com horas, não com ferramenta.

**Por que o alinhamento é real.** Ele não quer construir portão de publicação; quer
entregar parecer e cobrar por isso. O dossiê e o registro de auditoria são insumo
dele, não concorrência. A Oferta C é o que ele não consegue produzir sozinho: a
exigência não é só o parecer, é a evidência de que a ferramenta passa no portão.

**O que ele recebe.** Dossiê de 1 página, registro de auditoria, e o relatório de
compatibilidade (CLI ou bundle) para rodar em cliente. É o mesmo kit de prova que a
Oferta A usa, sem a parte de produção.

**Economia.** Por projeto ou retainer, a definir na primeira conversa. **Sem claim de
exclusividade** — a mesma defesa de escopo que a Oferta B já usa contra a licença MIT:
o que se vende é responsabilidade, atualização e garantia, não exclusividade.

**Atributos.**

| Atributo | Valor |
| --- | --- |
| Esforço | 30 min/semana de contato, a partir da Fase 2 |
| Custo | US$0 + comissão por projeto |
| Sinal de vida | ≥1 consultor aceitando revender ou indicar em 6 semanas |
| Kill | 3 consultores recusam ou nenhum referral em 8 semanas → o canal não existe para esta operação |

### Parceiro 2 — criador que migrou de plataforma agregadora

Já está na lista de outbound do §2.1 de `gtm.md` como **lead**. Aqui é lido
diferente: o momento da migração é o momento da indicação. Quem já sentiu na pele a
falta de controle sobre o player sabe o que a Oferta A vende, sem precisar de
explicação.

O custo de transformar lead em parceiro é baixo: a mensagem de primeira contato é a
mesma, e a segunda traz o relatório no manifesto **deles** — que, para alguém que
migrou, é a prova de que o portão funciona fora da plataforma de origem.

**Atributos.** Esforço zero adicional (é o outbound que já existe). Sinal de vida: ≥1
indicação qualificada em 8 semanas. Kill: 0 indicações em 8 semanas → manter como lead
puro, sem custo.

### Parceiros que não são parceiros

- **Plataformas de hospedagem e agregadoras.** Competem pelo conteúdo. Um acordo
  co-marketing com quem tem o incentivo de manter o autor na plataforma não é parceria,
  é coincidência de interesses.
- **Lojas de tema WordPress.** O tema é exatamente o template estático copiável que
  `README.md` já nomeia como risco. Um parceiro cujo produto é a cópia da entrega não
  aumenta a credibilidade — aumenta a-contagem de quem pode fazer a mesma coisa.
- **Marketplace de plugins/apps.** `gtm.md` já posiciona listagem em marketplace na
  Fase 2, e é decisão diferente: marketplace é canal de distribuição, não parceiro com
  quem se conversa.

## 8. Motion 7 — PLG: ativação de B, não venda de B

O checkout de B é self-service, sem assinatura e sem cartão: **conversão PLG sem
nenhuma intervenção de vendas**. A motion já existe. O que não existe é a métrica que
diz se a venda virou uso.

O contador atual de `gtm.md` §5 mede **vendas fechadas**. Para B, isso só mede quem já
comprou — o que é a decisão deles, não o resultado. Um comprador que nunca publica um
episódio é o mesmo número que um comprador que publica um por semana, e a diferença
entre eles é a única coisa que separa o Starter Kit de um arquivo baixado.

**Contador proposto:** *kits ativados* = comprou **e** publicou um episódio pelo portão.
Autodeclarado, na folha manual existente. O repositório não muda: `build.mjs` reprova
analytics, e um pixel de conversão aqui seria tracker em repo que não aceita tracker.

**Status: diagnóstico, não portão.** Este contador **não** entra em `gtm.md` §5 e não
mexe em nenhum portão de decisão. Seção 5 de `gtm.md` continua sendo a única fonte de
portão; este número existe para responder "a venda está virando uso?", não "devo
mudar a estratégia?". Se um dia merecer virar portão, essa decisão é de `gtm.md` §5 e
não deste documento.

## 9. Pendências

- [ ] Dossiê de acessibilidade e desempenho de 1 página — pré-requisito das duas
      threads de conteúdo da §6 (já pendente em `README.md`; repetido aqui porque ABM
      depende dele)
- [ ] Identificar 3 consultores de acessibilidade para a motion de parceiro 1 (Fase 2)
- [ ] Folha manual: acrescentar coluna de kits ativados como diagnóstico, sem virar
      portão
