# Rendered documentation

mdBook renders the repository's canonical root documents without creating a second authored copy. `stage.sh` assembles
the ignored `docs/src/` tree with the same relative paths, publication images, selected integration documentation, and
browser-experiment provenance. After mdBook renders that tree, `finalize.py` adds page-specific search metadata,
canonical URLs, a sitemap, and intrinsic publication-image dimensions. The build rejects broken local links and search
metadata before publishing.

Build the site:

```console
nix develop --command bash docs/build.sh
```

Serve it locally:

```console
nix develop --command bash docs/serve.sh
```

Use `nix develop --command bash docs/serve.sh --port 3001` when the default port is occupied. The preview runs the same
build and finalization checks as publication, then serves `build/docs/`. It restarts when a canonical document,
publication asset, integration document, experiment, theme file, or documentation build script changes.

GitHub Pages deploys this documentation beneath `/doctrine-of-the-second-sun/`, so the build intentionally omits a
project-level `robots.txt`; crawlers only request that file from the `jbboehr.github.io` origin root. Submit the
generated `sitemap.xml` explicitly to search tools; this repository cannot advertise it through `robots.txt`.

Generated HTML is written to `build/docs/`. Neither generated source nor rendered output is committed.
