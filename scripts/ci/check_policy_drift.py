#!/usr/bin/env python3
"""Deterministic policy drift check (026) for horror-web-comic.

Compares the vendored hub policy snapshot against the satellite manifest.
This is a LOCAL CONSISTENCY check, not drift detection against the live hub:
no network access is performed, and the vendored hub SHA is the reference,
so it cannot detect what the hub looks like today. What it does detect is
one of the two files being edited without the other, a required policy
disappearing from both adoption and exception records, or a required file
going missing from the satellite manifest.

Exit 0=aligned/no-essential-drift, 1=drift detected, 2=usage/input error.
Run with --help for usage.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


USAGE = """usage: check_policy_drift.py <hub_manifest.json> [satellite_manifest.json ...]
       check_policy_drift.py --help

Exit codes:
  0  all provided satellite manifests are aligned (or none were provided)
  1  drift detected (missing_policy / missing_file / hub_sha disagreement)
  2  usage or input error"""


def load(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"DRIFT_ERROR read {p}: {e}")
        return None


def check(hub: dict, sat: dict) -> list[str]:
    issues = []
    exceptions = sat.get("exceptions")
    if exceptions is None:
        exceptions = {}
    if not isinstance(exceptions, dict):
        issues.append("exceptions:not_an_object")
        exceptions = {}
    for k in hub.get("required_policies", []):
        if k in sat.get("adopted_policies", []):
            continue
        reason = exceptions.get(k)
        if isinstance(reason, str) and reason.strip():
            print(f"policy-drift: exception policy={k} reason={reason}")
            continue
        # Being listed as "affected" is not adoption; a policy is adopted only
        # when it is adopted or when an explicit exception with a reason is on
        # record in the satellite manifest.
        issues.append(f"missing_policy:{k}")
    if sat.get("hub_sha") and hub.get("hub_sha") and sat["hub_sha"] != hub["hub_sha"]:
        issues.append(f"hub_sha_mismatch:{sat['hub_sha']}!={hub['hub_sha']}")
    for f in hub.get("required_files", []):
        if f not in sat.get("files_present", []):
            issues.append(f"missing_file:{f}")
    return issues


def main(argv):
    args = argv[1:]
    if any(a in {"-h", "--help"} for a in args):
        print(USAGE)
        return 0
    if len(args) < 1:
        print(USAGE)
        return 2
    hub = load(Path(args[0]))
    if hub is None:
        return 2
    if len(args) == 1:
        print("policy-drift: PASS (no satellite manifests provided; NV)")
        return 0
    drift = 0
    for sp in args[1:]:
        sat = load(Path(sp))
        if sat is None:
            drift = 1
            continue
        issues = check(hub, sat)
        target = sat.get("target", sp)
        if issues:
            drift = 1
            print(f"policy-drift: DRIFT target={target} issues={issues}")
        else:
            print(f"policy-drift: ALIGNED target={target}")
    if drift == 0:
        print("policy-drift: PASS")
    return 1 if drift else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
