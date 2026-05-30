const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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
