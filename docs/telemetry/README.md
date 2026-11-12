# Telemetry — execution records (035.1.0)

`execution-record.jsonl` contém **registros seed/backfilled** da adoção inicial
MDMV dark-factory → horror-web-comic (2026-11-11), não execuções vivas de
produção. Os eventos são ancorados em `dev@222a775…` e têm `seed: true` em cada
linha. Eles servem como exemplo de formato e como baseline local; não são
evidência de gate CI verde.

Emissão real (por execução relevante) deve usar `scripts/telemetry/emit_telemetry.py`
ou `wrap_telemetry.py`; validação com
`python3 scripts/telemetry/validate_telemetry.py docs/telemetry/execution-record.jsonl --strict-redaction`.

Schema: `docs/governance/execution-record.schema.json`. Ingestão/publicação no hub
é `NV` nesta fase (nenhuma rede é chamada por estes scripts).
