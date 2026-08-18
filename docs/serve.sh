#!/usr/bin/env bash

set -euo pipefail

repository_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

if [[ "${1:-}" == "--serve-once" ]]; then
    shift
    bash "$repository_root/docs/stage.sh"
    exec mdbook serve "$repository_root/docs" --hostname 127.0.0.1 "$@"
fi

watch_paths=(
    "$repository_root/README.md"
    "$repository_root/DOCTRINE-STYLE-GUIDE.md"
    "$repository_root/DOCTRINE-GOLD-EXEMPLARS.md"
    "$repository_root/DOCTRINE-IMAGE-GUIDE.md"
    "$repository_root/DOCTRINE-GENERATION-GUIDE.md"
    "$repository_root/DOCTRINE-CODING-GUIDE.md"
    "$repository_root/apotheosis"
    "$repository_root/INTEGRATION-GUIDE.md"
    "$repository_root/MEASURE-OF-WORDS.md"
    "$repository_root/RUINENWERT.md"
    "$repository_root/CODE_OF_SOVEREIGNTY.md"
    "$repository_root/LICENSE.md"
    "$repository_root/assets"
    "$repository_root/experiments"
    "$repository_root/integrations"
    "$repository_root/docs/SUMMARY.md"
    "$repository_root/docs/book.toml"
    "$repository_root/docs/serve.sh"
    "$repository_root/docs/stage.sh"
    "$repository_root/docs/theme"
)
watch_arguments=()

for path in "${watch_paths[@]}"; do
    watch_arguments+=(--watch "$path")
done

exec watchexec --restart --shell=none "${watch_arguments[@]}" -- \
    bash "$repository_root/docs/serve.sh" --serve-once "$@"
