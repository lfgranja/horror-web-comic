#!/usr/bin/env python3
"""Deterministic SDD chain gate for horror-web-comic (R4/R7, MDMV adoption).

Adapted from stardew-raizes-vivas/scripts/ci/sdd-gate.py with explicit baseline
support for real spec state (docs/governance/sdd-chain-baseline.json) so specs in
progress/blocked are not falsely approved. Stdlib only; no network.
Exit 0 pass, 1 fail.
"""
from __future__ import annotations

import json
import re
import glob as _glob
from datetime import date
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASELINE_PATH = ROOT / "docs" / "governance" / "sdd-chain-baseline.json"
errors: list[str] = []
warnings: list[str] = []


def req(path: str) -> Path:
    p = ROOT / path
    if not p.exists():
        errors.append(f"missing required path: {path}")
    return p


def warn(msg: str) -> None:
    warnings.append(msg)


def load_baseline() -> dict:
    if not BASELINE_PATH.exists():
        warn(f"missing SDD baseline: {BASELINE_PATH.relative_to(ROOT)} (treated as empty)")
        return {"exceptions": {}, "allow_missing": {}}
    try:
        data = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            errors.append("sdd-chain-baseline.json: root must be an object")
            return {"exceptions": {}, "allow_missing": {}}
        data.setdefault("exceptions", {})
        data.setdefault("allow_missing", {})
        if not isinstance(data.get("exceptions"), dict):
            errors.append("sdd-chain-baseline.json: exceptions must be an object")
            data["exceptions"] = {}
        if not isinstance(data.get("allow_missing"), dict):
            errors.append("sdd-chain-baseline.json: allow_missing must be an object")
            data["allow_missing"] = {}
        return data
    except Exception as e:  # noqa: BLE001
        errors.append(f"invalid JSON {BASELINE_PATH.relative_to(ROOT)}: {e}")
        return {"exceptions": {}, "allow_missing": {}}


def is_approved_validate(text: str) -> bool:
    low = text.lower()
    # Negative verdicts must not be treated as approved (e.g. "NOT APPROVED", "NÃO APROVADO").
    if re.search(r"\b(n[ãa]o|not)\s+aprovad[oa]\b", low):
        return False
    if re.search(r"\b(not\s+approved|blocked|conditional)\b", low) and "resultado" in low and "approved" in low and "not approved" in low:
        return False
    if re.search(r"\bn[ãa]o\s+aprovad[oa]\b", low) or re.search(r"\bnot\s+approved\b", low):
        return False
    return bool(
        re.search(r"\baprovad[oa]\b", low)
        or re.search(r"\bapproved\b", low)
    )


def release_status(text: str) -> str | None:
    """Return 'released' | 'not_ready' | 'blocked' | raw-token | None.

    Parses only the **Status:** line. Other headings may contain the word
    "released" (e.g. "pending consolidation of release"), so a substring scan
    over the whole file is not usable. "unreleased"/"not released" must never
    be read as released.
    """
    for line in text.splitlines():
        m = re.search(r"(?i)\*\*\s*Status:?\*\*\s*\*\*([^*]+?)\*\*", line)
        if not m:
            m = re.search(r"(?i)^\s*status\s*:\s*([A-Za-z][^\n]*)", line)
        if not m:
            continue
        token = m.group(1).strip().lower()
        if not token:
            return None
        if token.startswith("released"):
            return "released"
        if token.startswith(("not released", "unreleased")):
            return "not_ready"
        if token.startswith("not ready"):
            return "not_ready"
        if token.startswith("blocked"):
            return "blocked"
        if token.startswith("conditional"):
            return "conditional"
        if token.startswith("pending"):
            return "pending"
        # Unknown status: fail closed (treated as unreadable rather than released).
        return token
    return None


# Core SDD paths
req("AGENTS.md")
req(".specify/memory/constitution.md")
req("specs")
req("docs/governance/satellite-manifest.json")
req("docs/governance/hub-policy-manifest.json")
req("docs/governance/sdd-chain-baseline.json")

# JSON parse (targeted: governance + .specify + ADR docs metadata where json)
for base in (ROOT / "docs" / "governance", ROOT / ".specify"):
    if base.exists():
        for p in base.rglob("*.json"):
            if any(part in {".git", "node_modules", "dist", "build", "target"} for part in p.parts):
                continue
            try:
                json.loads(p.read_text(encoding="utf-8"))
            except Exception as e:  # noqa: BLE001
                errors.append(f"invalid JSON {p.relative_to(ROOT)}: {e}")

# YAML parse (hard requirement). PyYAML is installed by the sdd-gate workflow;
# if it is missing the check cannot run, and a silently unparsed workflow file
# is worse than a failing gate.
yaml = None
try:
    import yaml  # type: ignore
    parsed_yaml = 0
    for p in list(ROOT.rglob("*.yml")) + list(ROOT.rglob("*.yaml")):
        if any(part in {".git", "node_modules", "dist", "build", "target", ".direnv", "playwright-report", "test-results", ".lighthouseci"} for part in p.parts):
            continue
        txt = p.read_text(encoding="utf-8", errors="replace")
        try:
            list(yaml.safe_load_all(txt))
            parsed_yaml += 1
        except Exception as e:  # noqa: BLE001
            errors.append(f"invalid YAML {p.relative_to(ROOT)}: {e}")
