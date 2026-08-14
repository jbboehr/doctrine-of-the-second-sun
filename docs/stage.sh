#!/usr/bin/env bash

set -euo pipefail

repository_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
stage_root="$repository_root/docs/src"

if [[ "$stage_root" != "$repository_root/docs/src" ]]; then
    echo "Refusing to stage documentation outside docs/src" >&2
    exit 1
fi

mkdir -p "$stage_root"
find "$stage_root" -depth -mindepth 1 -delete

root_documents=(
    README.md
    DOCTRINE-STYLE-GUIDE.md
    DOCTRINE-GOLD-EXEMPLARS.md
    DOCTRINE-IMAGE-GUIDE.md
    DOCTRINE-GENERATION-GUIDE.md
    DOCTRINE-CODING-GUIDE.md
    INTEGRATION-GUIDE.md
    MEASURE-OF-WORDS.md
    RUINENWERT.md
    CODE_OF_SOVEREIGNTY.md
    LICENSE.md
)

for document in "${root_documents[@]}"; do
    install -Dm0644 "$repository_root/$document" "$stage_root/$document"
done

install -Dm0644 "$repository_root/docs/SUMMARY.md" "$stage_root/SUMMARY.md"

# The committed summary resolves from docs/. The staged copy resolves from docs/src/.
sed -i.bak 's#](\.\./#](#g' "$stage_root/SUMMARY.md"

integration_documents=(
    integrations/codex/README.md
    integrations/phpstan/README.md
    integrations/phpstan/LICENSE.md
    integrations/phpstan/LICENSE_EXCEPTION.md
    integrations/web/heliogenesis/README.md
    integrations/web/document-looks-back/README.md
)

for document in "${integration_documents[@]}"; do
    install -Dm0644 "$repository_root/$document" "$stage_root/$document"
done

while IFS= read -r -d '' asset; do
    relative_path=${asset#"$repository_root/"}
    install -Dm0644 "$asset" "$stage_root/$relative_path"
done < <(find "$repository_root/assets" -type f ! -name '*-hq*' -print0)

while IFS= read -r -d '' experiment; do
    relative_path=${experiment#"$repository_root/"}
    install -Dm0644 "$experiment" "$stage_root/$relative_path"
done < <(find "$repository_root/experiments" -type f \
    \( -name 'README.md' -o -name '*.html' \) -print0)

# mdBook renders a chapter named README.md as index.html, but ordinary Markdown links to it as README.html.
while IFS= read -r -d '' document; do
    sed -i.bak \
        -e 's#integrations/codex/README\.md#integrations/codex/#g' \
        -e 's#integrations/phpstan/README\.md#integrations/phpstan/#g' \
        -e 's#integrations/web/heliogenesis/README\.md#integrations/web/heliogenesis/#g' \
        -e 's#integrations/web/document-looks-back/README\.md#integrations/web/document-looks-back/#g' \
        -e 's#\.\./\.\./\.\./experiments/README\.md#../../../experiments/#g' \
        "$document"
done < <(find "$stage_root" -type f -name '*.md' ! -name 'SUMMARY.md' -print0)

find "$stage_root" -type f -name '*.bak' -delete
