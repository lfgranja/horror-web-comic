# Quickstart & Verification Guide: Theme Switcher

**Feature**: `002-theme-switcher` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

Guia de validação ponta a ponta para verificar o correto funcionamento da comutação de atmosferas, persistência, acessibilidade e respeito aos orçamentos de performance.

---

## 1. Verificação Automatizada

### Passo 1: Executar Testes Unitários de Storage & Contratos
```bash
npm run test:unit
```
*Resultado Esperado:* Todos os testes de unidade passam (incluindo os novos testes cobrindo `storage.setTheme`, defaults e multi-tab broadcast).

### Passo 2: Verificação do Orçamento de Estilos & Build de Produção
```bash
npm run build
```
*Resultado Esperado:* O comando `scripts/build.mjs` valida o manifesto, compila os estilos com `esbuild` e confirma que `compressedStyleBytes` permanece abaixo de 10 KB (teto: 15 KB).

### Passo 3: Testes End-to-End no Playwright
```bash
npm run test:e2e
```
*Resultado Esperado:* A suíte de testes ponta a ponta executa com sucesso em todos os navegadores da matriz.

---

## 2. Cenários de Verificação Manual

### Cenário 1: Comutação Visual Fluida
1. Inicie o servidor local: `npm run serve`.
2. Abra `http://127.0.0.1:8080` no navegador.
3. Localize o seletor de tema na barra inferior (ao lado da velocidade).
4. Alterne para **"Noir"**: verifique se o fundo adota o preto abissal, as caixas ganham bordas nítidas de 2px e o papel oxidado.
5. Alterne para **"Eldritch"**: verifique o pergaminho e a luz de vela nos acentos e foco.
6. Alterne para **"Industrial"**: verifique o display de fósforo âmbar e cantos retos.
7. Alterne para **"Cinema"**: verifique o minimalismo e suavidade cinematográfica.
*Critério de Sucesso:* A troca ocorre instantaneamente (< 16ms), sem piscar e sem interromper a execução do áudio.

### Cenário 2: Persistência entre Sessões
1. Selecione o tema **"Industrial"**.
2. Atualize a página com `F5` / `Ctrl+R`.
*Critério de Sucesso:* A página já recarrega no modo "Industrial" diretamente, sem piscar no tema anterior.

### Cenário 3: Sincronização Entre Abas
1. Abra duas abas lado a lado em `http://127.0.0.1:8080`.
2. Na Aba 1, altere o tema para **"Eldritch"**.
*Critério de Sucesso:* A Aba 2 atualiza sua atmosfera imediatamente para "Eldritch" e o seletor da Aba 2 reflete a nova seleção.
