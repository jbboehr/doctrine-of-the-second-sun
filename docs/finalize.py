#!/usr/bin/env python3

"""Finalize rendered mdBook HTML for search and responsive image layout."""

from __future__ import annotations

import html
import pathlib
import posixpath
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ElementTree


SITE_URL = "https://jbboehr.github.io/doctrine-of-the-second-sun/"
PAGE_METADATA = {
    "CODE_OF_SOVEREIGNTY.html": (
        "Code of Sovereignty: Repository Governance",
        "Define final authority, stewardship, contribution boundaries, and fork sovereignty within a software "
        "repository and its descendants.",
    ),
    "DOCTRINE-CODING-GUIDE.html": (
        "Coding and Editing | Doctrine of the Second Sun",
        "Add literary marginalia to source code safely with reusable rules for scope, comments, review, preservation, "
        "and verification.",
    ),
    "DOCTRINE-GENERATION-GUIDE.html": (
        "Generation and Review | Doctrine of the Second Sun",
        "Use a tool-neutral workflow to generate, review, assign, and safely insert Doctrine of the Second Sun logia "
        "into projects.",
    ),
    "DOCTRINE-GOLD-EXEMPLARS.html": (
        "Gold Exemplars | Doctrine of the Second Sun",
        "Study exceptional reviewed logia that establish the quality ceiling for cadence, imagery, doctrinal "
        "consequence, and endings.",
    ),
    "DOCTRINE-IMAGE-GUIDE.html": (
        "Image Guide | Doctrine of the Second Sun",
        "Translate completed logia into consistent visual compositions while preserving their canonical meaning, "
        "symbols, and atmosphere.",
    ),
    "DOCTRINE-STYLE-GUIDE.html": (
        "Literary Style Guide | Doctrine of the Second Sun",
        "Define the canon, voice, imagery, movements, and symbolic vocabulary used to write Doctrine of the Second "
        "Sun logia.",
    ),
    "INTEGRATION-GUIDE.html": (
        "Project Integration | Doctrine of the Second Sun",
        "Adopt Doctrine of the Second Sun with Composer or Nix and connect its portable guides to local repository "
        "policy and tools.",
    ),
    "LICENSE.html": (
        "Documentation License | Doctrine of the Second Sun",
        "Read the Creative Commons Attribution-ShareAlike terms governing the documentation, artwork, integrations, "
        "and adaptations.",
    ),
    "MEASURE-OF-WORDS.html": (
        "The Measure of Words: Concise Technical Writing",
        "Write concise, direct, and exact technical artifacts without losing the context, precision, or rationale the "
        "work requires.",
    ),
    "RUINENWERT.html": (
        "Ruinenwert: Software Resilience and Recoverability",
        "Design software so ecosystem change destroys as little accumulated knowledge, recoverability, and useful "
        "structure as possible.",
    ),
    "experiments/index.html": (
        "Second Sun Browser Experiments | Doctrine of the Second Sun",
        "Explore preserved visual studies and laboratories that informed the maintained Doctrine of the Second Sun "
        "browser integrations.",
    ),
    "index.html": (
        "Doctrine of the Second Sun: Literary and Coding Guides",
        "Explore portable literary, visual, coding, technical-writing, and software-stewardship guides for maintainers "
        "and coding agents.",
    ),
    "integrations/codex/index.html": (
        "Codex Integration | Doctrine of the Second Sun",
        "Install optional Codex writer and reviewer adapters while keeping repository policy and the tool-neutral "
        "doctrine authoritative.",
    ),
    "integrations/phpstan/LICENSE.html": (
        "PHPStan Integration License | Doctrine of the Second Sun",
        "Read the GNU Affero General Public License terms governing the PHPStan integration implementation, "
        "configuration, and tests.",
    ),
    "integrations/phpstan/LICENSE_EXCEPTION.html": (
        "Romic License Exception | Doctrine of the Second Sun",
        "Review the Romic Exception that permits designated PHPStan integration use without extending AGPL "
        "requirements to consuming code.",
    ),
    "integrations/phpstan/index.html": (
        "PHPStan Extension | Doctrine of the Second Sun",
        "Configure a PHPStan extension that enforces project-selected logion format, coverage, book membership, and "
        "reference uniqueness.",
    ),
    "integrations/web/document-looks-back/index.html": (
        "The Document Looks Back | Doctrine of the Second Sun",
        "Add an opt-in browser effect in which occasional letterforms notice the reader without replacing text nodes "
        "or changing layout.",
    ),
    "integrations/web/heliogenesis/index.html": (
        "Heliogenesis Browser Effect | Doctrine of the Second Sun",
        "Mount the optional Dawning of the Second Sun browser effect over existing documentation with a temporary "
        "Three.js environment.",
    ),
}
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
IMAGE_TAG = re.compile(r"<img\b[^>]*>")


def replace_once(source: str, pattern: str, replacement: str, label: str) -> str:
    updated, replacements = re.subn(pattern, replacement, source, count=1, flags=re.DOTALL)
    if replacements != 1:
        raise RuntimeError(f"{label}: expected one match, found {replacements}")
    return updated


def set_attribute(tag: str, name: str, value: str) -> str:
    attribute = re.compile(rf'\s{name}="[^"]*"')
    if attribute.search(tag):
        return attribute.sub(f' {name}="{value}"', tag, count=1)
    return tag[:-1] + f' {name}="{value}">'


def local_image_path(page: pathlib.PurePosixPath, source: str) -> pathlib.PurePosixPath | None:
    parsed = urllib.parse.urlsplit(source)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    return pathlib.PurePosixPath(posixpath.normpath(str(page.parent / parsed.path)))


