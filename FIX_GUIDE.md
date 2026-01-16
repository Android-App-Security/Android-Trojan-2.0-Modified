# Fixing APK Generation Issues

This guide documents the steps taken to fix APK generation errors on macOS (and other non-Windows systems) running newer Java versions (e.g., Java 22).

## Prerequisite: Android SDK
Ensure you have the Android SDK installed. You must configure the SDK location in one of two ways:
1.  **Environment Variable**: Set `ANDROID_HOME` pointing to your SDK.
2.  **local.properties**: Create a file named `local.properties` in the `mobile/` directory with the following content:
    ```properties
    sdk.dir=/path/to/your/android/sdk
    ```

## Step 1: Fix Client-Side Port Issue
**File**: `static/js/index.js`

Modify the `download()` function to provide a default port if the user doesn't enter one.

```javascript
/* static/js/index.js */
function download() {
    // ...
    if(data.length){
        var [m_ip,m_port]  = data.split(':')
        if(!m_port) m_port = 4000 // Add this line
        // ...
    }
    // ...
}
```

## Step 2: Fix Server-Side OS Compatibility
**File**: `modules/compileApk.js`

Update the script to use `./gradlew` on Unix-like systems and ensure it has execute permissions.

```javascript
/* modules/compileApk.js */
async function compile() {
    const isWindows = process.platform === "win32";
    var command = isWindows ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug';
    var options = {
        cwd: './mobile',
        env: { ...process.env } // Ensure environment variables are passed (crucial for ANDROID_HOME)
    }

    if (!isWindows) {
        try {
            const fs = await import('fs/promises');
            await fs.chmod('./mobile/gradlew', 0o755);
        } catch (e) {
            console.error("Failed to chmod gradlew", e);
        }
    }
    // ... exec logic ...
}
```

## Step 3: Upgrade Build System (For Java 22+)
If you see errors like `Unsupported class file major version 66` (Java 22), you must upgrade Gradle and the Android Gradle Plugin.

### 3.1 Upgrade Gradle Wrapper
**File**: `mobile/gradle/wrapper/gradle-wrapper.properties`

Update the `distributionUrl` to version **8.10.2** (or newer).

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-bin.zip
```

### 3.2 Upgrade Android Gradle Plugin
**File**: `mobile/build.gradle` (Root)

Update the plugin versions to **8.3.0**.

```gradle
plugins {
    id 'com.android.application' version '8.3.0' apply false
    id 'com.android.library' version '8.3.0' apply false
}
```

### 3.3 Update App Module Config
**File**: `mobile/app/build.gradle`

Update SDK versions and Java compatibility to **Java 17**.

```gradle
android {
    compileSdk 34 // Upgrade from 32

    defaultConfig {
        // ...
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    // Upgrade dependencies to be compatible with AGP 8+
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    // ...
}
```

## Step 4: Verify
1.  Run `npm start`.
2.  Go to the dashboard and trigger a download.
3.  Check the console logs for `stdout: true`.
