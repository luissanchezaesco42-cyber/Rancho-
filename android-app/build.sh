#!/usr/bin/env bash
# Compila la APK sin Gradle ni SDK oficial. Requiere: aapt, dx, zipalign, apksigner, javac, libandroid-23-java.
# Uso: ./build.sh   -> genera build/rancho-menu.apk
set -euo pipefail
cd "$(dirname "$0")"
ANDROID_JAR=/usr/share/java/com.android.android-23.jar
KS=${KS:-rancho-release.keystore}; KSPASS=${KSPASS:-rancho2026}
rm -rf build && mkdir -p build/classes build/assets
# Copia la app web a los assets (sin servidor, README ni service worker)
cp -r ../menu-app/. build/assets/
rm -f build/assets/server.mjs build/assets/README.md build/assets/sw.js
aapt package -f -M AndroidManifest.xml -S res -A build/assets -I "$ANDROID_JAR" \
  --min-sdk-version 29 --target-sdk-version 34 --version-code 11 --version-name 1.10 -F build/base.apk
javac -nowarn -source 8 -target 8 -bootclasspath "$ANDROID_JAR" -d build/classes src/com/rancho/menu/*.java 2> build/javac.log || { cat build/javac.log; exit 1; }
dalvik-exchange --dex --min-sdk-version=29 --output=build/classes.dex build/classes
(cd build && aapt add base.apk classes.dex >/dev/null)
zipalign -f -p 4 build/base.apk build/aligned.apk
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -storepass "$KSPASS" -keypass "$KSPASS" -alias rancho -keyalg RSA -keysize 2048 \
    -validity 10950 -dname "CN=Rancho Ruisenor, O=Rancho, C=CO" >/dev/null 2>&1
fi
apksigner sign --v2-signing-enabled true --v3-signing-enabled true --ks "$KS" --ks-pass "pass:$KSPASS" --key-pass "pass:$KSPASS" --out build/rancho-menu.apk build/aligned.apk
apksigner verify --verbose build/rancho-menu.apk | head -5
ls -la build/rancho-menu.apk
