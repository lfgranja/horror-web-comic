# Página de oferta — especificação e copy

**Estado: especificado, não construído.** Este documento existe para que a página
possa ser escrita sem redesenhar a estratégia. A página vive fora deste
repositório (ver `README.md` → *Restrições de repositório*).

Três ofertas, uma única página, um único ímã. A ordem não é decorativa: quem chega
por busca técnica quer provar que a ferramenta funciona antes de ler preço.

---

## Estrutura

| Seção | Objetivo | Conversão esperada |
| --- | --- | --- |
| 1. Promessa | Dizer o que é entregue, em uma frase | — |
| 2. Prova | CI verde, matriz de 5 navegadores, auditoria WCAG, orçamentos | — |
| 3. O ímã | Relatório de compatibilidade gratuito | e-mail |
| 4. Oferta A | Serviço por episódio | chamada |
| 5. Oferta B | Starter Kit (licença única) | compra |
| 6. Oferta C | Licenciamento institucional | e-mail / proposta |
| 7. Objeções | Preço, prazo, quem não deve comprar | — |
| 8. Contato | Um único endereço, um único caminho | — |

---

## 1. Promessa

> Quadros em sequência cinematográfica que passam em acessibilidade e desempenho
> **antes** de irem ao ar — com um portão que reprova o build, não um checklist
> que alguém esquece.

Não usar "player", "template" ou "landing page" no título. O cliente não compra um
player; ele compra a garantia de que publicar não vai quebrar.

## 2. Prova

Blocos com link para o repositório público, sem print estático — o repositório é
a prova e está atualizado sozinho:

- `npm run ci` encadeado e sem mascarar falhas
- 5 projetos de navegador: Chromium, Firefox e WebKit, desktop e mobile
- Lighthouse: performance ≥0.9, acessibilidade ≥0.95, CLS ≤0.1, LCP ≤2.5 s
- auditoria WCAG 2.2 AAA registrada, com a evidência versionada
- orçamento de bytes reprovando a build, não avisando
- 0 dependências de runtime, hospedagem estática, sem backend

## 3. O ímã

**Título:** "Rode a auditoria no seu manifesto. Sem instalar nada que importe."

**Corpo:** o prospect sobe o próprio `story.json` e recebe veredito sobre schema,
portabilidade das referências, inventário de assets, variantes leves, orçamento de
entrega e metadados de acessibilidade. O relatório diz o que ele **não** verifica.

**Formulário:** um campo de e-mail, nada mais. Nome, empresa, telefone e cargo
viram atrito e reduzem a conversão; a qualificação acontece na conversa.

**Entrega:** dois caminhos, ambos sem backend —
`npx`-less: a página do ímã executa o validador no navegador a partir do
`story.json` local; e o link da CLI para quem prefere rodar no terminal.

**Fora do escopo da v1:** pixel de rastreamento, analytics de funil, A/B. Com zero
tráfego, medir conversão com duas ferramentas é medir ruído. Registrar cliques como
contagem simples no relatório enviado é suficiente.

## 4. Oferta A — Serviço por episódio

> Você escreve e desenha. Eu monto a sequência, as transições, o áudio, as
> variantes para 3G e o portão de publicação. Você recebe um episódio que passa
> em tudo que este repositório verifica.

- **Entrega:** episódio publicado, com relatório de compatibilidade e registro de
  Lighthouse anexados.
- **Preço:** R$1.200–4.000 por episódio, conforme duração, número de quadros e
  necessidade de áudio. Temporada fechada com preço por episódio.
- **Prazo:** acordado por episódio, não vendido como "sob consulta".
- **CTA:** agendar conversa de 20 minutos. Não há botão de compra.
- **O que o cliente precisa ter:** roteiro e arte final, em AVIF ou PNG a 2560 px
  de lado maior.

## 5. Oferta B — Starter Kit

> O mesmo portão, o mesmo schema e a mesma matriz de navegador, com o seu próprio
> manifesto no lugar do meu.

- **Entrega:** player, schema, `preflight`, `validate`, `report`, `build:images`,
  `build`, orçamento, suíte Playwright e documentação.
- **Preço:** R$199–299 / US$39–79 em launch. Três pontos de preço na página, não
  um — o que se escolhe entre três é dado de preço; o que se escolhe entre um é
  adivinhação.
- **Licença:** uso comercial, o comprador pode publicar o que quiser. Nenhuma
  claim de exclusividade: o valor é a atualização e o suporte, não o código.
- **CTA:** pagamento único. Sem assinatura, sem teste, sem cartão.
- **O que fica fora:** hospedagem, publicação, produção de arte, narração.

## 6. Oferta C — Licenciamento institucional

> Para exposição, sala de aula, visitante com deficiência e tudo que a lei obriga
> a funcionar sem depender do som.

- **Comprador:** quem compra é instituição com obrigação de acessibilidade e orçamento
  de contratação, não um fã.
- **Entrega:** player, dossiê de acessibilidade e desempenho, registro de auditoria
  WCAG 2.2, documentação de implantação e treinamento.
- **Formulação de conformidade:** "WCAG 2.2 AA verificado por auditoria, alvo AAA,
  com o registro da auditoria anexado", mais declaração de conformidade de escopo
  delimitado. **Nunca** "conforme AAA" como afirmação.
- **Preço:** R$8.000–30.000 por projeto, mais retainer de manutenção. Cotação por
  escopo, com proposta formal.
- **CTA:** e-mail com uma pergunta de qualificação anexada — qual norma se aplica
  ao projeto e qual a data de exigência.

## 7. Objeções

| Objeção | Resposta curta |
| --- | --- |
| "É só um player" | O player é a parte fácil. O portão é o que reprova o build. |
| "Eu não uso React/framework" | Vanilla de propósito: sem backend, sem build lock-in, 0 dependência de runtime. |
| "Meu quadro é JPG e pronto" | O orçamento de bytes reprova a build se a imagem pesa demais. É nesse momento que se descobre, não depois. |
| "Preciso de analytics e comentários" | Não é o produto. Integre o que quiser — a entrega é estática e sua. |
| "Por que não usar Inkitt/Webtoon?" | Você não é dono do player, e ninguém garante acessibilidade nem orçamento. |
| "É caro" | Um episódio que quebra acessibilidade custa mais que o episódio. |
| "Não quero comprar agora" | Rode o relatório no seu manifesto. A decisão é sua, e ele não mente. |

## 8. Contato

Um endereço, uma caixa de entrada, sem formulário no site sem backend. Se houver
formulário, ele é de um serviço externo e o repositório não muda.

---

## O que medir na v1

Sem analytics. Três números, anotados à mão:

1. Relatórios executados (imã usado)
2. Conversas iniciadas a partir da página
3. Vendas fechadas, por oferta

Sucesso da Fase 0: **20 relatórios ou 3 conversas em 14 dias**. Abaixo disso, muda-se
a promessa, não se constrói a ferramenta. Acima disso, executa-se a Fase 1.
