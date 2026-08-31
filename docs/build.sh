#!/usr/bin/env bash

set -euo pipefail

repository_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

bash "$repository_root/docs/stage.sh"
mdbook build "$repository_root/docs"
python3 "$repository_root/docs/finalize.py" "$repository_root/build/docs"
python3 "$repository_root/docs/check-links.py" "$repository_root/build/docs"
python3 "$repository_root/docs/check-seo.py" "$repository_root/build/docs"