def finalize_images(source: str, relative_path: pathlib.PurePosixPath) -> str:
    def finalize_tag(match: re.Match[str]) -> str:
        tag = match.group(0)
        source_match = re.search(r'\ssrc="([^"]+)"', tag)
        if source_match is None:
            return tag
        local_path = local_image_path(relative_path, source_match.group(1))
        if local_path is None:
            return tag

        local_string = local_path.as_posix()
        if local_string == "assets/banner.webp" or local_string.startswith("assets/banners/"):
            tag = set_attribute(tag, "width", "2172")
            return set_attribute(tag, "height", "724")
        if LOGION_IMAGE.fullmatch(local_path.name):
            tag = set_attribute(tag, "width", "960")
            tag = set_attribute(tag, "height", "540")
            if relative_path.as_posix() not in NOINDEX_PAGES:
                tag = set_attribute(tag, "loading", "lazy")
        return tag

    return IMAGE_TAG.sub(finalize_tag, source)


def canonical_url(relative_path: pathlib.PurePosixPath) -> str:
    rendered_path = relative_path.as_posix()
    if rendered_path == "index.html":
        return SITE_URL
    if rendered_path.endswith("/index.html"):
        return SITE_URL + rendered_path.removesuffix("index.html")
    return SITE_URL + rendered_path


def add_noindex(source: str, label: str) -> str:
    robots = re.compile(r'<meta name="robots" content="[^"]*">')
    if robots.search(source):
        return robots.sub('<meta name="robots" content="noindex, follow">', source, count=1)
    return replace_once(
        source,
        r"(<title>.*?</title>)",
        r'\1\n        <meta name="robots" content="noindex, follow">',
        label,
    )


def add_page_metadata(
    source: str,
    relative_path: pathlib.PurePosixPath,
    title: str,
    description: str,
) -> str:
    label = relative_path.as_posix()
    escaped_title = html.escape(title)
    escaped_description = html.escape(description, quote=True)
    source = replace_once(source, r"<title>.*?</title>", f"<title>{escaped_title}</title>", label)
    source = replace_once(
        source,
        r'<meta name="description" content="[^"]*">',
        f'<meta name="description" content="{escaped_description}">',
        label,
    )
    canonical = html.escape(canonical_url(relative_path), quote=True)
    source = replace_once(
        source,
        r'(<meta name="description" content="[^"]*">)',
        rf'\1\n        <link rel="canonical" href="{canonical}">',
        label,
    )
    return source


def finalize_page(path: pathlib.Path, site_root: pathlib.Path) -> None:
    relative_path = pathlib.PurePosixPath(path.relative_to(site_root).as_posix())
    label = relative_path.as_posix()
    source = path.read_text(encoding="utf-8")

    if "Book generated using mdBook" in source:
        source = replace_once(
            source,
            r'<h1 class="menu-title">(.*?)</h1>',
            r'<div class="menu-title">\1</div>',
            label,
        )
        if label == "LICENSE.html":
            source = replace_once(
                source,
                r"(<main>\s*)",
                r'\1<h1 id="repository-license"><a class="header" href="#repository-license">'
                r"Repository License</a></h1>\n",
                label,
            )

    if label in NOINDEX_PAGES:
        source = add_noindex(source, label)
    elif label in PAGE_METADATA:
        source = add_page_metadata(source, relative_path, *PAGE_METADATA[label])

    path.write_text(finalize_images(source, relative_path), encoding="utf-8")


def write_sitemap(site_root: pathlib.Path) -> None:
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ElementTree.register_namespace("", namespace)
    urlset = ElementTree.Element(f"{{{namespace}}}urlset")
    for rendered_path in PAGE_METADATA:
        url = ElementTree.SubElement(urlset, f"{{{namespace}}}url")
        location = ElementTree.SubElement(url, f"{{{namespace}}}loc")
        location.text = canonical_url(pathlib.PurePosixPath(rendered_path))
    ElementTree.indent(urlset)
    ElementTree.ElementTree(urlset).write(
        site_root / "sitemap.xml",
        encoding="utf-8",
        xml_declaration=True,
    )


def main() -> int:
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} BUILD_DIRECTORY", file=sys.stderr)
        return 2

    site_root = pathlib.Path(sys.argv[1]).resolve()
    html_paths = sorted(site_root.rglob("*.html"))
    html_pages = {path.relative_to(site_root).as_posix() for path in html_paths}
    expected_html_pages = set(PAGE_METADATA) | NOINDEX_PAGES
    if html_pages != expected_html_pages:
        missing = sorted(expected_html_pages - html_pages)
        unexpected = sorted(html_pages - expected_html_pages)
        raise RuntimeError(f"HTML page inventory changed; missing={missing}, unexpected={unexpected}")

    mdbook_pages = {
        path.relative_to(site_root).as_posix()
        for path in html_paths
        if "Book generated using mdBook" in path.read_text(encoding="utf-8")
    }
    expected_mdbook_pages = set(PAGE_METADATA) | {"404.html", "print.html"}
    if mdbook_pages != expected_mdbook_pages:
        missing = sorted(expected_mdbook_pages - mdbook_pages)
        unexpected = sorted(mdbook_pages - expected_mdbook_pages)
        raise RuntimeError(f"mdBook page inventory changed; missing={missing}, unexpected={unexpected}")

    for path in html_paths:
        finalize_page(path, site_root)
    write_sitemap(site_root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
