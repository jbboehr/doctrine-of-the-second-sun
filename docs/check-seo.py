#!/usr/bin/env python3

"""Reject rendered documentation that violates the site's SEO contract."""

from __future__ import annotations

import html.parser
import pathlib
import posixpath
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ElementTree


SITE_URL = "https://jbboehr.github.io/doctrine-of-the-second-sun/"
NOINDEX_PAGES = {
    "404.html",
    "print.html",
    "toc.html",
    "experiments/archive/second-sun-d3.html",
    "experiments/heliogenesis-lab.html",
    "experiments/second-sun.html",
    "experiments/the-document-looks-back.html",
}
LOGION_IMAGE = re.compile(r"(?:AWC|OSD|RAS|SFA)-\d+_\d+\.webp\Z")


class PageInspector(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.canonicals: list[str] = []
        self.h1_count = 0
        self.images: list[dict[str, str]] = []
        self.metas: dict[str, str] = {}
        self.title_parts: list[str] = []
        self.in_title = False

    @property
    def title(self) -> str:
        return "".join(self.title_parts).strip()

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        values = {name: value or "" for name, value in attributes}
        if tag == "title":
            self.in_title = True
        elif tag == "meta" and values.get("name"):
            self.metas[values["name"].lower()] = values.get("content", "")
        elif tag == "link" and "canonical" in values.get("rel", "").lower().split():
            self.canonicals.append(values.get("href", ""))
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "img":
            self.images.append(values)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)


def inspect_page(path: pathlib.Path) -> PageInspector:
    inspector = PageInspector()
    inspector.feed(path.read_text(encoding="utf-8"))
    return inspector


def expected_canonical(relative_path: pathlib.PurePosixPath) -> str:
    rendered_path = relative_path.as_posix()
    if rendered_path == "index.html":
        return SITE_URL
    if rendered_path.endswith("/index.html"):
        return SITE_URL + rendered_path.removesuffix("index.html")
    return SITE_URL + rendered_path


def local_image_path(page: pathlib.PurePosixPath, source: str) -> pathlib.PurePosixPath | None:
    parsed = urllib.parse.urlsplit(source)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    return pathlib.PurePosixPath(posixpath.normpath(str(page.parent / parsed.path)))


def check_page_images(
    relative_path: pathlib.PurePosixPath,
    inspector: PageInspector,
    failures: list[str],
) -> None:
    for image in inspector.images:
        source = image.get("src", "")
        local_path = local_image_path(relative_path, source)
        if local_path is None:
            continue
        if not image.get("alt"):
            failures.append(f"{relative_path}: local image has no alt text: {source}")

        local_string = local_path.as_posix()
        if local_string == "assets/banner.webp" or local_string.startswith("assets/banners/"):
            if image.get("width") != "2172" or image.get("height") != "724":
                failures.append(f"{relative_path}: banner lacks intrinsic 2172 x 724 dimensions: {source}")
        elif LOGION_IMAGE.fullmatch(local_path.name):
            if image.get("width") != "960" or image.get("height") != "540":
                failures.append(f"{relative_path}: logion image lacks intrinsic 960 x 540 dimensions: {source}")
            if relative_path.as_posix() not in NOINDEX_PAGES and image.get("loading") != "lazy":
                failures.append(f"{relative_path}: below-fold logion image is not lazy loaded: {source}")


def main() -> int:
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} BUILD_DIRECTORY", file=sys.stderr)
        return 2

    site_root = pathlib.Path(sys.argv[1]).resolve()
    failures: list[str] = []
    indexable_pages: dict[pathlib.PurePosixPath, PageInspector] = {}

    for page in sorted(site_root.rglob("*.html")):
        relative_path = pathlib.PurePosixPath(page.relative_to(site_root).as_posix())
        source = page.read_text(encoding="utf-8")
        inspector = inspect_page(page)
        check_page_images(relative_path, inspector, failures)

        is_noindex = "noindex" in inspector.metas.get("robots", "").lower()
        if relative_path.as_posix() in NOINDEX_PAGES:
            if not is_noindex:
                failures.append(f"{relative_path}: expected noindex")
            if inspector.canonicals:
                failures.append(f"{relative_path}: noindex page must not declare a canonical")
            continue

        if "Book generated using mdBook" not in source:
            failures.append(f"{relative_path}: unclassified standalone HTML page")
            continue
        if is_noindex:
            failures.append(f"{relative_path}: indexable chapter is marked noindex")
            continue

        indexable_pages[relative_path] = inspector

    titles: dict[str, pathlib.PurePosixPath] = {}
    descriptions: dict[str, pathlib.PurePosixPath] = {}
    canonical_urls: set[str] = set()
    for relative_path, inspector in indexable_pages.items():
        expected_url = expected_canonical(relative_path)
        if inspector.canonicals != [expected_url]:
            failures.append(
                f"{relative_path}: expected one canonical {expected_url!r}, got {inspector.canonicals!r}"
            )
        else:
            canonical_urls.add(expected_url)

        if not 25 <= len(inspector.title) <= 65:
            failures.append(f"{relative_path}: title length is {len(inspector.title)}, expected 25-65 characters")
        elif inspector.title in titles:
            failures.append(f"{relative_path}: duplicate title also used by {titles[inspector.title]}")
        else:
            titles[inspector.title] = relative_path

        description = inspector.metas.get("description", "")
        if not 70 <= len(description) <= 160:
            failures.append(
                f"{relative_path}: description length is {len(description)}, expected 70-160 characters"
            )
        elif description in descriptions:
            failures.append(f"{relative_path}: duplicate description also used by {descriptions[description]}")
        else:
            descriptions[description] = relative_path

        if inspector.h1_count != 1:
            failures.append(f"{relative_path}: expected exactly one h1, got {inspector.h1_count}")

    if (site_root / "robots.txt").exists():
        failures.append("robots.txt: ineffective from this GitHub Pages project path; submit the sitemap separately")

    sitemap_path = site_root / "sitemap.xml"
    if not sitemap_path.exists():
        failures.append("sitemap.xml: missing")
    else:
        try:
            sitemap = ElementTree.parse(sitemap_path)
        except ElementTree.ParseError as error:
            failures.append(f"sitemap.xml: invalid XML: {error}")
        else:
            namespace = {"sitemap": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            sitemap_urls = {
                location.text or ""
                for location in sitemap.findall("sitemap:url/sitemap:loc", namespace)
            }
            if sitemap_urls != canonical_urls:
                missing = sorted(canonical_urls - sitemap_urls)
                unexpected = sorted(sitemap_urls - canonical_urls)
                if missing:
                    failures.append(f"sitemap.xml: missing canonical URLs: {', '.join(missing)}")
                if unexpected:
                    failures.append(f"sitemap.xml: contains noncanonical URLs: {', '.join(unexpected)}")

    if failures:
        print("Rendered-documentation SEO failures:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(f"Validated SEO metadata for {len(indexable_pages)} indexable pages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
