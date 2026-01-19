#!/bin/bash
# Sign all APK variants

echo "Signing all APK variants..."
echo "=============================="

KEYSTORE="debug.keystore"
STOREPASS="android"
KEYPASS="android"
ALIAS="androiddebugkey"

cd "$(dirname "$0")/output"

for apk in *.apk; do
    if [[ "$apk" == *"-unsigned.apk" ]]; then
        continue
    fi
    
    echo ""
    echo "Signing ${apk}..."
    
    # Backup unsigned version
    cp "$apk" "${apk%.apk}-unsigned.apk"
    
    # Sign APK
    jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
        -keystore "../${KEYSTORE}" \
        -storepass "${STOREPASS}" \
        -keypass "${KEYPASS}" \
        "$apk" "${ALIAS}"
    
    if [ $? -eq 0 ]; then
        echo "✓ ${apk} signed successfully"
    else
        echo "✗ ${apk} signing failed"
    fi
done

echo ""
echo "=============================="
echo "Signing complete!"