except Exception:  # noqa: BLE001
    errors.append("PyYAML missing: install it (python3 -m pip install pyyaml) or the SDD gate cannot check YAML")
    parsed_yaml = 0

# Satellite manifest sanity
sm = ROOT / "docs" / "governance" / "satellite-manifest.json"
if sm.exists():
    try:
        data = json.loads(sm.read_text(encoding="utf-8"))
        if data.get("status") not in {"alinhado", "parcial", "desalinhado", "desatualizado"}:
            errors.append("satellite-manifest.json: invalid status")
        if not data.get("hub_sha"):
            warnings.append("satellite-manifest.json: hub_sha missing")
        if not data.get("adopted_policies"):
            warnings.append("satellite-manifest.json: adopted_policies empty")
        if data.get("target") != "horror-web-comic":
            warnings.append(f"satellite-manifest.json: unexpected target {data.get('target')!r}")
        if data.get("host") != "github":
            warnings.append(f"satellite-manifest.json: unexpected host {data.get('host')!r}")
    except Exception as e:  # noqa: BLE001
        errors.append(f"satellite-manifest.json parse error: {e}")

baseline = load_baseline()
exceptions = baseline.get("exceptions", {})
allow_missing = baseline.get("allow_missing", {})

# Expiry on documented waivers: a baseline exception that lapses is reported,
# not silently kept. Enforcement is a warning until the team decides otherwise.
for slug, spec_exc in exceptions.items() if isinstance(exceptions, dict) else []:
    if not isinstance(spec_exc, dict):
        continue
    expires = spec_exc.get("expires")
    if not expires:
        warn(f"{slug}: baseline exception has no expires date (waivers must not be permanent)")
        continue
    try:
        if date.fromisoformat(str(expires)) < date.today():
            warn(f"{slug}: baseline exception expired {expires} — refresh evidence or re-block the spec")
    except ValueError:
        errors.append(f"{slug}: baseline exception has an unparseable expires date {expires!r} (expected YYYY-MM-DD)")

# Per-spec chain checks
specs_dir = ROOT / "specs"
if specs_dir.exists():
    for d in sorted(p for p in specs_dir.iterdir() if p.is_dir() and p.name[:3].isdigit()):
        slug = d.name
        spec_exc = exceptions.get(slug, {}) if isinstance(exceptions, dict) else {}
        if not isinstance(spec_exc, dict):
            spec_exc = {}
        spec_allow = allow_missing.get(slug, []) if isinstance(allow_missing, dict) else []
        if not isinstance(spec_allow, list):
            spec_allow = []

        if not (d / "spec.md").exists():
            warn(f"{slug}: no spec.md (auxiliary dir) — skipped from chain checks")
            continue

        # tasks hygiene
        tasks = d / "tasks.md"
        if tasks.exists():
            unchecked = len(re.findall(r"^- \[ \]", tasks.read_text(encoding="utf-8"), flags=re.M))
            if unchecked > 0:
                # informational even if blocked; keep as warning
                warn(f"{slug}: {unchecked} unchecked task(s) in tasks.md")
        else:
            warn(f"{slug}: tasks.md missing")

        # plan presence (hygiene)
        if not (d / "plan.md").exists():
            warn(f"{slug}: plan.md missing")

        # validate.md (R4)
        vpath = ROOT / ".specify" / "validations" / slug / "validate.md"
        vstatus = str(spec_exc.get("validate_status", "")).lower()
        allow_validate_missing = "validate" in spec_allow or spec_exc.get("allow_validate_missing") is True
        allow_validate_not_approved = vstatus in {"conditional", "blocked", "pending", "partial", "not_approved", "waived"}
        approved = False
        if not vpath.exists():
            if allow_validate_missing:
                warn(f"{slug}: validate.md missing (accepted by baseline)")
            else:
                errors.append(f"missing validate.md for {slug} (R4)")
        else:
            vtext = vpath.read_text(encoding="utf-8", errors="replace")
            approved = is_approved_validate(vtext)
            if not approved:
                if allow_validate_not_approved:
                    warn(f"{slug}: validate.md not APPROVED (accepted by baseline: {vstatus or 'pending'})")
                else:
                    errors.append(f"validate.md not APPROVED for {slug} (R4)")
            elif allow_validate_not_approved:
                warn(f"{slug}: validate.md is APPROVED but baseline marks {vstatus} (consider updating baseline)")

        # release.md (R7) — coupled to R4: a released artifact must not ship
        # while its validation is not APPROVED, unless the baseline record
        # documents an explicit waiver for exactly that situation.
        rpath = ROOT / ".specify" / "releases" / slug / "release.md"
        rstatus = str(spec_exc.get("release_status", "")).lower()
        allow_release_missing = "release" in spec_allow or spec_exc.get("allow_release_missing") is True
        allow_release_not_ready = rstatus in {"not_ready", "blocked", "pending", "partial", "waived"}
        allow_release_despite_block = spec_exc.get("allow_release_despite_unapproved_validation") is True
        if not rpath.exists():
            if allow_release_missing:
                warn(f"{slug}: release.md missing (accepted by baseline)")
            else:
                errors.append(f"missing release.md for {slug} (R7)")
        else:
            rtext = rpath.read_text(encoding="utf-8", errors="replace")
            rel = release_status(rtext)
            if rel == "released":
                if allow_release_not_ready:
                    warn(f"{slug}: release.md is RELEASED but baseline marks {rstatus} (consider updating baseline)")
                if not approved:
                    if allow_release_despite_block:
                        warn(f"{slug}: released while validate.md is not APPROVED (explicit baseline waiver)")
                    else:
                        errors.append(f"release.md is RELEASED for {slug} but validate.md is not APPROVED (R4→R7)")
            elif allow_release_not_ready:
                warn(f"{slug}: release.md is {rel or 'unreadable'} (accepted by baseline: {rstatus})")
            else:
                errors.append(f"release.md not released for {slug} (R7): status {rel or 'unreadable'}")

        # converge append-only hygiene (warn only)
        for c in list(d.glob("converge*.md")):
            if c.stat().st_size == 0:
                warn(f"{slug}: empty converge file {c.name}")

        # clarify persistence (warn only)
        if not list(d.glob("clarify*.md")) and not (ROOT / ".specify" / "clarifications" / f"{slug}.md").exists():
            warn(f"{slug}: no clarify artifact persisted (R3)")

        if spec_exc.get("reason"):
            warn(f"{slug}: baseline note — {spec_exc.get('reason')}")

