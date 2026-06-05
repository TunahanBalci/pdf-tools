const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    autoHideMenuBar: true,
  });

  if (process.env.NODE_ENV === "development") {
    // Development mode: load from Vite development server
    win.loadURL("http://localhost:5173").catch((err) => {
      console.log("Vite dev server not ready yet. Retrying in 1s...", err.message);
      setTimeout(() => {
        win.loadURL("http://localhost:5173");
      }, 1000);
    });
  } else {
    // Production mode: load static files built by Vite
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

// IPC handler for selecting a folder
ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Output Folder",
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

// IPC handler for writing buffer to disk using base64Data
ipcMain.handle("save-file", async (event, { dirPath, filename, base64Data }) => {
  try {
    const fullPath = path.join(dirPath, filename);
    await fs.promises.writeFile(fullPath, Buffer.from(base64Data, "base64"));
    return { success: true, path: fullPath };
  } catch (err) {
    console.error("Save file error:", err);
    return { success: false, error: err.message };
  }
});

// IPC handler for showing save file dialog
ipcMain.handle("save-file-dialog", async (event, defaultName) => {
  const result = await dialog.showSaveDialog({
    title: "Save Merged PDF",
    defaultPath: defaultName,
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });
  if (result.canceled) {
    return null;
  }
  return result.filePath;
});

// IPC handler for writing base64Data to absolute path
ipcMain.handle("write-file-to-path", async (event, { filePath, base64Data }) => {
  try {
    await fs.promises.writeFile(filePath, Buffer.from(base64Data, "base64"));
    return { success: true };
  } catch (err) {
    console.error("Write file to path error:", err);
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
