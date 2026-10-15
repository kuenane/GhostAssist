#!/usr/bin/env sh
# GhostAssist one-click installer for macOS and Linux
#   curl -fsSL https://raw.githubusercontent.com/kuenane/GhostAssist/main/install.sh | sh
set -eu

REPO="kuenane/GhostAssist"
API="https://api.github.com/repos/$REPO/releases/latest"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OS="$(uname -s)"
ARCH="$(uname -m)"

fetch_urls() { curl -fsSL "$API" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/.*"\(https[^"]*\)"/\1/'; }
pick() { fetch_urls | grep -i "$1" | head -n 1; }

echo "==> GhostAssist installer ($OS/$ARCH)"

case "$OS" in
  Darwin)
    case "$ARCH" in arm64) PAT='aarch64.*\.dmg$' ;; *) PAT='x64.*\.dmg$' ;; esac
    URL="$(pick "$PAT")"
    [ -n "$URL" ] || { echo "No macOS build found in the latest release."; exit 1; }
    echo "==> Downloading $URL"
    curl -fL "$URL" -o "$TMP/GhostAssist.dmg"
    MNT="$(hdiutil attach -nobrowse -quiet "$TMP/GhostAssist.dmg" | tail -n 1 | cut -f3)"
    rm -rf "/Applications/GhostAssist.app"
    cp -R "$MNT"/GhostAssist.app /Applications/
    hdiutil detach -quiet "$MNT"
    xattr -dr com.apple.quarantine /Applications/GhostAssist.app 2>/dev/null || true
    echo "==> Installed to /Applications/GhostAssist.app"
    open -a GhostAssist
    ;;
  Linux)
    case "$ARCH" in x86_64|amd64) DEB='amd64\.deb$'; RPM='x86_64\.rpm$'; APPI='amd64\.AppImage$' ;;
      aarch64|arm64) DEB='arm64\.deb$'; RPM='aarch64\.rpm$'; APPI='aarch64\.AppImage$' ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;; esac
    SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
    if command -v apt-get >/dev/null 2>&1 && URL="$(pick "$DEB")" && [ -n "$URL" ]; then
      echo "==> Downloading $URL"; curl -fL "$URL" -o "$TMP/ghostassist.deb"
      $SUDO apt-get install -y "$TMP/ghostassist.deb"
    elif command -v dnf >/dev/null 2>&1 && URL="$(pick "$RPM")" && [ -n "$URL" ]; then
      echo "==> Downloading $URL"; curl -fL "$URL" -o "$TMP/ghostassist.rpm"
      $SUDO dnf install -y "$TMP/ghostassist.rpm"
    else
      URL="$(pick "$APPI")"
      [ -n "$URL" ] || { echo "No Linux build found in the latest release."; exit 1; }
      echo "==> Downloading AppImage $URL"
      mkdir -p "$HOME/.local/bin"
      curl -fL "$URL" -o "$HOME/.local/bin/GhostAssist.AppImage"
      chmod +x "$HOME/.local/bin/GhostAssist.AppImage"
      echo "==> Installed to ~/.local/bin/GhostAssist.AppImage"
    fi
    echo "==> Done. Launch GhostAssist from your app menu."
    ;;
  *) echo "Unsupported OS: $OS (use install.ps1 on Windows)"; exit 1 ;;
esac
