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

Inside the development shell, `composer docs:build` and `composer docs:serve` run the same scripts. The shell supplies
`php`, `composer`, `mdbook`, `python3`, and `watchexec`, so run them under `nix develop` or an active direnv environment
rather than from a bare shell.

Pass mdBook serve options after the script path. For example, use
`nix develop --command bash docs/serve.sh --port 3001` when the default port is occupied. The preview restarts when a
canonical document, publication asset, integration document, experiment, or theme file changes.

Generated HTML is written to `build/docs/`. Neither generated source nor rendered output is committed.
