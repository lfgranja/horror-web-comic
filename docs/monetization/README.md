# Monetização

Documento de decisão. Nenhuma página de venda, página de captura ou integração de
pagamento vive neste repositório — ver [Restrições](#restrições-de-repositório).

## O ativo vendável

O código do player não é o produto. Ele é público, sem dependências de runtime e
reimplementável em poucas semanas. O que é defensável é o **portão determinístico
em volta dele**, e o repositório já o expõe inteiro:

| Peça | Onde | O que certifica |
| --- | --- | --- |
| Schema do manifesto | `specs/001-cinematic-player/contracts/` | A narrativa é válida e referenciável |
| `preflight` | `scripts/preflight.mjs` | A ferramenta abre e fecha cada navegador da matriz |
| `build` | `scripts/build.mjs` | Orçamentos de bytes reprovam a build |
| `build:images` | `scripts/build-images.mjs` | Variantes leves existem para todo asset |
| Lighthouse | `lighthouserc.json` | performance ≥0.9, a11y ≥0.95, CLS ≤0.1, LCP ≤2.5 s |
| `report` | `scripts/compatibility-report.mjs` | Diagnóstico antes de gastar tempo de build |

Concorrentes (Webtoon, Tapas, Inkitt; temas WordPress como Madara) não executam
nenhuma dessas garantias. Nenhum deles é a hospedagem do seu conteúdo com
certificação de acessibilidade e desempenho. Esse é o espaço.

## Estratégias

| # | Modelo | Público | Ticket | Quando |
| --- | --- | --- | --- | --- |
| 1 | Serviço por episódio / retainer | Criadores e estúdios | R$1.200–4.000 por episódio | **agora** |
| 2 | Licença única (Starter Kit) | Criadores e estúdios | R$199–299 / US$39–79 | **agora** |
| 3 | Licenciamento institucional | Museus, universidades, emissoras, editoras | R$8.000–30.000 por projeto | mês 5+ |
| 4 | Freemium + assinatura (autoria hospedada) | Criadores | US$9–15/mês | travado atrás de #2 |
| 5 | Publicidade e patrocínio | Leitores | eCPM US$3–6 | credibilidade, não receita |

### Prioridade

**#1 e #2 em paralelo, agora.** O serviço precisa de um cliente, não de mil
seguidores. A licença precisa de volume, mas custa zero backend, zero churn e zero
margem de hospedagem. Os dois juntos produzem studies de caso que vendem #3.

**#3** é a fatia de maior ticket e o único segmento onde acessibilidade é
obrigação legal, não preferência. **#4** só depois de #2 provar demanda, porque
subscription sem audiência é o pior primeiro movimento possível. **#5** serve
como selo de credibilidade (a marca de uma editora de terror na página), não como
receita.

### Riscos que já custaram decisão

- **Não vender "WCAG 2.2 AAA conforme".** É afirmação de conformidade com
  exposição jurídica. Vender "AA verificado por auditoria, alvo AAA, com o
  registro da auditoria anexado", e assinar declaração de conformidade com
  escopo delimitado.
- **Contrato de propriedade de quadros** por episode no serviço #1. Sem isso, o
  trabalho vira portfólio do cliente, não seu.
- **A licença MIT deste repositório permite uso comercial por qualquer pessoa.**
  A defesa não é jurídica, é de escopo: o que se vende é a responsabilidade
  (atualizações, suporte, garantia de que passa no portão), não o código.
- **Template estático é copiável.** O portão é o que não se replica em uma tarde,
  porque ele depende de schema, orçamentos, matriz de navegadores e evidência.

## Economia unitária

Todos os números abaixo são **hipóteses**, não medições. A Fase 1 existe para
substituí-los.

| # | CAC | Preço | Margem | Payback |
| --- | --- | --- | --- | --- |
| 1 | R$500–750 (tempo) | R$1.500–4.000/ep | 70–85% | <1 mês |
| 2 | US$0–15 | US$39–79 | ~95% | 1 venda |
| 3 | US$200–800 (tempo) | R$8.000–30.000 | ~85% | ciclo de 1–3 meses |
| 4 | US$30–120 pago / ~0 orgânico | US$9–15/mês | ~70% | 4–7 meses |
| 5 | n/a (precisa tráfego) | eCPM US$3–6 | alta | ~18 meses |

A #2 não tem receita recorrente: precisa de ~40 vendas/mês para US$2k/mês, e cada
comprador é um *publicador* que precisa do próximo kit. A #4 só é viável com
aquisição orgânica.

## Linha do tempo

| Fase | O quê | Portão de decisão |
| --- | --- | --- |
| 0 (sem 1–2) | Dossiê de acessibilidade e desempenho a partir da evidência existente; página de oferta com #1, #2, #3; ímã de captura | 20 e-mails **ou** 3 chamadas. Se nem um: reposicionar, não construir |
| 1 (sem 3–6) | 1–3 episódios pagos; abrir o Starter Kit; showreel de 90 s | ≥1 cliente pago **e** ≥5 vendas do kit. Um em zero: matar e virar para o outro |
| 2 (sem 7–16) | Doble no vencedor; 2–3 estudos de caso; listar em marketplace | ≥15 vendas/mês ou ≥2 retainers → considerar #4 |
| 3 (mês 5+) | Abrir #3; patrocínio de uma temporada em #5 | — |

## Imã de captura: o relatório de compatibilidade

`npm run report` já existe e é a maior intenção de compra possível: o prospect
roda a auditoria no **manifesto dele** e recebe um veredito legível.

```
npm run report -- ../outro-projeto/src/data/story.json --root ../outro-projeto
```

Os números do relatório batem byte a byte com o portão de `npm run build`
(`tests/unit/compatibility-report.test.js` trava essa paridade). O relatório
declara explicitamente o que **não** verifica — navegador, Lighthouse, FPS,
política de autoplay e conformidade WCAG — e essa honestidade é parte da
proposta: uma ferramenta que promete demais não sobrevive a um cliente
técnico.

O relatório não faz telemetria. A impressão digital `mcr-<hash>` é um hash do
próprio manifesto e serve para versionar a conversa, não para rastrear o prospect.

### O que falta para o ímã virar ferramenta de conversão

Hoje o relatório exige Node 20, ffmpeg e Playwright para o público geral — o que
exclui exatamente o criador de quadrinhos que não programa. Duas evoluções, por
ordem:

1. **Página única no navegador** que carrega o validador em bundle e lê o
   `story.json` por um `<input type="file">`. Zero instalação, zero upload, o
   arquivo do prospect não sai da máquina. Honestidade de escopo: checa schema,
   portabilidade e metadados, e marca a existência de assets como "não verificável
   localmente". Continua sendo vanilla, sem backend — não viola a constituição.
2. **Wrapper de página de oferta** que injeta `--contact` e formata em markdown.

Enquanto (1) não existir, o caminho de venda é você rodar o relatório para o
prospect a partir de uma conversa — o que ainda funciona e ainda é gratuito.

## Restrições de repositório

`build.mjs` reprova referências externas, absolutas ou com `../` no manifesto e
no HTML; `preflight` reprova dependências com intervalo e `scripts.ci` com
`|| true`. Consequência prática: a página de oferta, o formulário e o checkout
**não podem** ser adicionados a este repositório. Fica em repositório ou domínio
separado, consumindo o relatório como CLI ou como bundle de navegador.

## Pendências

- [ ] CNPJ/MEI — não bloqueia #1 nem #2; bloqueia #3 (nota fiscal é requisito de
      compra pública). Registro gratuito, ~1–2 dia.
- [ ] Dossiê de acessibilidade e desempenho em 1 página, extraído de
      `docs/delivery.md` e da auditoria WCAG existente.
- [ ] Showreel de 90 s, sem orçamento de mídia.
- [ ] Decidir o CNAE antes de emitir a primeira nota.
