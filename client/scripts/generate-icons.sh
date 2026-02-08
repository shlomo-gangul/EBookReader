#!/bin/bash
# Generate app icons and splash screens from SVG source
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"
RES_DIR="$CLIENT_DIR/android/app/src/main/res"
PUBLIC_DIR="$CLIENT_DIR/public"

# Create a book icon SVG
ICON_SVG="$SCRIPT_DIR/book-icon.svg"
cat > "$ICON_SVG" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#3b82f6"/>
  <!-- Open book -->
  <g transform="translate(256,256) scale(4)">
    <!-- Left page -->
    <path d="M0,-24 L0,24 C-4,21 -12,19 -20,20 L-20,-14 C-12,-15 -4,-14 0,-12 Z" fill="white"/>
    <!-- Right page -->
    <path d="M0,-24 L0,24 C4,21 12,19 20,20 L20,-14 C12,-15 4,-14 0,-12 Z" fill="white"/>
    <!-- Page lines left -->
    <line x1="-16" y1="-5" x2="-4" y2="-7" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="-16" y1="0" x2="-4" y2="-2" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="-16" y1="5" x2="-4" y2="3" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="-16" y1="10" x2="-4" y2="8" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <!-- Page lines right -->
    <line x1="4" y1="-7" x2="16" y2="-5" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="4" y1="-2" x2="16" y2="0" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="4" y1="3" x2="16" y2="5" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="4" y1="8" x2="16" y2="10" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
  </g>
</svg>
SVGEOF

# Create a splash screen SVG (dark bg with centered book icon)
SPLASH_SVG="$SCRIPT_DIR/splash-icon.svg"
cat > "$SPLASH_SVG" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <!-- Book icon on transparent background (for splash overlay) -->
  <g transform="translate(256,220) scale(5)">
    <!-- Left page -->
    <path d="M0,-24 L0,24 C-4,21 -12,19 -20,20 L-20,-14 C-12,-15 -4,-14 0,-12 Z" fill="white"/>
    <!-- Right page -->
    <path d="M0,-24 L0,24 C4,21 12,19 20,20 L20,-14 C12,-15 4,-14 0,-12 Z" fill="white"/>
    <!-- Page lines left -->
    <line x1="-16" y1="-5" x2="-4" y2="-7" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="-16" y1="0" x2="-4" y2="-2" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="-16" y1="5" x2="-4" y2="3" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="-16" y1="10" x2="-4" y2="8" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <!-- Page lines right -->
    <line x1="4" y1="-7" x2="16" y2="-5" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="4" y1="-2" x2="16" y2="0" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="4" y1="3" x2="16" y2="5" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
    <line x1="4" y1="8" x2="16" y2="10" stroke="#3b82f6" stroke-width="1" stroke-linecap="round"/>
  </g>
  <!-- App name -->
  <text x="256" y="340" font-family="sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">BookReader</text>
</svg>
SVGEOF

echo "Generating PWA icons..."
magick "$ICON_SVG" -resize 192x192 "$PUBLIC_DIR/pwa-192x192.png"
magick "$ICON_SVG" -resize 512x512 "$PUBLIC_DIR/pwa-512x512.png"
magick "$ICON_SVG" -resize 180x180 "$PUBLIC_DIR/apple-touch-icon.png"

echo "Generating Android mipmap icons..."
magick "$ICON_SVG" -resize 48x48 "$RES_DIR/mipmap-mdpi/ic_launcher.png"
magick "$ICON_SVG" -resize 48x48 "$RES_DIR/mipmap-mdpi/ic_launcher_round.png"
magick "$ICON_SVG" -resize 72x72 "$RES_DIR/mipmap-hdpi/ic_launcher.png"
magick "$ICON_SVG" -resize 72x72 "$RES_DIR/mipmap-hdpi/ic_launcher_round.png"
magick "$ICON_SVG" -resize 96x96 "$RES_DIR/mipmap-xhdpi/ic_launcher.png"
magick "$ICON_SVG" -resize 96x96 "$RES_DIR/mipmap-xhdpi/ic_launcher_round.png"
magick "$ICON_SVG" -resize 144x144 "$RES_DIR/mipmap-xxhdpi/ic_launcher.png"
magick "$ICON_SVG" -resize 144x144 "$RES_DIR/mipmap-xxhdpi/ic_launcher_round.png"
magick "$ICON_SVG" -resize 192x192 "$RES_DIR/mipmap-xxxhdpi/ic_launcher.png"
magick "$ICON_SVG" -resize 192x192 "$RES_DIR/mipmap-xxxhdpi/ic_launcher_round.png"

echo "Generating Android foreground icons..."
magick "$ICON_SVG" -resize 108x108 "$RES_DIR/mipmap-mdpi/ic_launcher_foreground.png" 2>/dev/null || true
magick "$ICON_SVG" -resize 162x162 "$RES_DIR/mipmap-hdpi/ic_launcher_foreground.png" 2>/dev/null || true
magick "$ICON_SVG" -resize 216x216 "$RES_DIR/mipmap-xhdpi/ic_launcher_foreground.png" 2>/dev/null || true
magick "$ICON_SVG" -resize 324x324 "$RES_DIR/mipmap-xxhdpi/ic_launcher_foreground.png" 2>/dev/null || true
magick "$ICON_SVG" -resize 432x432 "$RES_DIR/mipmap-xxxhdpi/ic_launcher_foreground.png" 2>/dev/null || true

echo "Generating splash screens..."
# Portrait splash screens (dark background with centered icon)
for density_dir in drawable-port-mdpi drawable-port-hdpi drawable-port-xhdpi drawable-port-xxhdpi drawable-port-xxxhdpi; do
    case $density_dir in
        *mdpi)    W=320; H=480 ;;
        *hdpi)    W=480; H=800 ;;
        *xhdpi)   W=720; H=1280 ;;
        *xxhdpi)  W=1080; H=1920 ;;
        *xxxhdpi) W=1440; H=2560 ;;
    esac
    ICON_SIZE=$((W / 3))
    magick -size "${W}x${H}" "xc:#0f172a" \
        \( "$SPLASH_SVG" -resize "${ICON_SIZE}x${ICON_SIZE}" -background none \) \
        -gravity center -composite \
        "$RES_DIR/$density_dir/splash.png"
done

# Landscape splash screens
for density_dir in drawable-land-mdpi drawable-land-hdpi drawable-land-xhdpi drawable-land-xxhdpi drawable-land-xxxhdpi; do
    case $density_dir in
        *mdpi)    W=480; H=320 ;;
        *hdpi)    W=800; H=480 ;;
        *xhdpi)   W=1280; H=720 ;;
        *xxhdpi)  W=1920; H=1080 ;;
        *xxxhdpi) W=2560; H=1440 ;;
    esac
    ICON_SIZE=$((H / 3))
    magick -size "${W}x${H}" "xc:#0f172a" \
        \( "$SPLASH_SVG" -resize "${ICON_SIZE}x${ICON_SIZE}" -background none \) \
        -gravity center -composite \
        "$RES_DIR/$density_dir/splash.png"
done

# Default splash
magick -size "720x1280" "xc:#0f172a" \
    \( "$SPLASH_SVG" -resize "240x240" -background none \) \
    -gravity center -composite \
    "$RES_DIR/drawable/splash.png"

echo "Done! All icons and splash screens generated."
