# Estratégia de preço

Complementa `README.md` (números, fases, prioridade), `gtm.md` (canais, mensagem,
portões), `offer-page.md` (a página) e `gtm-motions.md` (quais motions). Este
documento responde a uma pergunta que os outros quatro deixaram aberta: **em que
unidade se cobra, como os degraus são justificados, e como se descobre se o preço
está certo.**

## Hierarquia de verdade

Os **números** de preço continuam em `README.md`. Este documento não os substitui e
não os contradiz: ele **implementa** a base de cálculo que o `README.md` já
declara e que `offer-page.md` nunca explicitou. Onde este documento propõe um
número fora da faixa de `README.md`, a proposta está marcada **[PROPOSTA]** e exige
edição do `README.md` antes de virar preço de página. Se houver conflito,
`README.md` vence.

Os preços de A, B e C aqui são **hipóteses**, não medições. A Fase 0 existe para
substituí-los. A única exceção são os preços de concorrentes, que são públicos e
verificados na §3, com data e fonte.

---

## Decisão em uma linha

**Modelo: baseado em valor, com métrica por entrega — e três modelos diferentes,
não um.** A é serviço por episódio entregue através do portão; B é licença
única em degraus por número de séries; C é projeto institucional com
remanutenção anual. Não é um SaaS com quatro planos, e chamar isso de "tiered
pricing" seria a maior mentira da página: as três ofertas têm ciclos de venda
diferentes (2–6 semanas, ~1 semana, 3–9 meses) e compradores diferentes
(`gtm.md` §1), o que é a definição de catálogo de ofertas, não de planos.

A métrica de valor que faltava, e que é a recomendação central deste documento:

| Oferta | Cobra-se sobre | Por que essa unidade |
| --- | --- | --- |
| **A** | episódio publicado que passa pelo portão | A cobrança acompanha o resultado entregue, não a hora. Se o episódio não passa no portão, não foi entregue |
| **B** | número de séries sob garantia + janela de atualização | A garantia é o que se vende, e garantia escala com número de séries cobertas |
| **C** | implantação institucional + reanálise anual | A obrigação legal é **recorrente**, então o preço recorrente é o honesto (§6.3) |

---

## 1. O ativo precificado, e o que o comprador está comprando

`README.md` já decidiu isto e não se repete: o código do player é público, sem
dependência de runtime e reimplementável. O que se vende é o **portão
determinístico** — schema, `preflight`, orçamentos de byte, matriz de 5
navegadores, auditoria WCAG versionada e a atualização dele.

A consequência de preço que os outros documentos nunca escreveram: **o comprador
não está comprando um artefato, está comprando um risco eliminado.** O artefato
tem preço de mercado e é piratável (€10,90/mês — §3.2). O risco eliminado não tem
substituto no mercado e não pode ser copiado em uma tarde. Todo preço abaixo está
ancorado no segundo, não no primeiro.

Três coisas que o preço **não** pode prometer, já decididas em `README.md` e
repetidas aqui porque preço é o lugar onde elas se perdem:

- **não** "WCAG 2.2 AAA conforme" — é afirmação de conformidade com exposição
  jurídica;
- **não** exclusividade ou invenção de mercado — a licença MIT deste repositório
  permite uso comercial por qualquer pessoa;
- **não** cobertura que o relatório não tem — o bundle no navegador não verifica
  navegador, Lighthouse, FPS, política de autoplay nem conformidade.

---

## 2. Degraus de preço

### 2.1 Oferta A — escada de episódio publicada

`README.md` diz "R$1.200–4.000 por episódio, conforme duração, número de quadros e
necessidade de áudio". `offer-page.md` diz "preço: não vendido como sob consulta".
Uma faixa de 3,3× sem base publicada **é** sob consulta. A correção é publicar os
degraus sobre a base que o `README.md` já declarava:

| Degrau | Base | Preço | Entregue |
| --- | --- | --- | --- |
| **A1 Curta** | até 20 quadros, sem áudio | R$1.200 | episódio publicado + relatório + Lighthouse anexados |
| **A2 Média** | 21–45 quadros, áudio opcional | R$2.400 | idem A1 + faixa de áudio e variantes leves |
| **A3 Longa** | 46+ quadros, áudio e transições próprias | R$4.000 | idem A2 + montagem de temporada fechada |

