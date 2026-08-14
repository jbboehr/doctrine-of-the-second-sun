# Rendered documentation

mdBook renders the repository's canonical root documents without creating a second authored copy. `stage.sh` assembles
the ignored `docs/src/` tree with the same relative paths, publication images, selected integration documentation, and
browser-experiment provenance.

Build the site:

```console
nix develop --command bash docs/build.sh
```

Serve it locally:

```console
nix develop --command bash docs/serve.sh
```

Pass mdBook serve options after the script path. For example, use
`nix develop --command bash docs/serve.sh --port 3001` when the default port is occupied. The preview restarts when a
canonical document, publication asset, integration document, experiment, or theme file changes.

Generated HTML is written to `build/docs/`. Neither generated source nor rendered output is committed.
