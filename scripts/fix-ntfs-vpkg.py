#!/usr/bin/env python3
"""Work around an ntfs3 quirk that breaks `vega build` on this drive.

On the ntfs3 kernel driver, files smaller than one 4 KiB cluster are reported
with st_blocks = 0 (allocated size 0). The Vega packaging tool (vpt) treats any
file with zero allocated blocks as a sparse/empty file, so it packs them with
size 0. The device then rejects the package with "Package digest mismatch"
because the packed content no longer matches the signed digest.

This script:
  1. finds every staging file under build/private/vega/<arch>/<BuildType>
     whose size > 0 but allocated blocks == 0,
  2. rewrites it in place so the filesystem allocates a cluster for it
     (extend to 4 KiB, fsync, truncate back to the real size) — content is
     byte-for-byte unchanged,
  3. re-packs each affected target with vpt so the package is consistent.

Usage:
    python3 scripts/fix-ntfs-vpkg.py            # fix every built target
    python3 scripts/fix-ntfs-vpkg.py x86_64     # fix one target only
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
STAGING_ROOT = PROJECT_ROOT / "build" / "private" / "vega"
PKG_ROOT = PROJECT_ROOT / "build" / "private" / "kepler"
CLUSTER = 4096


def package_name() -> str:
    """Read the kepler package name (e.g. '@amazon-devices/luma') from package.json."""
    with open(PROJECT_ROOT / "package.json", encoding="utf-8") as fh:
        return json.load(fh)["name"]


def vpt_path() -> str:
    vega = shutil.which("vega") or str(Path.home() / "vega/bin/vega")
    out = subprocess.run(
        [vega, "which", "vpt"], capture_output=True, text=True, check=True
    ).stdout.strip()
    return out


def fix_file(path: Path) -> bool:
    """Force a cluster allocation without altering the file's content."""
    size = path.stat().st_size
    if size == 0 or path.stat().st_blocks > 0:
        return False
    data = path.read_bytes()
    fd = os.open(path, os.O_WRONLY)
    try:
        os.ftruncate(fd, CLUSTER)
        os.fsync(fd)
        os.ftruncate(fd, size)
        os.fsync(fd)
    finally:
        os.close(fd)
    assert path.read_bytes() == data, f"content changed for {path}"
    return True


def main() -> int:
    only = set(sys.argv[1:])
    if not STAGING_ROOT.is_dir():
        print("no build staging directory found - run `npm run build:release` first")
        return 1

    vpt = vpt_path()
    pkg = package_name()
    fixed_any = False

    for staging in sorted(STAGING_ROOT.glob("*/*")):
        target, build_type = staging.parent.name, staging.name
        if only and target not in only:
            continue

        fixed = [p for p in sorted(staging.rglob("*")) if p.is_file() and fix_file(p)]
        if fixed:
            fixed_any = True
            for p in fixed:
                print(f"  re-allocated blocks: {p.relative_to(staging)}")

        out_dirs = list(
            PKG_ROOT.glob(f"{pkg}/undefined/vega/{target}/{build_type}")
        )
        if not fixed or not out_dirs:
            continue

        out_dir = out_dirs[0]
        name = f"{pkg}_{target}"
        for stale in out_dir.glob("*.vpkg"):
            stale.unlink()
        for stale in ("vpkg-info.json", name):
            shutil.rmtree(out_dir / stale, ignore_errors=True)
            (out_dir / stale).unlink(missing_ok=True)

        print(f"re-packing {target}/{build_type} ...")
        subprocess.run(
            [vpt, "pack", str(staging), "-n", name, "-d", str(out_dir), "--validate"],
            check=True,
        )

    if not fixed_any:
        print("nothing to fix (no zero-block files found)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
