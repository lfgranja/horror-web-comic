# Storage Contract: Persistência do Tema no Navegador

**Feature**: `002-theme-switcher` | **Date**: 2026-09-30 | **Spec**: [spec.md](../spec.md)

Contrato de persistência local e sincronização entre abas gerenciado por `src/scripts/storage.js`.

---

## 1. Chaves de Armazenamento

| Chave | Tipo Canônico | Valores Aceitos | Valor Padrão | Requisito |
|:---|:---|:---|:---|:---|
| `hwc.theme` | String | `'cinema'` \| `'noir'` \| `'eldritch'` \| `'industrial'` \| `'shadow-props'` | `'cinema'` | FR-006, FR-007 |

---

## 2. API de Métodos Estendida em `StorageManager`

```javascript
// Carregamento geral (extensão de load())
const state = storage.load();
// Retorno estendido inclui:
// {
//   ...
//   theme: 'cinema' | 'noir' | 'eldritch' | 'industrial' | 'shadow-props'
// }

// Persistência explícita
storage.setTheme(themeId); // Grava 'hwc.theme', notifica listeners e emite via BroadcastChannel

// Registro de ouvinte reativo para sincronização
const unsubscribe = storage.onTheme((themeId) => {
  // Chamado quando outra aba ou o sistema altera o tema
});
```

---

## 3. Regras de Tolerância & Sincronização

1. **Validação Estrita de Valores**:
   - Se o valor recuperado de `localStorage.getItem('hwc.theme')` não for uma das 5 strings permitidas, o `StorageManager` deve descartar o valor e retornar `'cinema'`, sem quebrar a execução.
2. **Resiliência a Falhas de Storage**:
   - Se o navegador lançar erro de cota ou segurança (`SecurityError`, `QuotaExceededError`), o gerenciador armazena o tema em `this.memory` (Map volátil em memória), permitindo que a troca funcione na aba atual normalmente.
3. **Canal Broadcast & Resolução de Concorrência**:
   - Nome do canal: `'theme'`.
   - Mensagem emitida: `{ theme: string }`.
   - Propagação unidirecional para abas irmãs com tempo de resposta $< 100\text{ ms}$.
   - Semântica de concorrência: **Last-Write-Wins (LWW)** nativa do event loop do navegador; a última mensagem recebida prevalece.
4. **Restauração via Back/Forward Cache (bfcache)**:
   - No evento `window.addEventListener('pageshow', (event) => { if (event.persisted) { ... } })`, o player invoca `storage.load().theme` para revalidar a chave `hwc.theme` e alinhar o atributo `data-theme` do DOM e o elemento `<select id="theme">`.
