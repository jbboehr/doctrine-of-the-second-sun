# Codex Integration

These TOML files are optional custom-agent adapters for Codex. They implement the writer and code-blind reviewer roles
from [`DOCTRINE-GENERATION-GUIDE.md`](../../DOCTRINE-GENERATION-GUIDE.md); they are not portable agent definitions.

Complete the consuming repository's tool-neutral setup in the [`INTEGRATION-GUIDE.md`](../../INTEGRATION-GUIDE.md)
before installing these optional adapters.

## Installation

From a Composer installation, copy the adapters into the consuming repository:

```console
mkdir -p .codex/agents
cp vendor/jbboehr/doctrine-of-the-second-sun/integrations/codex/agents/*.toml .codex/agents/
```

From a Nix installation, use the directory exposed by the consuming shell:

```console
mkdir -p .codex/agents
cp "$DOCTRINE_OF_SECOND_SUN_DIR"/integrations/codex/agents/*.toml .codex/agents/
```

The consuming repository should review and commit its local copies. Codex discovers repository agents from
`.codex/agents/`; installing this package alone does not register them automatically.

Repository instructions must tell the agents where the installed style guide is located and retain local authority over
source scope, citation allocation, insertion, and verification.
