#!/bin/sh
# Installs the golden-rules binary to ~/.local/bin (or $INSTALL_DIR) and runs it.
# Usage: curl -fsSL https://raw.githubusercontent.com/idrispwala-web/golden-rules/main/install.sh | sh
set -eu

repo=idrispwala-web/golden-rules
dir=${INSTALL_DIR:-$HOME/.local/bin}

os=$(uname -s | tr '[:upper:]' '[:lower:]')
case $(uname -m) in
  x86_64|amd64) arch=amd64 ;;
  aarch64|arm64) arch=arm64 ;;
  *) echo "unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

tag=$(curl -fsSI "https://github.com/$repo/releases/latest" | sed -n 's|^[Ll]ocation:.*/tag/\(v[^[:space:]]*\).*|\1|p')
[ -n "$tag" ] || { echo "could not find latest release" >&2; exit 1; }

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "https://github.com/$repo/releases/download/$tag/golden-rules_${tag#v}_${os}_${arch}.tar.gz" | tar -xz -C "$tmp"
mkdir -p "$dir"
mv "$tmp/golden-rules" "$dir/golden-rules"
chmod +x "$dir/golden-rules"
echo "installed golden-rules $tag to $dir"

case ":$PATH:" in
  *":$dir:"*) ;;
  *) echo "add $dir to your PATH to run golden-rules again later" ;;
esac

"$dir/golden-rules" "$@"
