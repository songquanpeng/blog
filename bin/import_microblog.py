#!/usr/bin/env python3
"""One-time import of a legacy songquanpeng/microblog SQLite database.

The command is a dry run unless --apply is provided. It never deletes target
rows. If an old numeric ID is already occupied by different content, the post
is appended with a new ID so neither side is lost.
"""

from __future__ import annotations

import argparse
import datetime as dt
import sqlite3
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="legacy microblog.db")
    parser.add_argument("target", type=Path, help="integrated blog data.db")
    parser.add_argument("--apply", action="store_true", help="commit the import (default: dry run)")
    return parser.parse_args()


def utc_timestamp(value: int) -> str:
    return dt.datetime.fromtimestamp(value, dt.timezone.utc).isoformat().replace("+00:00", "Z")


def table_exists(db: sqlite3.Connection, name: str) -> bool:
    return db.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND lower(name) = lower(?)", (name,)
    ).fetchone() is not None


def main() -> int:
    args = parse_args()
    if not args.source.is_file() or not args.target.is_file():
        raise SystemExit("source and target SQLite files must already exist")

    source = sqlite3.connect(f"file:{args.source}?mode=ro", uri=True)
    target = sqlite3.connect(args.target)
    target.row_factory = sqlite3.Row
    try:
        if not table_exists(source, "posts"):
            raise SystemExit("legacy source table 'posts' was not found")
        if not table_exists(target, "MicroPosts"):
            raise SystemExit("target table 'MicroPosts' was not found; start the new blog version once first")

        rows = source.execute("SELECT id, content, timestamp, status FROM posts ORDER BY id").fetchall()
        target.execute("BEGIN IMMEDIATE")
        next_id = target.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM MicroPosts").fetchone()[0]
        inserted = skipped = renumbered = 0
        for legacy_id, content, timestamp, status in rows:
            content = content or ""
            status = 1 if int(status or 0) == 1 else 0
            created_at = utc_timestamp(int(timestamp))
            existing = target.execute(
                "SELECT content, status, createdAt FROM MicroPosts WHERE id = ?", (legacy_id,)
            ).fetchone()
            target_id = legacy_id
            if existing:
                same_time = str(existing["createdAt"]).replace("+00:00", "Z") == created_at
                if existing["content"] == content and int(existing["status"]) == status and same_time:
                    skipped += 1
                    continue
                target_id = next_id
                next_id += 1
                renumbered += 1
            target.execute(
                'INSERT INTO MicroPosts (id, content, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
                (target_id, content, status, created_at, created_at),
            )
            inserted += 1

        final_total = target.execute("SELECT COUNT(*) FROM MicroPosts").fetchone()[0]
        if args.apply:
            target.commit()
            mode = "applied"
        else:
            target.rollback()
            mode = "dry-run"
        print(
            f"mode={mode} source={len(rows)} inserted={inserted} skipped={skipped} "
            f"renumbered={renumbered} final_total={final_total}"
        )
        return 0
    except Exception:
        target.rollback()
        raise
    finally:
        source.close()
        target.close()


if __name__ == "__main__":
    raise SystemExit(main())
