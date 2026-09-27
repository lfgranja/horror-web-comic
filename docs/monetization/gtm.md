# Go-to-market

Complementa `README.md` (o que é vendido, por quanto, em que fase) e
`offer-page.md` (a página). Este documento responde às outras três perguntas:
**por onde o comprador chega**, **com que mensagem cada canal exige**, e **o que
fazer quando o portão da Fase 0 não abre**.

A priorização por motion — quais das sete motions de GTM esta operação roda, e em
que ordem — está em `gtm-motions.md`, que especifica as duas motions que aqui ficavam
implícitas (ABM e parceiros). Este documento continua sendo a autoridade sobre canal,
mensagem, contadores e portões.

Todos os números aqui são **hipóteses**. Nenhum foi medido. A função da Fase 0 é
substituí-los.

---

## Decisão em uma linha

**Outbound nomeado para o serviço (#1); o relatório funciona como prova, não como
filtro.** A oferta A precisa de um cliente, não de audiência — portanto o canal
primário é uma lista de 80–120 nomes que alguém manda mensagem um a um, não
conteúdo, não ads, não viralidade. O relatório de compatibilidade é a melhor
prova técnica que existe para um prospect cético, e é isso que ele é usado como.

Consequência: a operação não escala com esforço de marketing, escala com
**quantidade de conversas**. Se a pessoa não tem 6 horas por semana para
conversar, esta oferta não é para ela — e nenhum canal vai consertar isso.

---

## 1. Quem compra, e quem não

O erro mais caro desta operação é falar com a pessoa errada. São três
compradores distintos, com vocabulário, objeções e canais diferentes. Uma
página única (como a especificada) funciona porque a página *responde* a três
visitantes diferentes; uma mensagem única não funciona.

| | **A — Serviço por episódio** | **B — Starter Kit** | **C — Institucional** |
| --- | --- | --- | --- |
| Quem decide | Criador / estúdio de webcomic | Criador técnico, indie, agência pequena | Museu, universidade, emissora, editora |
| O que dói | Publicar e quebrar em 3 navegadores, perder leitor no 3G, não ter como provar a acessibilidade | Montar o player do zero e não ter orçamento de bytes nem matriz de navegador | Obrigação legal de acessibilidade sem time técnico interno |
| Objeção principal | "Eu não quero depender de você" | "Eu programo, faço o meu" | "Preciso de nota fiscal e garantia formal" |
| Canal primário | Outbound nomeado | Busca técnica + comunidades | Outbound institucional frio |
| Mensagem | **Você escreve; eu garanto que publicar não quebra** | **O portão, com o seu manifesto no lugar do meu** | **O relatório de auditoria que o seu jurídico vai pedir** |
| Duração do ciclo | 2–6 semanas | 1 semana | 3–9 meses |
| Aprovação necessária | O próprio criador | O próprio criador | Área jurídica + compras públicas |

### O não-comprador

**Leitor de webcomic de terror.** Ele é o público do *conteúdo* que a ferramenta
serve, não o público da ferramenta. Perseguir alcance de leitores produz
impressões bonitas, e-mail de criadores que nunca compram, e a sensação de ter
um negócio de mídia em vez de um negócio de infraestrutura. Publicidade e
patrocínio (#5) continuam sendo selo de credibilidade, não receita — e é esse o papel que
  o `README.md` já lhes deu.

A confusão entre leitor e comprador é o principal risco de medição deste
documento: todo o alcance de leitor entra no mesmo contador de "pessoas que
viram", e dilui a única métrica que importa (conversas iniciadas).

---

## 2. Canais

Prioridade explícita: poucos canais, bem executados. Um canal de 80%
esforço/resultado, dois de suporte, e o resto não começa.

### 2.1 Outbound nomeado — Oferta A (primário, começa na Semana 1)

Não é marketing de funil. É uma lista de nomes, e o primeiro entregável
da semana 1 é a lista, não a página.

**Construção da lista (40 min, uma vez):** plataformas de webcomic com
seções de terror e suspense; contas de webcomic no Instagram, TikTok e
Bluesky que publicam sozinhas e já têm problema visível de carregamento; estúdios pequenos
com 1–10 pessoas; autores que já publicaram em plataforma agregadora ou que já
migraram de uma plataforma para outra. Mirar **80–120 nomes**, com uma linha por
nome observando *por que aquele específico é um candidato* (o que publica, onde,
quanto parece técnico).

**A mensagem não é uma proposta.** É uma pergunta sobre o site deles, com uma
observação específica e um link para a prova. Três frases, sem preço, sem
CTA de compra.

| Atributo | Valor |
| --- | --- |
| Esforço | 2 h/semana, recorrente, para sempre |
| Custo | US$0 + tempo |
| Sinal de vida | ≥1 resposta em 30 mensagens enviadas |
| Kill | <2 respostas em 100 mensagens em 4 semanas → o problema não é o canal, é a segmentação ou a promessa |

Sequência: e-mail pessoal quando existir → DM na rede onde a pessoa publica →
comentário público com substância real e link, e só depois o e-mail. Cada
tentativa é uma nova abordagem, não a anterior reescrita.

### 2.2 Prova técnica reutilizável — alimenta A, B e C (primário, Semana 1)

O repositório é a prova e se atualiza sozinho. Isso já foi decidido e não muda.
O que falta é **tornar os artefatos encontráveis e citáveis**:

- `specs/001-cinematic-player/notes/wcag-aaa.md` e `notes/automated-validation.md`
  são evidência de auditoria versionada — é o ativo que sustenta a Oferta C e
  que responde à objeção de um comprador técnico;
- o relatório de compatibilidade executado no manifesto de um prospect, com o
  veredito anexado, é a peça de fechamento da Oferta A;
- um resumo de uma página para não-técnicos (dossiê de acessibilidade e
  desempenho, já listado como pendência em `README.md`) converte melhor um
  comprador de C do que um link para `docs/delivery.md`.

Cada mensagem de outbound carrega **uma** prova. Escolher entre três provas é
atrito; escolher a prova certa para a objeção é venda.

### 2.3 Relatório de compatibilidade como ímã — Oferta B (secundário, Semana 2)

O relatório é a maior intenção de compra possível, e é o ativo de SEO técnico
mais subaproveitado do projeto: responde a buscas que o público de
quadrinhos está digitando e não encontra resposta honesta —
`webtoon accessibility`, `comic reader lighthouse`, `avif webcomic
performance`, `WCAG webcomic`, `CLS comic reader`.

| Atributo | Valor |
| --- | --- |
| Esforço | 1 página por mês de conteúdo |
| Custo | US$0 |
| Sinal de vida | 5 relatórios/mês vindos de busca orgânica |
| Kill | 0 tráfego orgânico em 60 dias → o conteúdo técnico não encontra piso; parar de escrever e reinvestir em 2.1 |

Sequência real: 1) o bundle no navegador (a página única que lê o
`story.json` por `<input type="file">`), 2) a página do relatório como alvo de
busca, 3) a nota técnica. **A ordem importa**: sem o bundle no navegador, o
primeiro contato de um criador que não programa é um erro de instalação, e o
README já identificou isso como o maior vazamento de conversão da operação.

