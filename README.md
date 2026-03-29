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

### Benchmark Plate Accuracy
Create a CSV manifest with at least `image_path` and `expected_plate`. You can also add `expected_direction` if you want Entry/Exit accuracy.

Sample manifest:
`GATIQ API/benchmark_manifest.sample.csv`

Run benchmark:
```powershell
& ".\GATIQ API\venv\Scripts\python.exe" ".\GATIQ API\benchmark_dataset.py" ".\GATIQ API\benchmark_manifest.sample.csv" --json-out ".\GATIQ API\benchmark_report.json"
```

The script reports:
- exact plate match rate
- normalized plate match rate
- unreadable prediction rate
- optional direction accuracy
- per-image detection time and pass/fail details

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

## CI/CD

This repo now supports GitHub Actions for Windows-based CI/CD.

### CI workflow
- installs Node.js and Python
- creates `GATIQ API\venv`
- installs backend requirements plus `pyinstaller`
- runs frontend/backend validation
- builds the packaged backend
- validates the unpacked desktop release

### Release workflow
- runs on version tags like `v1.0.6`
- builds the Windows NSIS installer
- uploads release artifacts to GitHub Actions
- can publish through `electron-builder` using GitHub token permissions

### Important setup notes
- GitHub Actions must run on `windows-latest` because the desktop build and PowerShell scripts are Windows-specific.
- The workflow creates `GATIQ API\venv` because local build scripts expect that exact path.
- Set repository `Actions` permissions so workflows can write release contents.
- For GitHub release publishing, the workflow uses `GH_TOKEN` from `secrets.GITHUB_TOKEN`.
- If you later add Windows code signing, also configure `CSC_LINK` and `CSC_KEY_PASSWORD` secrets.
- Branch protection should require the `Windows Desktop Validation` check before merge.
- Release notes are generated automatically when the tag-based release workflow publishes GitHub Releases.
- Your current git remote and `package.json > build.publish` repo target should match before release publishing is relied on.

### Typical tag release flow
```powershell
git tag v1.0.6
git push origin v1.0.6
```

The release workflow will build the installer and publish artifacts for that version.

### Version bump and tag helper
```powershell
npm run release:tag -- -Version 1.0.6
```

Optional flags:
- `-Commit`
- `-Tag`
- `-Push`

Example:
```powershell
npm run release:tag -- -Version 1.0.6 -Commit -Tag -Push
```

## 🛡️ Security & Privacy
- **Offline First**: All AI processing and log storage happen locally on your machine.
- **Sandboxed Renderer**: Electron security best practices (context isolation, disabled node integration) are strictly enforced.
- **Local-Only API**: The backend binds exclusively to `127.0.0.1`.

## 📝 License
Proprietary / Internal project of **Abiliqt Technologies Pvt. Ltd.**