A base não é arbitrária: é a mesma unidade que o portão já mede. `budget.json`
define `frameBytes: 300000` e `initialSceneBytes: 1500000` — ou seja, o custo real
da entrega acompanha o número de quadros, e o degrau acompanha o custo. A escada
não é uma escala de "básico/pro/avançado"; é uma tabela de esforço verificável.

**Âncora:** A2 é o degrau do meio e deve ser apresentado como o padrão. A1 e A3
existem para dar escala ao A2, não para serem vendidos. Temporada fechada deve ser
cotada como `n × degrau`, o que transforma um projeto de R$36.000 em oito
contratos de R$4.500 em vez de uma negociação única — e é o que o
`gtm.md` §7 (capacidade de fundador) exige, porque cada episódio é uma entrega
separada com o seu portão.

### 2.2 Oferta B — três pontos, em degraus de garantia

`offer-page.md` já decidiu: três pontos de preço, não um. Falta a métrica e a
diferenciação. A diferenciação proposta **não é por número de features** (o kit
entrega o mesmo portão em todos os degraus — tirar o portão do degrau de entrada
destruiria a promessa), e sim por **escopo da garantia e janela de atualização**:

| Degrau | Métrica | BRL | USD | Garante até | Janela |
| --- | --- | --- | --- | --- | --- |
| **B1 Série** | 1 série | R$199 | US$39 | 1 título | 12 meses |
| **B2 Estúdio** | até 5 séries | R$299 | US$69 | 5 títulos | 12 meses |
| **B3 Catálogo** | séries ilimitadas | **R$499** | **US$119** | sem limite de títulos | 24 meses |

Diferenças entre os degraus, todas verificáveis pelo comprador:

- **B3** inclui uma sessão de implantação de 60 min e o bundle do relatório no
  navegador. É o degrau que compra **tempo do fundador**, e por isso o único que
  pode ser precificado acima do mercado de template.
- **Janela de atualização** é a diferença real entre B1 e B2, não o número de
  séries. Um kit sem atualização é o arquivo baixado que `gtm-motions.md` §8 já
  diagnosticou como risco de ativação.

**[PROPOSTA — exige editar `README.md`]** B3 a R$499/US$119 fica acima da faixa de
`README.md` (R$199–299 / US$39–79). A justificativa está na §3.2 e é verificável: a
faixa atual atravessa o teto do mercado de template (US$69), e um produto que
cobre exatamente o que o template não cobre não pode ser precificado como
template. Decisão do fundador: aceitar B3 acima da faixa, ou cortar B3 e manter
dois pontos. Não há terceira opção — B2 a US$69 sem B3 deixa a oferta sem topo e
sem âncora.

### 2.3 Oferta C — implantação + reanálise anual

`README.md` fixa R$8.000–30.000 por projeto mais retainer de manutenção. O que
faltava era a base do degrau e a métrica do retainer.

| Degrau | Escopo | Preço | Anos |
| --- | --- | --- | --- |
| **C1 Portal** | site institucional ou portal do acervo: dossiê, registro de auditoria, kit, implantação assistida | R$8.000 | — |
| **C2 Exposição** | C1 + registro de auditoria assinado + treinamento da equipe + manutenção | R$18.000 | 1 |
| **C3 Acervo** | multi-site + declaração de conformidade de escopo delimitado | R$30.000 | 2 |
| **Retainer** | reanálise, atualização do registro e acompanhamento de expiração de conformidade | R$1.200–3.600/ano | recorrente |

O retainer é a linha mais importante deste documento e é a única receita
recorrente contratual da operação. §6.3 mostra por que ela é legal e
calendarizadamente necessária, e não um artificio de receita recorrente.

**Base de preço do retainer:** 15% do valor de implantação é a convenção de
manutenção de software e justifica R$1.200 em C1 e R$2.700 em C2. É convenção de
mercado, **não** dado de mercado brasileiro verificado (§3.4). Tratar como hipótese.

---

## 3. Âncora e posicionamento competitivo

Todos os preços abaixo são públicos e foram lidos na fonte. Data da coleta:
**27/09/2026**. Esta é a única seção do documento com dado verificado.

### 3.1 Plataformas de hospedagem — o preço é zero e elas ficam com tudo

| Plataforma | Modelo | O que o autor paga |
| --- | --- | --- |
| **Webtoon Canvas** | 50% da receita líquida de anúncios | **nada** |
| **Tapas** | ~70% da receita de anúncios; US$0,07 por 1.000 impressões (valor fixo na ajuda oficial) | **nada** |
| **Inkitt** | sem corte na assinatura do autor; autor retém 100% do copyright | **nada** |
| **Comi/Zaela** | não publicado | — |