### 2.4 Comunidades — Oferta B (secundário, Semana 3)

Onde criadores de quadrinhos e desenvolvedores front-end realmente ficam:
Dev.to, Reddit (`r/webdev`, `r/comics`, comunidades de auto-publicação),
Discord de indie comics, Slack de frontend, e os comentários dos próprios
projetos públicos alheios.

Regra: **contribuir primeiro, vender por último**. Um post "compre meu kit"
no dia 1 em uma comunidade que não conhece o nome é ruído e queima o canal
para o resto da vida da conta. O que funciona é responder a uma pergunta real
sobre performance/acessibilidade com a resposta técnica e o link para o
repositório como evidência.

| Atributo | Valor |
| --- | --- |
| Esforço | 1 h/semana |
| Custo | US$0 |
| Sinal de vida | ≥1 venda de B atribuível a comunidade em 8 semanas |
| Kill | 0 vendas em 8 semanas e nenhum sinal de que a conversa persistiu → sair |

### 2.5 Checkout da Oferta B (secundário, Semana 2)

Decisão de checkout, distinta de "listar em marketplace" (que o `README.md`
mantém na Fase 2). Uma licença única sem backend, sem assinatura e sem cartão
entra em uma plataforma de pagamento de produto digital de terceiro
(Gumroad/Payhip/Lemon Squeezy) em minutos, com 95% de margem e sem manter
nada. O que se vende continua sendo responsabilidade, não código.