# Escalation registries (layer 024) — schema/ref checks, append-only history.
# These registries are not SDD specs, so the per-spec chain checks skip them;
# they are validated here instead of being silently ignored.
if yaml is not None:
    for registry in sorted(ROOT.glob("specs/*-*/registry/escalations*.yaml")):
        rel = registry.relative_to(ROOT)
        try:
            docs = [d for d in (yaml.safe_load_all(registry.read_text(encoding="utf-8")) or []) if d is not None]
        except Exception as e:  # noqa: BLE001
            errors.append(f"invalid YAML {rel}: {e}")
            continue
        data = docs[0] if docs else []
        if not isinstance(data, list):
            errors.append(f"{rel}: registry must be a list of entries")
            continue
        for i, item in enumerate(data):
            where = f"{rel}[{i}]"
            if not isinstance(item, dict):
                errors.append(f"{where}: entry must be an object")
                continue
            item_id = str(item.get("id", ""))
            if not re.match(r"^ESC-HWC-\d{8}-\d{3}$", item_id):
                errors.append(f"{where}: missing/invalid id (expected ESC-HWC-YYYYMMDD-NNN)")
            for key in ("status", "owner", "bloqueio", "impacto"):
                if not item.get(key):
                    errors.append(f"{where}: missing required field {key!r}")
            if item.get("status") not in {"aberto", "em-andamento", "mitigado", "resolvido", "fechado", "arquivado"}:
                warn(f"{where}: unexpected status {item.get('status')!r}")
            for ref in item.get("refs", []) or []:
                pattern = re.sub(r"\s*\(.*?\)\s*$", "", str(ref)).strip()
                if not pattern:
                    continue
                if not _glob.glob(str(ROOT / pattern), recursive=True):
                    errors.append(f"{where}: dangling ref {pattern!r}")
        warn(f"{rel}: {len(data)} escalation entr{'y' if len(data) == 1 else 'ies'} validated")

# Telemetry JSONL (Fase 2) — if present, each line must parse as JSON
telemetry_file = ROOT / "docs" / "telemetry" / "execution-record.jsonl"
if telemetry_file.exists():
    try:
        for i, raw in enumerate(telemetry_file.read_text(encoding="utf-8").splitlines(), start=1):
            if not raw.strip():
                continue
            json.loads(raw)
    except json.JSONDecodeError as e:
        errors.append(f"invalid JSONL {telemetry_file.relative_to(ROOT)} line {i}: {e.msg}")
    except OSError as e:
        errors.append(f"cannot read {telemetry_file.relative_to(ROOT)}: {e}")
else:
    warn("docs/telemetry/execution-record.jsonl not present")

# Summary
for w in warnings:
    print(f"WARN: {w}")
for e in errors:
    print(f"ERROR: {e}")
status = "PASS" if not errors else "FAIL"
print(f"sdd-gate: {status} ({len(errors)} errors, {len(warnings)} warnings)")
sys.exit(0 if not errors else 1)
