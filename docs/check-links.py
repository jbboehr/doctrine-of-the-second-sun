#!/usr/bin/env python3

"""Reject broken local href and src targets in rendered mdBook HTML."""

from __future__ import annotations

import html.parser
import pathlib
import sys
import urllib.parse


class LinkParser(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.targets: list[str] = []

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        attribute_name = "href" if tag in {"a", "link"} else "src" if tag in {"img", "script"} else None
        if attribute_name is None:
            return

        for name, value in attributes:
            if name == attribute_name and value:
                self.targets.append(value)


def resolve_target(site_root: pathlib.Path, page: pathlib.Path, target: str) -> pathlib.Path | None:
    parsed = urllib.parse.urlsplit(target)
    if parsed.scheme or parsed.netloc or target.startswith(("#", "mailto:", "javascript:", "data:")):
        return None

    path = urllib.parse.unquote(parsed.path)
    if not path:
        return None

    site_prefix = "/doctrine-of-the-second-sun/"
    if path.startswith(site_prefix):
        resolved = site_root / path.removeprefix(site_prefix)
    elif path.startswith("/"):
        return None
    else:
        resolved = page.parent / path

    if path.endswith("/"):
        resolved /= "index.html"

    return resolved.resolve()


def main() -> int:
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} BUILD_DIRECTORY", file=sys.stderr)
        return 2

    site_root = pathlib.Path(sys.argv[1]).resolve()
    failures: list[str] = []

    for page in sorted(site_root.rglob("*.html")):
        parser = LinkParser()
        parser.feed(page.read_text(encoding="utf-8"))
        for target in parser.targets:
            resolved = resolve_target(site_root, page, target)
            if resolved is not None and not resolved.exists():
                failures.append(f"{page.relative_to(site_root)}: {target}")

    if failures:
        print("Broken rendered-documentation links:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