Fonte: `webtooncanvas.zendesk.com` (atualizado 2023-10-05), `help.tapas.io`
(art. 360007703773), `inkitt.com/terms`, `inkitt.com/writersblog` (14/05/2025).

Duas conclusões, e a segunda é a que abre a Oferta B:

1. **Nenhuma das três tem degrau pago para o autor.** Publicar é gratuito nas
   três. Não existe "Webtoon Pro". O que existe é o autor dando 30–50% da receita
   de anúncio e perdendo a posse do player.
2. **O preço zero delas é por um motivo estrutural, não por generosidade:** elas
   monetizam *acesso* (anúncio, conta, tracking). O produto deste repositório é o
   oposto — sem backend, sem conta, sem tracking, entrega estática. Não há como
   entrar no modelo delas sem adicionar exatamente as máquinas que o portão
   reprova. Concorrente não é quem tem preço menor; é quem tem **outro modelo de
   negócio incompatível**.

Isto é o que `README.md` já chamou de "esse é o espaço", agora com o número ao
lado. Um autor que hoje ganha 50% de anúncio e não consegue provar acessibilidade
pode deixar de ganhar os 50% e passar a ter a prova. **Esse é o cálculo que
justifica A e C.** B é o caso diferente: B compete com quem quer *não depender de
plataforma nenhuma*, e por isso compete com tema e com self-hosted, não com
Webtoon.

### 3.2 Tema WordPress — o concorrente copiável, e ele está quebrado

| Produto | Preço | Nota |
| --- | --- | --- |
| **Madara** (MangaBooth) | **US$59** | suporte por 1 ano, 1 domínio; sem qualquer claim de acessibilidade ou orçamento de byte na página do produto |
| Otaku (ThemeForest) | US$69 | — |
| Comicon (TemplateMonster) | US$39 | — |
| MangaStream/Themesia | US$14–17 | — |
| PluginsForWP (tema+plugin) | US$4,99 | — |
| **Comic Easel** | — | **removido do wordpress.org em 12/01/2024, "security issue"** |
| **ComicPress** | — | **não listado mais como plugin** |
| Cópia pirateada (ClubWPress) | €10,90/mês por 19.725 produtos | o preço real do piso |

Fontes: `mangabooth.com/product/wp-manga-theme-madara/`; `wordpress.org/plugins/comic-easel/`.

Leitura para o preço de B:

- A banda legítima observada é **US$14–69**, centrada em ~US$59, com suporte
  vendido em 6 meses a 1 ano. `README.md` já chama o template estático de
  copiável; a pesquisa confirma e adiciona que o **tier gratuito foi encerrado por
  segurança** e que a cópia pirateada custa €10,90.
- Portanto a faixa de `README.md` (US$39–79) **não é defensável como template** —
  US$14 e €10,90 a subcutem. É defensável apenas como garantia. Daí a proposta
  B3 acima da faixa (§2.2) e a nomeação dos degraus por garantia, não por
  features.
- Nenhum tema da lista menciona WCAG 2.2, orçamento de byte ou matriz de
  navegador. É o mesmo gap apontado em `README.md`, agora confirmado por
  ausência na página de venda de cada produto — ausência que é o argumento.

### 3.3 Self-hosted open source — o teto de recorrência

| Produto | Preço | Nota |
| --- | --- | --- |
| **Komga** | grátis, **não existe** Komga Pro | — |
| Kavita / Calibre-Web | grátis, open source | — |
| **Kavita+** | **US$4/mês** (US$2 o primeiro mês) | desbloqueia **só** conveniência: metadados externos, scrobbling, avaliações. Declara que *"nenhuma feature base do Kavita será bloqueada por assinatura"* |

Fontes: `komga.org`, `kavitareader.com`, `wiki.kavitareader.com/kavita+`.

Este é o **único preço recorrente publicado e verificável** em todo o conjunto
auto-hospedado, e ele écheckout com Stripe: US$4/mês, US$48/ano, para
funcionalidades que nunca tocam o leitor principal. Consequência direta e dura:

