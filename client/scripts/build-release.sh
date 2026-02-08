#!/bin/bash
# Build a release AAB for Google Play Store submission
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"
ANDROID_DIR="$CLIENT_DIR/android"

echo "=== BookReader Release Build ==="
echo ""

# Check for keystore
if [ ! -f "$ANDROID_DIR/keystore.properties" ]; then
    echo "ERROR: keystore.properties not found!"
    echo ""
    echo "To set up signing:"
    echo "  1. Generate a keystore:"
    echo "     keytool -genkey -v -keystore $ANDROID_DIR/keystore/bookreader-release.jks \\"
    echo "       -keyalg RSA -keysize 2048 -validity 10000 \\"
    echo "       -alias bookreader"
    echo ""
    echo "  2. Copy the template and fill in your passwords:"
    echo "     cp $ANDROID_DIR/keystore.properties.template $ANDROID_DIR/keystore.properties"
    echo ""
    exit 1
fi

# Step 1: Build web assets
echo "[1/4] Building web assets..."
cd "$CLIENT_DIR"
CAPACITOR_RELEASE=1 npm run build

# Step 2: Sync with Capacitor
echo "[2/4] Syncing with Capacitor..."
CAPACITOR_RELEASE=1 npx cap sync android

# Step 3: Build release AAB
echo "[3/4] Building release AAB..."
cd "$ANDROID_DIR"
./gradlew bundleRelease

# Step 4: Show result
AAB_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
    echo ""
    echo "=== Build Successful! ==="
    echo "AAB: $AAB_PATH"
    echo "Size: $(du -h "$AAB_PATH" | cut -f1)"
    echo ""
    echo "To upload to Google Play Console:"
    echo "  1. Go to https://play.google.com/console"
    echo "  2. Create/select your app"
    echo "  3. Go to Release > Production"
    echo "  4. Upload the AAB file"
else
    echo "ERROR: AAB not found at expected path"
    exit 1
fi