### 2.6 Outbound institucional — Oferta C (Fase 3, mês 5+)

Não começa antes. A Oferta C depende de nota fiscal (bloqueada por CNPJ/MEI)
e de estudos de caso que a Fase 1 produz. Canal quando começar: e-mail
para áreas de acessibilidade de museus, universidades com cursos de
design/didática, editoras e emissoras, mais o forwarding de quem já comprou A
ou B. O ativo de entrada é o registro de auditoria WCAG, não o pitch.

---

## 3. Mensagem por canal

Um princípio por linha. Princípio geral: **o prospect não deve precisar ler
mais de 30 segundos para decidir se isso é para ele.**

| Canal / etapa | O que se diz | O que nunca se diz |
| --- | --- | --- |
| Outbound, 1º contato | Uma observação específica sobre o site deles + uma pergunta | "Tenho uma solução", preço, tabela, "posso ajudar com performance?" |
| Outbound, 2º contato | O relatório rodando no manifesto deles, com o veredito | "Veja como fazemos" genérico |
| Página de oferta, seção 1 | O que é entregue, em uma frase | "player", "template", "landing page" |
| Página de oferta, seção 2 | CI, 5 navegadores, auditoria, orçamentos, links para o repositório | Print estático desatualizado |
| Relatório / bundle | "Isto é o que a sua narrativa está errando. Isto é o que a ferramenta não consegue verificar." | Prometer cobertura de navegador, Lighthouse, FPS ou WCAG no bundle do navegador |
| Conversa (Oferta A) | "Você escreve e desenha. Eu monto a sequência e o portão de publicação." | "Posso fazer o seu site" |
| Conversa (Oferta B) | O que fica fora: hospedagem, publicação, arte, narração | Assinatura, teste grátis, cartão |
| Outreach institucional | "Isto é o registro de auditoria WCAG 2.2 que o seu jurídico vai pedir." | **"WCAG 2.2 AAA conforme"** — é afirmação de conformidade com exposição jurídica |

A última linha é a mais importante da tabela, porque é a que a equipe vai
querer quebrar primeiro. Vende-se **"AA verificado por auditoria, alvo AAA, com o
registro da auditoria anexado"** e assina-se declaração de conformidade de
escopo delimitado. A distinção já está decidida em `README.md`; repetida aqui
porque mensagem é o lugar onde ela se perde.

---

## 4. Entradas do funil

O relatório **não** é o portão de entrada de todos os leads. Isso é tentador
(uma métrica, uma ferramenta, um lugar) e está errado:

- **Entrada técnica (relatório/bundle):** o prospect já publica, já tem um
  player ou um manifesto, e quer prova. Serve A e B.
- **Entrada de conversa (página de oferta, CTA de chamada):** o criador tem
  quadros prontos e quer saber se funciona, e não tem nada instalado. Serve
  A. É a entrada mais valiosa e a que o ímã está servindo mal.
- **Entrada institucional (e-mail com uma pergunta de qualificação):** serve
  C, a partir da Fase 3.

Forçar o não-técnico a rodar Node 20 + ffmpeg + Playwright para chegar a uma
conversa de 20 minutos é a forma mais direta de perder a Oferta A inteira. A
evolução (1) do `README.md` — bundle no navegador, sem upload, sem backend —
é o item de maior impacto da Fase 0 e precisa entrar na Semana 1, não depois
do portão de 20 relatórios.

---

## 5. Métricas e portões

Sem analytics na v1, como decidido em `offer-page.md`. Uma folha manual, uma
linha por evento, com **canal de origem anotado** — o canal é a única dimensão
que o contador manual não pode perder, porque sem ele não há como escolher onde
gastar a hora da semana 9.

### Contadores (manuais, 3 por `offer-page.md` + canal)

