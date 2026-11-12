#!/usr/bin/env python3
"""Central telemetry ingest (guardrail 3 / G5). Read-only aggregation of satellite JSONL returns.
No network. Validates each file with basic JSONL parse.
Exit 0 if all parsed, 1 if any parse/validation errors, 2 usage.
"""
from __future__ import annotations

import glob
import json
import sys
from pathlib import Path


def iter_events(p: Path):
    for i, l in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        if not l.strip():
            continue
        try:
            yield json.loads(l)
        except Exception as e:  # noqa: BLE001
            yield {"_parse_error": str(e), "_line": i, "_file": str(p)}


USAGE = """usage: ingest_telemetry.py <out_report.json> <file_or_glob> [...]
       ingest_telemetry.py --help

Aggregates one or more JSONL execution records into a summary report.
Exit 0 if every file parsed, 1 if any parse error, 2 usage error."""


def main(argv):
    if any(a in {"-h", "--help"} for a in argv[1:]):
        print(USAGE)
        return 0
    if len(argv) < 3:
        print(USAGE)
        return 2
    out = Path(argv[1])
    paths = []
    for a in argv[2:]:
        g = glob.glob(a, recursive=True)
        paths.extend([Path(x) for x in g] if g else [Path(a)])
    files = [p for p in paths if p.is_file()]
    if not files:
        print(f"telemetry-ingest: no input files matched: {argv[2:]}")
        return 2
    summary = {
        "files": 0,
        "events": 0,
        "parse_errors": 0,
        "failures": 0,
        "warnings": 0,
        "by_target": {},
        "by_gate": {},
        "cost_estimates": 0,
        "sources": [],
    }
    for p in sorted(set(files)):
        summary["files"] += 1
        summary["sources"].append(str(p))
        for ev in iter_events(p):
            if "_parse_error" in ev:
                summary["parse_errors"] += 1
                continue
            summary["events"] += 1
            tgt = ev.get("target_repo") or ev.get("target") or "unknown"
            summary["by_target"][tgt] = summary["by_target"].get(tgt, 0) + 1
            gr = ev.get("gate_result") or (ev.get("step") or {}).get("status") or "unknown"
            summary["by_gate"][gr] = summary["by_gate"].get(gr, 0) + 1
            if gr in ("fail", "error"):
                summary["failures"] += 1
            if gr in ("warn", "needs_human") or ev.get("warnings"):
                summary["warnings"] += 1
            ce = (ev.get("metrics") or {}).get("cost_estimate") or ev.get("cost_estimate")
            if ce:
                summary["cost_estimates"] += 1
    out.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    ok = summary["parse_errors"] == 0
    print(
        f"telemetry-ingest: {'PASS' if ok else 'WARN'} files={summary['files']} events={summary['events']} "
        f"parse_errors={summary['parse_errors']} failures={summary['failures']} warnings={summary['warnings']} -> {out}"
    )
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
