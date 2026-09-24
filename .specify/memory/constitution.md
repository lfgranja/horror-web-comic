<!--
Sync Impact Report
- Versão: 1.0.0 → 2.0.0
- Princípios modificados:
  - V. Qualidade Visual e Sonora: padrão do áudio corrigido de "silencioso" para
    "ativo por padrão" (redefinição de regra não negociável).
  - VI. Controle do Usuário e Acessibilidade: cláusula de áudio ajustada para
    coerência ("respeitar a escolha do usuário" em vez de "nunca forçar áudio").
- Seções modificadas: Fluxo de Desenvolvimento e Portões de Qualidade (teste de
  áudio passa a cobrir estado ativo por padrão e bloqueio de autoplay).
- Seções adicionadas: nenhuma
- Seções removidas: nenhuma
- TODOs adiados: nenhum
-->

# Constituição do Web Comic de Terror

## Princípios Fundamentais

### I. Experiência Cinematográfica (NÃO NEGOCIÁVEL)
O produto DEVE ser consumido como um filme, não como uma tira de quadrinhos
estática. A narrativa DEVE avançar em quadros sequenciais com ritmo,
enquadramento e transições controlados, usando a linguagem do cinema (cortes,
fades, zoom, suspense, tempo de cena). Cada quadro DEVE ter função narrativa e
posição definida na sequência. Rolagem ou navegação DEVE conduzir a cena de
forma fluida e imersiva.

Racional: a proposta central é "um filme em quadrinhos"; sem controle de ritmo
e transição o resultado vira apenas uma galeria de imagens.

### II. Médium Definido: HTML, CSS, JavaScript e Quadros de Imagem
A experiência DEVE ser construída exclusivamente com HTML, CSS, JavaScript e
quadros de imagem. É PROIBIDO depender de arquivos de vídeo, motores de jogo ou
frameworks pesados para entregar a narrativa. A alta qualidade e a otimização
aplicam-se igualmente a HTML, CSS, JavaScript e imagens. Dependências externas
DEVEM ser mínimas, justificadas e versionadas localmente quando possível.

Racional: mantém o projeto portátil, leve e fiel ao formato proposto.

### III. Mobile-First e Responsividade Universal
O comic DEVE funcionar em smartphones e navegadores desktop com a mesma
integridade narrativa. O design DEVE ser mobile-first, fluido e adaptável a
tamanhos, orientações, densidades de tela e áreas seguras (notch). DEVE evitar
rolagem horizontal, cortes de enquadramento e dependência exclusiva de hover.
A navegação DEVE funcionar por toque e por teclado.

Racional: metade (ou mais) do público consome no celular; a experiência não
pode degradar no dispositivo mais comum.

### IV. Performance e Orçamento de Ativos (NÃO NEGOCIÁVEL)
Todo ativo DEVE ser otimizado antes de entrar no repositório. Imagens DEVEM usar
formatos modernos (AVIF/WebP) com fallback, dimensões explícitas, `srcset`/
`sizes` responsivos e carregamento preguiçoso fora da cena atual; quadros
críticos DEVEM ser pré-carregados. O projeto DEVE respeitar orçamentos definidos
de peso total, tempo de carregamento (LCP) e tamanho de JavaScript. Código DEVE
ser minificado e livre de dependências supérfluas.

Racional: "altamente otimizada" é requisito explícito; imagens de alta qualidade
são o maior risco de peso.

### V. Qualidade Visual e Sonora
A arte DEVE ser de alta qualidade, coerente em estilo, resolução e paleta,
reforçando a atmosfera de terror. O áudio é recurso de primeira classe: DEVE
contribuir para a tensão e a imersão. Todo áudio DEVE iniciar ativo por padrão
(respeitando as políticas de reprodução automática do navegador), poder ser
desativado facilmente e ter a preferência do usuário persistida.

Racional: o som é parte essencial da atmosfera de terror; iniciar ativo entrega
a experiência pretendida, enquanto o controle de desativação imediata e a
preferência persistida preservam a autonomia do usuário.

### VI. Controle do Usuário e Acessibilidade
O usuário DEVE estar no controle. A experiência DEVE respeitar
`prefers-reduced-motion`, oferecer redução/alternativa de movimento, permitir
pausar e avançar, e respeitar a escolha de áudio do usuário (desativar DEVE
silenciar imediatamente e a escolha DEVE ser persistida). Imagens DEVEM ter
descrição narrativa detalhada; contraste e legibilidade DEVEM ser suficientes; a
navegação DEVE ser acessível por teclado e leitores de tela.

Racional: terror imersivo não pode excluir pessoas sensíveis a movimento, surdas
ou usuárias de tecnologias assistivas.

## Restrições Técnicas e Padrões de Entrega

- Entrega como site estático (HTML/CSS/JS/imagens), hospedável sem runtime de
  servidor dedicado.
- Matriz de suporte de navegadores DEVE ser declarada e testada (últimas versões
  de Chrome, Firefox, Safari e mobile Safari/Chrome).
- Ativos DEVEM seguir estrutura e nomenclatura consistentes, com
  versionamento/cache-busting.
- Formatos de imagem, resolução máxima e compressão DEVEM ser padronizados e
  documentados.
- Metadados (título, descrição, Open Graph) e acessibilidade básica DEVEM estar
  presentes em todas as páginas.
- Nenhum rastreador ou recurso externo DEVE comprometer privacidade ou
  performance sem justificativa.

## Fluxo de Desenvolvimento e Portões de Qualidade

- Toda mudança DEVE passar por verificação de responsividade em dispositivo
  móvel (real ou emulado) e em desktop.
- Orçamentos de performance DEVEM ser verificados (Lighthouse ou medição
  equivalente) antes de considerar uma mudança concluída.
- O comportamento do áudio (ativo por padrão, bloqueio de reprodução automática e
  desativação imediata) e com `prefers-reduced-motion` DEVE ser testado.
- O orçamento de peso de imagem DEVE ser conferido a cada novo quadro.
- Complexidade adicionada DEVE ser justificada em relação ao Princípio II.

## Governança

- Esta constituição prevalece sobre quaisquer outras práticas, convenções ou
  preferências locais.
- Emendas DEVEM ser propostas por escrito, justificadas, revisadas e
  registradas; o versionamento segue SemVer:
  - MAJOR: remoção ou redefinição incompatível de princípios/governança.
  - MINOR: adição de princípio/seção ou expansão material de orientação.
  - PATCH: esclarecimentos, correções de redação ou refinamentos não semânticos.
- Toda revisão/PR DEVE verificar conformidade com os princípios; desvios DEVEM
  ser documentados e aprovados.
- A orientação de desenvolvimento em tempo de execução DEVE residir em
  `AGENTS.md` (quando existir) e estar subordinada a esta constituição.

**Version**: 2.0.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-23
