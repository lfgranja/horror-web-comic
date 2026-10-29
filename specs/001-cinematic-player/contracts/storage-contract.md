# Storage Contract: Estado Persistido no Navegador

**Feature**: `001-cinematic-player` | **Date**: 2026-09-23

Contrato dos dados guardados em `localStorage`. Sem backend; todos os valores são
locais ao dispositivo do usuário.

## Chaves

| Chave | Tipo | Padrão | Requisito | Descrição |
|-------|------|--------|-----------|-----------|
| `hwc.audio` | `"on"` \| `"off"` | `"on"` | FR-004, FR-007 | Preferência de áudio |
| `hwc.volume` | string numérica 0–1 | `"0.6"` | FR-020 | Volume escolhido pelo usuário |
| `hwc.speed` | `"0.5"` \| `"1"` \| `"2"` | `"1"` | FR-021 | Velocidade de exibição |
| `hwc.progress` | JSON string | ausente | FR-019 | Progresso de leitura |
| `hwc.schemaVersion` | string numérica | `"1"` | — | Versão do formato persistido |

## Formato de `hwc.progress`

```json
{
  "frameId": "f-042",
  "updatedAt": "2026-09-23T12:00:00.000Z",
  "seq": 7,
  "tabId": "a1b2c3"
}
```

> O campo `sceneId` foi removido: as regras de retomada usam apenas `frameId`
> (FR-019). O `schemaVersion` é único e global (`hwc.schemaVersion`), não
> duplicado dentro do progresso. A representação textual das chaves
> (`"on"`/`"off"`, strings numéricas) é a **canônica no storage**; o data model a
> projeta para boolean/número em memória.

## Regras

- Na primeira visita, `hwc.audio` ausente ⇒ áudio **ativo** (`"on"`).
- `hwc.audio = "off"` ⇒ áudio silenciado em todas as visitas até o usuário religar.
- A ação **"continuar sem som"** do overlay de áudio bloqueado grava
  `hwc.audio = "off"` — a mesma chave que o controle dedicado grava. Portanto ela
  **é** lembrada entre visitas: as visitas seguintes não repetem a tentativa de
  reprodução automática nem reexibem o overlay, e o áudio só volta a tocar quando
  o usuário acionar o controle de áudio (T211, 2026-09-27). A ativação por gesto
  qualificado (FR-016) tem alcance de **uma sessão** e apenas enquanto o áudio não
  foi desligado explicitamente.
- `hwc.progress` é atualizado ao pausar, ao navegar manualmente e **também no
  avanço automático** (FR-019).
- Ao retomar, se `frameId` existir no manifesto, a narrativa abre nesse quadro;
  caso contrário, reinicia no primeiro quadro.
- O estado de pausa **não** é persistido: ao carregar, o player retoma no
  `frameId` salvo e volta a `playing` (avanço automático), respeitando o bloqueio
  de reprodução automática do áudio (FR-019).
- "Voltar ao início" e "ir ao fim" atualizam `hwc.progress`.
- O progresso é sincronizado entre abas. Prefere-se `BroadcastChannel`
  (`progress`), com o evento `storage` como fallback (FR-030). A ordenação é
  determinística pelo trio `(updatedAt, seq, tabId)`: a aba que grava aplica o
  próprio estado imediatamente (o evento `storage` não dispara na própria aba) e
  cada aba adota uma gravação somente se sua versão for maior. Escritas com o
  mesmo `updatedAt` são desempatadas por `seq` (contador monotônico por aba) e,
  depois, por `tabId`.
- Se `localStorage` estiver indisponível (modo privado/restrito), a experiência
  funciona sem persistência, usando padrões em memória, sem erro visível; nesse
  caso, SC-007 e SC-012 não se aplicam (cláusula de exceção).
- Se `schemaVersion` for incompatível, os dados são descartados e recriados.

## Privacidade

Nenhum dado é enviado a servidores; nenhum identificador pessoal é armazenado.
