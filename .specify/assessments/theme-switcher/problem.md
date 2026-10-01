# Problem Definition: Personalização Visual e Acessibilidade Atmosférica no Player Narrativo

- **Slug**: theme-switcher
- **Created**: 2026-09-30T19:28:00-04:00
- **Inputs used**: intake.md, research.md

## Problem Statement

Leitores do web comic de terror possuem sensibilidades visuais, necessidades de acessibilidade fotométrica e preferências de imersão artística distintas, mas atualmente estão confinados a uma apresentação visual fixa e imutável. Essa rigidez causa desconforto visual e fadiga (especialmente em leitores com fotofobia ou astigmatismo que sofrem com *halation*) e impede que a história seja vivenciada sob prismas dramáticos alternativos que aumentam o valor de releitura da obra.

## Affected Users & Stakeholders

- **Leitores com Sensibilidade Visual & Fotofobia**: Sofrem com cansaço ocular acelerado e dispersão sob certos níveis de luminância e contraste; necessitam de controle sobre a temperatura da cor de fundo (ex.: preto absoluto vs. pergaminho suave).
- **Leitores Entusiastas de Quadrinhos & Horror**: Desejam modular a atmosfera do quadrinho de acordo com seu humor ou ambiente de leitura (ex.: estética gráfica visceral de HQ dos anos 80 vs. terror mecânico claustrofóbico de terminal).
- **Autores & Diretores Artísticos**: Desejam garantir que a arte e o fotograma permaneçam em destaque absoluto, sem que interfaces intrusivas quebrem o suspense ou a quarta parede da narrativa.
- **Engenharia & Guardiões da Arquitetura**: Precisam garantir que qualquer flexibilidade estética respeite de forma inegociável os orçamentos de desempenho (`compressedStyleBytes <= 15000`), a estabilidade de layout (CLS $\le 0.1$) e os padrões WCAG 2.2 AAA.

## Goals

- Permitir que o leitor ajuste a estética e o contraste da interface entre 5 atmosferas visuais complementares sem interromper a execução ou a sincronia do player de áudio/quadros.
- Preservar a integridade constitucional do projeto: zero aumento no runtime JS, zero Cumulative Layout Shift durante a troca de tema, e manutenção do bundle CSS total abaixo de 10 KB (bem inferior ao teto de 15 KB).
- Garantir que a preferência do leitor seja lembrada entre visitas subsequentes e sincronizada entre abas ativas.
- Assegurar conformidade estrita WCAG 2.2 AAA em todos os temas selecionáveis (contraste $\ge 7:1$, alvos $\ge 44\text{ px}$, suporte a zoom de 200%).

## Non-Goals

- Não permitir criação ou customização livre de cores pelo usuário final (ex.: seletores de cor *color picker* livres ou edição manual de CSS).
- Não alterar as artes dos fotogramas ou o conteúdo da narrativa (as imagens de frame continuam exatamente as mesmas; apenas o invólucro do player, tipografia, bordas, cores de apoio e HUD se adaptam).
- Não criar painéis flutuantes invasivos ou docks pesados de desenvolvimento na interface pública de leitura.
- Não introduzir dependências externas de temas, frameworks de CSS ou bibliotecas de ícones de terceiros.

## Success Metrics

- **Taxa de Retenção & Releitura (Replay Rate)**: Aumento de $\ge 15\%$ nas sessões em que o leitor revisita a história ou navega por múltiplos capítulos. (Baseline: histórico de sessão única).
- **Tempo de Sessão sem Fadiga Ocular**: Redução de queixas de contraste/fadiga visual e aumento na taxa de conclusão da história em leituras noturnas.
- **Budget de Estilos**: Tamanho compilado do CSS total mantido em $\le 8.5\text{ KB}$ em Gzip. (Baseline: 5.995 bytes atuais; limite do budget: 15.000 bytes).
- **Estabilidade de Layout (CLS)**: $\text{CLS} = 0.00$ registrado em 100% das alternâncias de tema durante testes automatizados. (Baseline: 0.00).

## Cost of Inaction

Se a funcionalidade não for implementada, o leitor continuará refém de uma única estética monocromática. Usuários com fadiga visual continuarão recorrendo a extensões de terceiros que invertem cores de forma descontrolada e arruínam a arte dos quadros, e os 5 sistemas estéticos já prototipados e validados no repositório permanecerão inexplorados pelo público.

## Open Questions

- [NEEDS CLARIFICATION: Qual será o tema carregado por padrão para um leitor em sua primeira visita: o Minimalist Cinema (foco absoluto na arte) ou o Shadow-Props Base?]
- [NEEDS CLARIFICATION: O mecanismo de seleção na interface pública deve ser um botão cíclico rápido com tooltip indicativo na barra de controles ou um `<select id="theme">` nativo na seção auxiliar?]
- [NEEDS CLARIFICATION: O alternador deve exibir um rótulo textual visível ou apenas ícone com `aria-label` completo para não poluir telas estreitas de 320px?]