| # | Métrica | Meta Fase 0 (14 d) | Meta Fase 1 (45 d) |
| --- | --- | --- | --- |
| 1 | Relatórios executados (por canal) | 20 | 60 |
| 2 | Conversas iniciadas (por canal) | 3 | 8 |
| 3 | Relatórios → conversa | ≥1 de 20 | ≥3 de 60 |
| 4 | Conversa → proposta enviada | — | ≥3 de 8 |
| 5 | Vendas fechadas, por oferta | — | ≥1 A **e** ≥5 B |

A métrica 3 é a única que diagnostica mensagem contra canal. Se há 20
relatórios e zero conversas, o relatório não está sendo usado como prova na
conversa — ou a página não o menciona, ou ele está depois da lista de preços.

### Portões de decisão

| Quando | Portão | Ação se falhar |
| --- | --- | --- |
| Dia 14 | ≥20 relatórios **ou** ≥3 conversas | Muda-se a promessa. **Não** se constrói ferramenta nova. O que muda a promessa: a lista de nomes, a frase do 1º contato, o título da página. |
| Dia 30 | ≥1 conversa vinda de entrada de conversa (sem relatório) | O bundle no navegador vira o item #1 absoluto do dia 31–60 |
| Dia 45 | ≥1 cliente pago **e** ≥5 vendas do kit | Um em zero: mata uma oferta e dobra na outra. (Já decidido em `README.md`.) |
| Dia 90 | ≥1 cliente pago, ≥5 vendas de B, relatório com tráfego orgânico, 1 case study escrito | Considerar Oferta C. Abaixo disso, continuar em A+B sem abrir C. |

O teste de 14 dias é o mais importante do documento porque é o mais difícil de
respeitar: o pull natural é *construir a ferramenta de captura em vez de mandar
as 100 mensagens*. A página de oferta e o bundle são suficientes para o
portão de 14 dias. Nada além disso precisa existir antes do dia 14.

---

## 6. Roadmap de 90 dias

| Janela | Foco | Entregável | Portão de saída |
| --- | --- | --- | --- |
| **Semana 1** | Nada de página ainda. Construir a lista. | Lista de 80–120 nomes com uma linha de observação cada; escolher os 10 primeiros; dossiê de 1 página extraído de `docs/delivery.md` + `notes/wcag-aaa.md` | 10 mensagens personalizadas prontas |
| **Semana 2** | Primeiro contato e material de captura | 30 mensagens enviadas; página de oferta publicada **fora** do repo, com as 8 seções; checkout de B configurado | ≥1 resposta |
| **Semana 3** | Entrada de conversa + ímã | Bundle do relatório no navegador (página única, `<input type="file">`, zero backend); 30 mensagens adicionais | 1 conversa que não passou pelo relatório |
| **Semana 4** | **Portão de 14 dias** | Folha de contagem manual com canal | **≥20 relatórios ou ≥3 conversas.** Ou mudar a promessa. |
| **Semana 5–6** | Conversão de A | 1 proposta formal enviada com escopo, prazo, preço e contrato de propriedade de quadros; showreel de 90 s | Proposta aceita |
| **Semana 7–8** | Volume de B | 2 posts técnicos (performance/acessibilidade de webcomic) como alvo de busca; presença em 2 comunidades; primeira venda de B | ≥5 vendas de B |
| **Semana 9** | Escolha de canal | Consolidar os contadores por canal e dobrar no de melhor razão conversa/esforço | Canal escolhido e o outro reduzido a 1 h/mês |
| **Semana 10–12** | Prova | 1 case study de A publicado (com o relatório e o Lighthouse anexados) | Case study no ar |
| **Semana 13** | **Portão de 90 dias** | Decisão: abrir C, continuar A+B, ou dobrar | — |

Sequência deliberada: a lista vem antes da página, e a página vem antes da
ferramenta de captura. O inverso — construir a página, a ferramenta e o
funil antes de ter 10 nomes — é a forma comum de passar três meses com um
funil perfeito e zero conversas.

---

## 7. Riscos

