#!/bin/sh
# Builds the .vsix without vsce/npm packages — only the system `zip` is used.
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
PUBLISHER=$(node -p "require('./package.json').publisher")
DISPLAY=$(node -p "require('./package.nls.json').displayName")
DESC=$(node -p "require('./package.nls.json').description")
ENGINE=$(node -p "require('./package.json').engines.vscode")
OUT="$ROOT/$NAME-$VERSION.vsix"

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

if [ ! -f out/extension.js ] || [ ! -f out/webview/main.js ]; then
  echo "out/ is missing — run 'npm run build' first." >&2
  exit 1
fi

# Runtime files only: compiled output (without tests), webview assets, manifest, README.
mkdir -p "$STAGE/extension"
cp -R package.json package.nls.json package.nls.id.json README.md README.id.md media out "$STAGE/extension/"
rm -rf "$STAGE/extension/out/test"

cat > "$STAGE/[Content_Types].xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".css" ContentType="text/css"/>
  <Default Extension=".svg" ContentType="image/svg+xml"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>
EOF

cat > "$STAGE/extension.vsixmanifest" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="$NAME" Version="$VERSION" Publisher="$PUBLISHER" />
    <DisplayName>$DISPLAY</DisplayName>
    <Description xml:space="preserve">$DESC</Description>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="$ENGINE" />
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
  </Assets>
</PackageManifest>
EOF

rm -f "$OUT"
(cd "$STAGE" && zip -qrX "$OUT" "[Content_Types].xml" extension.vsixmanifest extension)
echo "Created: $OUT"
