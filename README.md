# 📄 Portable PDF Merger

A beautiful, modern, drag-and-drop PDF merging desktop application built with **React**, **Vite**, and **Electron**. 

It runs completely offline and locally on your machine—your PDF files never leave your computer, ensuring absolute privacy and security.

<img width="1920" height="1080" alt="app demonstration gif" src="https://github.com/user-attachments/assets/e0c55f95-5fb8-4756-8aa8-411b5883da6a" />

---



## 🖥️ How to Install & Use

You can download the latest precompiled versions for both Windows and Linux from the [Releases](https://github.com/TunahanBalci/pdf-merger/releases) section.

### 🪟 Windows (Portable Executable)
1. Download the `PDFMerger-x.x.x.exe` file.
2. **Double-click** the file to run it immediately. No installation or setup required!
3. > [!NOTE]
   > **Windows Defender SmartScreen**: Since the app is unsigned, Windows may show a *"Windows protected your PC"* popup. Click **"More info"** and then **"Run anyway"** to launch it.

---

### 🐧 Linux (Ubuntu / Debian / Fedora / Arch)

#### Option 1: Debian/Ubuntu Native Package (`.deb`) — Recommended
This installs the app natively on your system and adds a shortcut to your desktop application menu:
1. Download the `pdf-merger_x.x.x_amd64.deb` file.
2. Install it using the terminal:
   ```bash
   sudo apt install ./pdf-merger_x.x.x_amd64.deb
   ```
3. Open your desktop menu, search for **PDFMerger**, and launch it!

#### Option 2: Portable AppImage (`.AppImage`)
Runs instantly on any Linux distribution without installing anything:
1. Download the `PDFMerger-x.x.x.AppImage` file.
2. Grant it execute permissions:
   ```bash
   chmod +x PDFMerger-x.x.x.AppImage
   ```
3. Run the AppImage.
4. > [!TIP]
   > **If it fails to open (FUSE 2 error)**: Modern distributions (like Ubuntu 22.04+ or Debian 12+) don't pre-install FUSE 2. You can install it using `sudo apt install libfuse2`, or bypass it by running the AppImage with the extract flag:
   > ```bash
   > ./PDFMerger-x.x.x.AppImage --appimage-extract-and-run
   > ```

---

## 🚀 Key Features

* **Drag-and-Drop Reordering**: Rearrange selected files dynamically with real-time card swapping.
* **Smart PDF Validation**: Automatically checks that added files are valid PDFs.
* **Floating Control Panel**: Track merge statistics (file count, total size) in real-time.
* **Instant Merge Engine**: High-performance local merge powered by `pdf-lib`.
* **Beautiful Revamped UI**: Modern dark theme with smooth animations, custom scrollbars, and a responsive glassmorphic design.

---

## 🛠️ Development Setup

To run or package the app locally:

### Prerequisites
* **Node.js** (v18+) & **npm**

### Installation
```bash
git clone https://github.com/TunahanBalci/pdf-merger.git
cd pdf-merger
npm install
```

### Commands
* **Run web interface**: `npm run dev`
* **Run desktop app (dev mode)**: `npm run electron:dev`
* **Package desktop binaries locally (current host OS)**: `npm run electron:build`
* **Package Linux-only binaries**: `npm run electron:build:linux`
* **Package Windows-only binaries**: `npm run electron:build:win`
