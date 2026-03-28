# GATIQ Desktop

GATIQ is a premium Windows desktop application for vehicle entry audit logging, featuring a bundled local AI backend for number plate scanning and secure SQLite persistence.

## 🚀 Key Features

- **Local AI Scanning**: Offline vehicle and plate detection using YOLOv8 & EasyOCR.
- **SQLite Persistence**: Robust, durable data storage for vehicle logs, whitelist, and reports.
- **Google Drive Cloud Sync**: Automated, secure backing up of PDF reports to your Google account.
- **12-Month Retention**: Automatic purging of data older than 1 year to maintain performance.
- **Managed Backend**: The FastAPI backend starts automatically with the Electron app—no manual setup required.
- **Auto-Updates**: Packaged builds automatically check GitHub for new versions.

## 📁 Data & Storage

- **Local Database**: All logs and settings are stored in a persistent SQLite file (`gatiq_local.db`) located in the user's `AppData/Roaming/gatiq-desktop/data` folder.
- **Cloud Backup**: If Cloud Sync is enabled, PDF reports are mirrored to a `GATIQ_Backups` folder on Google Drive.
- **Security**: OAuth tokens and API keys are protected using Electron's `safeStorage` (Windows DPAPI).

## 📥 End User Install Guide

### Recommended Installer
Download the latest Windows installer from the [GitHub Releases](https://github.com/nikunjclu03-afk/GATIQ/releases) page.

**Current Version: 1.0.5**

### Install Steps
1. Download `GATIQ-Setup-1.0.5.exe`.
2. Run the installer and follow the wizard.
3. Launch **GATIQ** from your Desktop or Start Menu.
4. On first launch, wait a few moments for the local AI engine to initialize.

## 🛠️ Development Setup

### Requirements
- Windows 10/11
- Node.js (v18+)
- Python 3.10+ with a virtual environment at `GATIQ API\venv`

### Setup
```powershell
# Install Node dependencies
npm install

# Build the project
npm run validate:code
npm run build:brand
npm run build:backend
npm run dist
```

### Run in Dev Mode
```powershell
npm run dev
```

## 🏗️ Project Structure

- **Renderer (UI)**: `index.html`, `js/app.js`
- **Electron Bridge**: `desktop/main.js`, `desktop/preload.js`
- **FastAPI Backend**: `GATIQ API/app/main.py`
- **Database Schema**: `GATIQ API/app/models.py`
- **Build Scripts**: `desktop/build-backend.ps1`
- **Validation Scripts**: `desktop/validate-backend-build.ps1`, `desktop/validate-release.ps1`

### Build Validation
```powershell
# Source and packaging validation
npm run validate:code
npm run validate:backend
npm run dist:validate
```

## 🛡️ Security & Privacy
- **Offline First**: All AI processing and log storage happen locally on your machine.
- **Sandboxed Renderer**: Electron security best practices (context isolation, disabled node integration) are strictly enforced.
- **Local-Only API**: The backend binds exclusively to `127.0.0.1`.

## 📝 License
Proprietary / Internal project of **Abiliqt Technologies Pvt. Ltd.**