| Risco | Sinal precoce | Mitigação |
| --- | --- | --- |
| **O ímã assusta o comprador certo.** Node + ffmpeg + Playwright exclui quem não programa — que é o comprador de A. | Relatórios >> conversas; 0 conversas sem relatório | Bundle no navegador na Semana 3 (decisão de roadmap, não de backlog) |
| **Capacidade de fundador.** A e B em paralelo disputam as mesmas horas; 2 episódios no mesmo mês param o trabalho de B. | Atraso em post técnico ou em mensagem da semana | Limite de 2 contratos de A simultâneos; horas de entrega de A reservadas antes de aceitar o próximo A |
| **Copy-paste do código.** A licença MIT permite revenda por qualquer pessoa. | Kit vendido a preço abaixo do piso | A defesa é de escopo, não jurídica: vender atualização, suporte e garantia de que passa no portão. E nunca claim de exclusividade |
| **Exposição jurídica de conformidade.** | Alguém escreve "AAA conforme" na página ou no e-mail | Revisão de toda copy pública antes de publicar; a tabela da seção 3 é o gabarito; declaração de escopo delimitado em A, B e C |
| **Afastar-se do público.** Esforço vai para conteúdo de leitor em vez de conversa de comprador | Impressões crescem, conversas não | O não-comprador da seção 1; alcance de leitor não entra em nenhum contador |
| **Construir antes de vender (#4, assinatura).** | Tentativa de desenhar o plano de assinatura antes do dia 90 | `#4` continua travado atrás de `#2`; assinatura sem audiência é o pior primeiro movimento |
| **Sem nota fiscal.** | Surgiu proposta de C ou parceria que exige NF | CNPJ/MEI é pendência de 1–2 dias, sem custo, e não bloqueia A nem B. Resolver antes do portão de 90 dias |
| **Relatório como promessa.** O bundle não verifica navegador, Lighthouse, FPS, autoplay nem WCAG. | Alguém escreve "o relatório garante acessibilidade" | O relatório declara o que **não** verifica. Essa honestidade é parte da proposta e não se remove para melhorar conversão |

---

## 8. Dependências fora deste repositório

`build.mjs` reprova referências externas e `preflight` reprova `scripts.ci`
mascarado. Portanto **nada** disto entra no repositório: página de oferta,
página do ímã, checkout, formulário, e qualquer analytics. Dependências:

1. Hospedagem estática para duas páginas (a página de oferta e a do ímã) —
   bucket/CDN com TLS, sem backend;
2. O bundle do validador, extraído de `scripts/compatibility-report.mjs` para
   rodar no navegador — extração, não reimplementação, para que a paridade com o
   portão do build seja a mesma hoje e amanhã;
3. Um formulário de um campo via serviço externo, ou um `mailto:`;
4. Um endereço único de contato;
5. Um checkout de produto digital de terceiro para B.

O repositório continua sendo a prova. A estratégia continua sendo executada
nele.

---

## 9. O que não fazer

- Não abrir canal pago antes do portão de 45 dias. Sem conversão
  conhecida, anúncio compra aprendizado que a conversa de 20 minutos dá
  de graça.
- Não comprar lista de e-mail, não fazer SEO de volume antes do relatório
  existir como página, não abrir twitch/youtube.
- Não correr A e B com a mesma mensagem. O criador que quer contratar e o
  criador que quer comprar o kit estão em momentos diferentes do mesmo
  problema, e um dos dois vai achar a página confusa.
- Não aceitar cliente de A sem escopo, prazo e preço por escrito. O README já
  decidiu o contrato de propriedade de quadros; a negociação verbal é onde
  esse contrato morre.
- Não usar o relatório como única entrada. Ele é a melhor prova que existe e o
  pior filtro que existe.

---

## Pendências

- [ ] Definir os 80–120 nomes da lista de outbound (Sprint de 40 min, não
      adiar para "pesquisar mais")
- [ ] Dossiê de acessibilidade e desempenho de 1 página (extração, não escrita
      nova — `docs/delivery.md` e `notes/wcag-aaa.md` já têm o material)
- [ ] CNPJ/MEI — antes do portão de 90 dias, bloqueia apenas C
- [ ] Extrator do relatório para o navegador (decisão de roadmap da Semana 3)
- [ ] Folha de contagem manual com coluna de canal
- [ ] Escolha de plataforma de checkout para a Oferta B
