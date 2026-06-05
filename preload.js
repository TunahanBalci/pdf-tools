const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: () => true,
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  saveFile: (dirPath, filename, base64Data) => ipcRenderer.invoke("save-file", { dirPath, filename, base64Data }),
  saveFileDialog: (defaultName) => ipcRenderer.invoke("save-file-dialog", defaultName),
  writeFileToPath: (filePath, base64Data) => ipcRenderer.invoke("write-file-to-path", { filePath, base64Data }),
});
