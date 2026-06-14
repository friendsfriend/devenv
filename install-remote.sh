#!/usr/bin/env sh
# Remote install: downloads latest devenv from GitHub releases
# Usage: curl -fsSL https://raw.githubusercontent.com/friendsfriend/devenv/main/install-remote.sh | sh
set -eu

INSTALL_DIR="${HOME}/.local/bin"
BINARY_NAME="devenv"
REPO="friendsfriend/devenv"

# --- Platform detection ---
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
x86_64 | amd64) ARCH="x64" ;;
aarch64 | arm64) ARCH="arm64" ;;
*)
	echo "Unsupported architecture: $ARCH"
	exit 1
	;;
esac

case "$OS" in
darwin | linux) ;;
*)
	echo "Unsupported OS: $OS"
	exit 1
	;;
esac

PLATFORM="${OS}-${ARCH}"

# --- Resolve latest version ---
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
TAG="$(curl -fsSL "$API_URL" | grep '"tag_name"' | head -1 | sed 's/.*: "//;s/",//')"
if [ -z "$TAG" ]; then
	echo "Failed to resolve latest version from GitHub API"
	exit 1
fi

DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/devenv-${PLATFORM}.tar.gz"
echo "Downloading devenv ${TAG} for ${PLATFORM}..."

# --- Download & extract ---
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

curl -fsSL "$DOWNLOAD_URL" | tar xz -C "$TMPDIR"

BINARY="${TMPDIR}/devenv-${PLATFORM}/bin/devenv"
if [ ! -f "$BINARY" ]; then
	echo "Downloaded archive does not contain expected binary"
	exit 1
fi

# --- Install ---
mkdir -p "$INSTALL_DIR"
cp "$BINARY" "${INSTALL_DIR}/${BINARY_NAME}"
chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

# --- macOS: strip quarantine ---
if [ "$OS" = "darwin" ]; then
	xattr -d com.apple.quarantine "${INSTALL_DIR}/${BINARY_NAME}" 2>/dev/null || true
fi

echo "Installed devenv to ${INSTALL_DIR}/${BINARY_NAME}"

# --- PATH check ---
case ":${PATH}:" in
*":${INSTALL_DIR}:"*) ;;
*)
	echo ""
	echo "Warning: ${INSTALL_DIR} is not in your PATH."
	echo "Add to your shell config (~/.zshrc / ~/.bashrc):"
	echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
	;;
esac