- Qualquer assinatura futura deste repositório (#4) tem uma **referência pública de
  teto de US$4/mês** para "o que um leitor de quadrinhos paga para mais". #4 já
  está travado atrás de #2 por decisão de `README.md`; esta referência diz que o
  teste de preço de #4 não é US$9–15/mês por conveniência de categoria, é US$9–15
  por **nenhum** motivo verificável. **Não construir narrativa de #4 sobre
  conveniência** — ela não existe.
- Em contrapartida, confirma que **quem paga para não depender de plataforma está
  dispose a pagar pouco por conveniência, e muito por garantia.** Isso valida a
  assimetria de B: entrada barata, topo caro, garantia como diferença.

### 3.4 Onde não há âncora — e isso é um problema, não um detalhe

Nenhum dos quatro grupos abaixo foi encontrado em fonte pública. Não foram
estimados, e **nenhum número de A ou C deve ser apresentado como ancorado** até
que sejam:

| Âncora necessária | Para quê | Status |
| --- | --- | --- |
| Banda de preço de kit/dev-toolkit em pagamento único | validar US$39–79 | **não encontrada** (buscadores bloquearam acesso automatizado) |
| Preço de auditoria WCAG freelance (por hora, por site) | ancorar A e C | **não encontrada** |
| Custo de site institucional pequeno (BRL) | ancorar A | **não encontrada** |
| Preço de auditoria + remediação em compra pública (PNCP/Compras.gov.br) | ancorar C | **não encontrado** |
| Comissão sobre assinatura no Inkitt | contexto | **não encontrada** (URL de contrato retorna 404) |

Isto é a maior lacuna deste documento e ela é consertável de graça. Caminho:
3–5 páginas de preço de consultorias brasileiras de acessibilidade, um registro no
PNCP e um guia de taxas do Workana ou 99freelas. Custo: uma tarde. Sem isso, os
preços de A e C são palpites sofisticados e as conversas de 20 minutos vão
descobrir isso na hora — que é exatamente o custo que o outbound existe para
evitar.

---

## 4. Sensibilidade a preço

**Não há dados de pesquisa. Um PSM (Van Westendorp) estatisticamente válido exige
~100 respostas; a operação produz 3–8 conversas em 45 dias.** Rodar um PSM aqui
produziria uma curva falsa com aparência de dado, e um preço errado com base em
número falso é pior que um preço errado sem base.

O que é viável, e o que fazer:

### 4.1 A sonda conversacional de 4 pontos

As quatro perguntas do PSM são executáveis dentro da conversa de 20 minutos, e a
**faixa de "caro demais" é a única que muda decisão**. Registrar à mão, uma linha
por conversa, no mesmo formato da folha de contagem de `gtm.md` §5:

| # | Pergunta, literal | O que registra |
| --- | --- | --- |
| 1 | "A partir de que valor isto deixaria de ser barato?" | teto do barato |
| 2 | "A partir de que valor pareceria um bom negócio?" | valor-alvo |
| 3 | "A partir de que valor começaria a hesitar?" | início da hesitação |
| 4 | "A partir de que valor simplesmente não compraria?" | piso de recusa |

Duas regras de uso que decidem se isto serve:

- **As respostas 2 e 3 são as que movem preço. 1 e 4 são contexto.** Se 2 e 3
  divergirem muito entre conversas, a proposta não é o problema — a
  segmentação é, e a ação é mudar a lista de nomes, não o preço (é a mesma lógica
  do portão de 14 dias de `gtm.md` §5).
- **Nunca apresentar preço antes da pergunta 4.** Perguntar preço depois de
  ancorar o comprador no teto deleta a leitura e produz um sim.

### 4.2 Por que A/B de página de preço é aritmeticamente impossível aqui

`gtm-motions.md` §3 excluiu mídia paga com o argumento correto, e o mesmo
argumento se aplica a teste de preço. Para detectar uma elevação relativa de 30%
sobre uma base de conversão de ~5%, com potência de 80% e α de 5%, é preciso
aproximadamente **1.500–2.000 visitantes por braço**. A operação tem 60 relatórios
em 45 dias no melhor cenário do portão. A/B de preço aqui mede ruído com dois
nomes, e a decisão errada resultante custa mais que o preço certo.

**A alternativa correta é preço sequencial por coorte, não A/B.** Vender A2 nas
primeiras 3 propostas, A3 nas 3 seguintes, e registrar taxa de aceitação por
degrau. Com n baixo isso não é prova, é **sinal de vida** — e o critério de
leitura é o mesmo do `gtm.md` §5: 0 aceitação em 3 propostas do mesmo degrau é
sinal, não estatística.

### 4.3 Leitura por faixa de preço de A

Sem dado de sonda, a leitura por competência é a única disponível, e ela é
simples: um degrau de A é defensável quando a alternativa do comprador — montar a
mesma entrega com um estúdio — custa mais que o degrau. É por isso que a escada
existe e por isso que A3 a R$4.000 é o degrau mais fácil de vender, não o mais
difícil: é o único em que o cliente não precisa acreditar no fundador.

---

## 5. Experimentos de preço

Cinco experimentos, ordenados pelo mais barato primeiro. Todos respeitam as restrições
já decididas: sem analytics no repositório, sem mídia paga, sem mais de ~4 h/semana
de aquisição (`gtm-motions.md` §4), e tudo medido na folha manual existente.

| # | Experimento | Onde | Custo | Sinal | Kill |
| --- | --- | --- | --- | --- | --- |
| 1 | **Sonda de 4 pontos** em toda conversa | `gtm.md` §1, etapa 1 | 0 | respostas 2 e 3 dentro de ±30% entre conversas | dispersão >2× após 8 conversas → é segmentação, não preço |
| 2 | **Escada de A publicada** em vez de faixa | `offer-page.md` §4 | 0 | ≥1 proposta aceita sem negociação de preço | 3 propostas, 3 negociações de preço → a escada não está comunicada |
| 3 | **Preço sequencial por coorte** (A2 → A3) | propostas | 0 | taxa de aceitação por degrau | 0/3 no degrau alto → degrau alto acima do valor, descer |
| 4 | **Qual dos três pontos de B é clicado** | página de oferta, contagem simples | 0 | distribuição de cliques entre B1/B2/B3 | 100% em B1 → B2 e B3 não estão comunicados |
| 5 | **Porta falsa do retainer** (R$1.200/ano, sem cobrança) | página de oferta, seção de objeções | 30 min | ≥1 resposta de instituições a "manutenção anual" | 0 em 30 dias → não há dor recorrente; C vira projeto único |

Sobre o 5: o repositório **não** ganha telemetria, e o `gtm.md` §9 proíbe
analytics. A porta falsa é um endereço de e-mail e uma frase — não um pixel. Se
alguém sugerir instrumentar isso no repositório, é `build.mjs` reprovando tracker,
como já está documentado em `gtm-motions.md` §8.

O experimento 4 é o único que produz dado de **escolha** em vez de registro de
conversão, e é o que justifica a decisão de três pontos já tomada em
`offer-page.md` §5. Um só ponto gera adivinhação; três geram dado.

---

## 6. A alavanca de preço que os documentos anteriores não tinham

`README.md`, `gtm.md` e `offer-page.md` constroem toda a narrativa de valor em
WCAG. Isso está certo e continua certo. Mas existe uma segunda obrigação legal,
**em vigor desde 17/03/2026**, que é digital, tem prazo, tem sanção e atinge
diretamente um webcomic de terror. Ela não aparece em nenhum dos quatro
documentos, e é a alavanca de preço mais forte disponível.

### 6.1 Lei 15.211/2025 — Estatuto Digital da Criança e do Adolescente

Fonte primária: `planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm`
(texto compilado). Entrada em vigor: **17/03/2026**, conforme a Lei nº 15.352/2026,
que alterou o prazo original de 6 meses. Em vigor na data deste documento.

**Art. 1º e parágrafo único** — a lei se aplica a produto de TIC direcionado a
crianças e adolescentes **ou de acesso provável por eles**, e define "acesso
provável" por três critérios cumulativos: probabilidade de uso e atratividade,
facilidade de acesso, e grau de risco à privacidade, segurança ou desenvolvimento
biopsicossocial. Um webcomic de terror satisfaz os três por construção:
atratividade alta, acesso trivial e risco temático evidente.

Obrigações que atingem um player de webcomic de terror, com o artigo exato:

| Artigo | Obrigação | Consequência de preço |
| --- | --- | --- |
| **8º II** | avaliação do conteúdo por faixa etária, compatível com classificação indicativa | o selo de faixa etária passa a ser artefato obrigatório, não opcional |
| **8º IV** | configuração por padrão que evite uso compulsivo | "sem autoplay, sem recompensa por tempo de uso" vira **propriedade legal**, não escolha de design |
| **8º V** | informar **amplamente** a faixa etária indicada no momento do acesso | aviso de faixa etária proeminente é requisito, não rodapé |
| **17 I, III, IV** | ferramentas de supervisão parental **acessíveis e fáceis de usar**; aviso claro quando ativas e quais configs foram aplicadas; limite e monitoramento de tempo de uso | o controlador de acessibilidade do repo (`a11y.js`) passa a ser o insumo de um requisito legal |
| **4º VII** | observar os princípios da **Lei 13.146/2015 (Estatuto da Pessoa com Deficiência)** | amarra acessibilidade e proteção infantil no mesmo contrato |
| **35** | sanções: advertência com 30 dias; multa de até 10% do faturamento do grupo no Brasil ou R$10–1.000 por usuário, **limitada a R$50.000.000 por infração**; suspensão; proibição de exercer a atividade | é isto que dá preço ao risco |
| **31** | relatórios semestrais de transparência para provedores com >1.000.000 usuários na faixa | acima do porte desta operação; registrado para não prometer |

**Precisão que não pode ser perdida:** o Art. 9º (verificação de idade confiável a
cada acesso, vedada a autodeclaração) **não** é a obrigação relevante aqui. O
gatilho do Art. 9º é conteúdo impróprio ou inadequado, e o §2º define isso
estreitamente como **material pornográfico ou vedado por lei**. Terror — sangue,
violência, morte — não se enquadra. Quem *precisa* do Art. 9º é o webcomic
pornográfico, e esse é um produto diferente.

Isso importa porque uma conversa de vendas que cita "verificação de idade obrigatória" para
um webcomic de terror **estará errado, e errado na direção que o comprador técnico
perceberá primeiro.** A alavanca honesta é Art. 8º, Art. 17 e Art. 35: avaliação
por faixa etária, supervisão parental acessível, configuração mais protetiva por padrão
(Art. 7º), e sanção. Dizer isso é mais forte do que dizer "cumprimos a lei
brasileira", porque é específico, verificável e o comprador pode conferir o
artigo.

### 6.2 A assimetria que sustenta o preço

O player deste repositório é **estático, sem backend, sem conta, sem tracking, sem
mecanismo de recompensa**. Art. 7º exige a configuração mais protetiva disponível
por padrão; Art. 17 IV exige limite de tempo de uso; Art. 8º IV exige evitar uso
compulsivo. Uma arquitetura sem conta e sem anúncio não tem o que configurar mal.

Isso não é apenas conformidade. É a **única assimetria de custo estrutural
verificável** contra os concorrentes, e ela funciona nos dois sentidos:

- **contra a plataforma:** Webtoon, Tapas e Inkitt monetizam acesso e tracking —
  exatamente as máquinas que o Art. 7º e o Art. 8º obrigam a restringir. Elas
  não podem adotar esta postura sem perder o modelo.
- **contra o tema e o self-hosted:** podem chegar a uma configuração aceitável,
  mas não têm nenhuma evidência versionada que prove que chegaram. `README.md` já
  diz que o portão é o que não se replica em uma tarde; esta lei explica por que
  isso importa mais agora do que em 2024.

Isto sugere um item de escopo, e ele é o achado mais acionável deste documento:
**o portão não verifica hoje nenhuma das obrigações da §6.1.** O que ele já tem
(`a11y.js`, `capabilities.js` com `reducedMotion`, `storage.js` sem tracking,
`index.html` com regiões ARIA) cobre parte do Art. 17 I e do Art. 4º VII por
consequência, não por verificação. Adicionar ao portão a checagem de
`classificação indicativa` presente e acessível, de aviso de faixa etária
proeminente, e de ausência de mecânica de recompensa, é trabalho pequeno e é a
única forma de a Oferta C reconstruir a promessa depois que a lei mudou o padrão
de mercado. **Não é uma feature, é uma reancoragem de preço.**

### 6.3 Decreto 5.296/2004 — a obrigação recorrente

Fonte: `planalto.gov.br/ccivil_03/_ato2004-2006/2004/decreto/d5296.htm` (texto
compilado, com alterações até o Decreto 10.014/2019).

| Artigo | Conteúdo | Uso comercial |
| --- | --- | --- |
| **13 §1º** | alvará de funcionamento, **ou sua renovação**, exige observar **e certificar** as regras de acessibilidade | **o gatilho anual.** Obrigação que se repete a cada renovação |
| **48** | após 12 meses, a acessibilidade deve ser observada **para obter financiamento público** (Art. 2º III) | dinheiro público condicionado a conformidade |
| **2º III** | aprovação de projeto com recursos públicos, inclusive de comunicação e informação, sujeita ao decreto | gate de aprovação, não apenas obrigação contínua |
| **3º** | sanções administrativas, cíveis e criminais | exposição real de sanção |

Aqui está a justificativa da **primeira linha de receita recorrente** da operação.
O `README.md` coloca C na Fase 3 (mês 5+) e a assinatura #4 muito mais
depois, e está certo em priorizar A+B. Mas observe o que a estrutura de preço
permite:

| Linha | Payback (`README.md`) | Recorrência | Custo de aquisição |
| --- | --- | --- | --- |
| A serviço | <1 mês | por projeto | outbound nomeado |
| B kit | 1 venda | **nenhuma** | US$0–15 |
| #4 assinatura | 4–7 meses | mensal | US$30–120, exige orgânico |
| #5 publicidade | ~18 meses | por impressões | exige tráfego |
| **C retainer** | **1–3 meses** | **anual, por obrigação legal** | já o mesmo outbound de A |

O retainer de C é a única linha que é simultaneamente **recorrente, barata de
vender (o mesmo interlocutor do projeto), e calendarizada por obrigação externa**.
`README.md` está correto em não abrir C antes do dia 90. Este documento adiciona
que, se a prioridade mudar de "primeira receita recorrente" para "primeira
receita", **C não é a última a abrir — é a primeira**, porque o projeto de C já
vende o retainer dentro da mesma proposta. Isso é uma **decisão do fundador**, não
uma correção: mudar a fase de C significa aceitar que o fundador está vendendo
projetos de R$8.000 em vez de episódios de R$1.200 para financiar a operação. Não
mudar é igualmente defensável.

**Ressalva honesta:** a aplicação do Art. 13 §1º depende da situação **física** da
instituição — alvará de funcionamento é licença de operação de estabelecimento.
Para um museu ou universidade em prédio público ela morde de verdade; para um
portal puramente digital, a obrigação que morde é o Art. 48 (financiamento), não o
Art. 13. Não prometer o alvará como gatilho sem checar a instituição concreta.

---

## 7. Riscos de preço

| Risco | Sinal precoce | Mitigação |
| --- | --- | --- |
| **Preço de B compete com template e perde** — US$39–79 contra US$14 e €10,90 | cliques distribuídos só em B1; objeção "por que não compro um tema" | nomear os degraus por garantia e não por feature (§2.2); B3 acima da faixa, que é a única forma de sair da comparação com o Madara |
| **Âncoras de A e C não existem** (§3.4) | três objeções de preço seguidas de silêncio em proposta | uma tarde em PNCP + 3 páginas de consultoria. Custo zero, e converte palpite em argumento |
| **Preço que vende tempo, não resultado** | A3 aceito sempre e A1 nunca; reclamação de "você cobrou por quadro que não entregou" | ancorar no orçamento de byte do `budget.json`, e a escada segue o custo real (§2.1) |
| **Alavanca legal citada errado** | alguém escreve "verificação de idade obrigatória" num e-mail de terror | Art. 9º não se aplica a terror; §6.1 é a formulação correta. Revisar copy com a tabela da §6.1 antes de publicar |
| **Conformidade afirmada** | copy usa "em conformidade" ou "conforme AAA" | `README.md` e `gtm.md` §3 já decidem; o preço não é exceção |
| **Portão não verifica a lei nova** | §6.2 — nada no gate checa classificação indicativa nem aviso de faixa etária | item de escopo, ver §6.2. Até existir, C **não** pode vender cobertura da §6.1 |
| **A queda de #4 fica sem teto** | surge conversa de plano de assinatura | Kavita+ a US$4/mês é o teto público de conveniência; #4 não pode ser vendido como conveniência (`README.md` mantém travado) |
| **C abre cedo demais e mata A** | proposta de C deslocando episódio no mesmo mês | o limite de 2 contratos de A simultâneos em `gtm.md` §7 vale para C também; C consome as mesmas horas |
| **Pirata a €10,90 vende o portão** | kit vendido abaixo de US$39 | não é problema de preço: a garantia é o que não vem no zip. Se o comprador comprar o pirata e não reclamar, ele nunca precisou da garantia |

---

## 8. Recomendação

```
Modelo recomendado: baseado em valor, métrica por entrega, três modelos
distintos (não um catálogo de planos).

Métrica de valor:
  A — episódio publicado que passa pelo portão
  B — número de séries sob garantia + janela de atualização
  C — implantação institucional + reanálise anual (gatilho legal)
```

| Tier | Preço | Segmento-alvo | O que inclui | Posicionamento |
| --- | --- | --- | --- | --- |
| A1 Curta | R$1.200 | criador solo, 1ª temporada | ≤20 quadros, sem áudio, relatório + Lighthouse | "O primeiro episódio que passa em tudo" |
| A2 Média | R$2.400 | criador / estúdio pequeno | 21–45 quadros, áudio, variantes leves | **âncora** — o padrão, apresentado como tal |
| A3 Longa | R$4.000 | estúdio, temporada fechada | 46+ quadros, transições próprias | "Temporada, não episódio" |
| B1 Série | R$199 / US$39 | criador técnico, 1 título | portão completo, 1 série, 12 meses | entrada sem risco de decisão |
| B2 Estúdio | R$299 / US$69 | agência pequena, indie | até 5 séries, 12 meses | **âncora de B** — preço no teto do mercado de template, com o que o template não tem |
| B3 Catálogo | R$499 / US$119 **[PROPOSTA]** | estúdio com catálogo | séries ilimitadas, 24 meses, implantação de 60 min | acima do mercado de template **de propósito**: não é template |
| C1 Portal | R$8.000 | universidade, pequeno museo | dossiê, registro de auditoria, implantação assistida | projeto único, sem recorrência |
| C2 Exposição | R$18.000 | museu, emissora, editora | C1 + registro assinado + treinamento + 1 ano | **retainer é a venda** |
| C3 Acervo | R$30.000 | multi-site | multi-site + declaração de escopo delimitado + 2 anos | preço por obrigação, não por esforço |
| Retainer | R$1.200–3.600/ano | qualquer C | reanálise, atualização do registro | calendarizado por Art. 13 §1º / Art. 48 |

**Premissas-chave:**

- B3 pode ficar acima da faixa de `README.md` → **decisão do fundador**; se
  recusar, cortar B3 e manter dois pontos, nunca três pontos dentro da faixa
  (§2.2, §3.2).
- A escada de A pode ser publicada sem mudar a faixa de `README.md` → ela já
  declara a base ("número de quadros e necessidade de áudio"), só não a publica
  (§2.1).
- Retainer a 15% da implantação → **convenção de mercado, não dado brasileiro**;
  confirmar com as 3 consultorias da §3.4.
- US$39–79 é banda válida para kit de pagamento único → **não confirmada**, todo
  o conjunto de busca bloqueou acesso automatizado. Tratar como hipótese (§3.4).
- A §6.1 (Lei 15.211/2025) cria procura endereçável → **não validada com
  comprador**. Testar na conversa antes de investir no escopo de gate da §6.2.
- C pode gerar a primeira receita recorrente no dia 90 → **decisão de fase, não
  de preço** (§6.3).

**Riscos:**

- B precificado como template → US$14 e €10,90 subcutem (§3.2) → nomear degraus
  por garantia; B3 acima da faixa.
- A e C sem âncora de mercado (§3.4) → PNCP + páginas de consultoria, uma
  tarde, antes da primeira proposta.
- Lei citada errado → Art. 9º não alcança terror (§6.1) → usar a tabela da §6.1
  como gabarito de copy.
- Vender conformidade que o portão não verifica (§6.2) → C não cobre a §6.1 até
  o gate existir.
- C canibaliza A (§6.3) → teto de 2 contratos de A simultâneos vale para C.

---

## Pendências

- [ ] Decisão do fundador: B3 acima da faixa, ou dois pontos (§2.2)
- [ ] Publicar a escada de A na página de oferta — substitui a faixa, sem editar
      o `README.md` (§2.1)
- [ ] **Uma tarde de pesquisa de âncora**: PNCP/Compras.gov.br para
      "auditoria de acessibilidade", 3–5 páginas de preço de consultoria
      brasileira, guia de taxas Workana/99freelas (§3.4). É a pendência de maior
      retorno do documento
- [ ] Acrescentar 4 colunas à folha manual: sonda 1, 2, 3, 4 (§4.1)
- [ ] Decisão de fase: C abre no dia 90 ou continua na Fase 3 (§6.3)
- [ ] Parecer jurídico sobre a aplicação da Lei 15.211/2025 a webcomic de terror,
      especificamente Art. 8º, 17 e 35 — **não** o Art. 9º. Antes de qualquer
      menção pública a essa lei (§6.1)
- [ ] Decidir se o portão passa a verificar classificação indicativa, aviso de
      faixa etária e ausência de recompensa (§6.2). É o item que decide se a
      Oferta C pode vender §6.1
- [ ] Contador de kits ativados (`gtm-motions.md` §8) correlacionado com o degrau
      de B comprado — para saber se a escada de B está comunicada
