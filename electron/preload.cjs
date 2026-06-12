const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  setAlwaysOnTop: (flag) => ipcRenderer.send('window-set-always-on-top', flag),
  resizeWindow: (width, height) => ipcRenderer.send('window-resize', width, height),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('window-set-ignore-mouse-events', ignore, options),
  setMinimizedState: (minimized) => ipcRenderer.send('window-set-minimized-state', minimized),
  moveWindowByDelta: (dx, dy) => ipcRenderer.send('window-move-by-delta', dx, dy),
  startWindowDrag: () => ipcRenderer.send('window-drag-start'),
  endWindowDrag: () => ipcRenderer.send('window-drag-end'),
  onUpdaterMessage: (callback) => {
    const subscription = (event, text) => callback(text);
    ipcRenderer.on('updater-message', subscription);
    return () => ipcRenderer.off('updater-message', subscription);
  },
  onUpdaterDownloaded: (callback) => {
    const subscription = (event, text) => callback(text);
    ipcRenderer.on('updater-downloaded', subscription);
    return () => ipcRenderer.off('updater-downloaded', subscription);
  },
  restartToUpdate: () => ipcRenderer.send('restart-to-update'),
});
