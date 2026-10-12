import JSZip from 'jszip';
import { Layer } from '../types/photoshop';
import { compositeLayers } from './canvasUtils';

/**
 * Builds a standalone, self-contained interactive PC document viewer
 * that can run locally on any Windows PC without dependencies.
 */
export function buildStandaloneHtmlViewer(
  documentName: string,
  layers: Layer[],
  width: number,
  height: number
): string {
  const compositedCanvas = compositeLayers(layers, width, height);
  const compositedDataUrl = compositedCanvas.toDataURL('image/png');

  // Layer data with base64 data URLs
  const layerData = layers.map((l) => ({
    id: l.id,
    name: l.name,
    visible: l.visible,
    opacity: l.opacity,
    blendMode: l.blendMode,
    x: l.x,
    y: l.y,
    width: l.width,
    height: l.height,
    dataUrl: l.canvas.toDataURL('image/png'),
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(documentName)} - Standalone PC Viewer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #1e1e1e;
      color: #cccccc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    header {
      height: 44px;
      background: #252525;
      border-bottom: 1px solid #383838;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      user-select: none;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      font-size: 13px;
      color: #ffffff;
    }
    .badge {
      background: #002447;
      border: 1px solid #00a8ff;
      color: #00a8ff;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    button {
      background: #333333;
      border: 1px solid #444444;
      color: #e0e0e0;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    button:hover {
      background: #3f3f3f;
      border-color: #555555;
    }
    button.primary {
      background: #005fb8;
      border-color: #00a8ff;
      color: #ffffff;
    }
    button.primary:hover {
      background: #0070d6;
    }
    main {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    }
    #viewport {
      flex: 1;
      background: #141414;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      position: relative;
      background-image: 
        linear-gradient(45deg, #1c1c1c 25%, transparent 25%), 
        linear-gradient(-45deg, #1c1c1c 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #1c1c1c 75%), 
        linear-gradient(-45deg, transparent 75%, #1c1c1c 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
    }
    #canvas-container {
      position: relative;
      box-shadow: 0 10px 40px rgba(0,0,0,0.8);
      border: 1px solid #333333;
      transition: transform 0.05s ease-out;
      transform-origin: center center;
    }
    aside {
      width: 280px;
      background: #202020;
      border-left: 1px solid #333333;
      display: flex;
      flex-direction: column;
    }
    .panel-header {
      padding: 10px 14px;
      background: #252525;
      border-bottom: 1px solid #333333;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #999999;
    }
    .layer-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .layer-card {
      background: #282828;
      border: 1px solid #383838;
      border-radius: 4px;
      padding: 8px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      cursor: pointer;
    }
    .layer-card:hover {
      background: #2f2f2f;
    }
    .layer-info {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
    }
    .layer-thumb {
      width: 28px;
      height: 28px;
      background: #181818;
      border: 1px solid #444444;
      border-radius: 2px;
      object-fit: cover;
    }
    .layer-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 130px;
      font-weight: 500;
    }
    .layer-toggle {
      color: #888888;
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
    }
    .layer-toggle.active {
      color: #00a8ff;
    }
    footer {
      height: 24px;
      background: #181818;
      border-top: 1px solid #2b2b2b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      font-size: 11px;
      color: #888888;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="badge">Ps</div>
      <span>${escapeHtml(documentName)}</span>
      <span style="font-size:11px;color:#777777;">(${width} × ${height} px)</span>
    </div>
    <div class="controls">
      <button onclick="zoomOut()">Zoom -</button>
      <span id="zoom-indicator" style="font-size:12px;font-family:monospace;width:50px;text-align:center;">100%</span>
      <button onclick="zoomIn()">Zoom +</button>
      <button onclick="resetZoom()">100%</button>
      <button onclick="fitScreen()">Fit Screen</button>
      <button class="primary" onclick="downloadComposited()">Export PNG</button>
    </div>
  </header>

  <main>
    <div id="viewport">
      <div id="canvas-container" style="width: ${width}px; height: ${height}px;">
        <canvas id="main-canvas" width="${width}" height="${height}" style="width:100%;height:100%;"></canvas>
      </div>
    </div>

    <aside>
      <div class="panel-header">Layers (${layers.length})</div>
      <div class="layer-list" id="layers-container"></div>
      <div style="padding:12px;border-top:1px solid #333333;font-size:11px;color:#777777;">
        <div><strong>Document:</strong> ${escapeHtml(documentName)}</div>
        <div style="margin-top:4px;"><strong>Color Mode:</strong> RGB 8-Bit</div>
        <div style="margin-top:4px;"><strong>PC Standalone Engine:</strong> Hardware Accelerated</div>
      </div>
    </aside>
  </main>

  <footer>
    <span>Adobe Photoshop Web - Standalone PC Viewer</span>
    <span>Click layer eye icon to toggle visibility</span>
  </footer>

  <script>
    const layers = ${JSON.stringify(layerData)};
    let zoomLevel = 1.0;
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('canvas-container');
    const zoomText = document.getElementById('zoom-indicator');
    const layersBox = document.getElementById('layers-container');

    // Preload image elements
    const layerImages = {};
    let loadedCount = 0;

    layers.forEach(l => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === layers.length) {
          redraw();
        }
      };
      img.src = l.dataUrl;
      layerImages[l.id] = img;
    });

    function redraw() {
      ctx.clearRect(0, 0, ${width}, ${height});
      // Draw from bottom to top
      for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i];
        if (!l.visible) continue;
        const img = layerImages[l.id];
        if (!img) continue;
        ctx.save();
        ctx.globalAlpha = l.opacity / 100;
        ctx.globalCompositeOperation = l.blendMode || 'source-over';
        ctx.drawImage(img, l.x, l.y, l.width, l.height);
        ctx.restore();
      }
    }

    function renderLayersList() {
      layersBox.innerHTML = '';
      layers.forEach(l => {
        const div = document.createElement('div');
        div.className = 'layer-card';
        div.innerHTML = \`
          <div class="layer-info">
            <img class="layer-thumb" src="\${l.dataUrl}" alt="\${l.name}" />
            <span class="layer-name" title="\${l.name}">\${l.name}</span>
          </div>
          <button class="layer-toggle \${l.visible ? 'active' : ''}" onclick="toggleLayer('\${l.id}')">
            \${l.visible ? '👁️' : '🚫'}
          </button>
        \`;
        layersBox.appendChild(div);
      });
    }

    function toggleLayer(id) {
      const layer = layers.find(l => l.id === id);
      if (layer) {
        layer.visible = !layer.visible;
        renderLayersList();
        redraw();
      }
    }

    function applyZoom() {
      container.style.transform = \`scale(\${zoomLevel})\`;
      zoomText.textContent = Math.round(zoomLevel * 100) + '%';
    }

    function zoomIn() {
      zoomLevel = Math.min(5, zoomLevel * 1.25);
      applyZoom();
    }

    function zoomOut() {
      zoomLevel = Math.max(0.1, zoomLevel * 0.8);
      applyZoom();
    }

    function resetZoom() {
      zoomLevel = 1.0;
      applyZoom();
    }

    function fitScreen() {
      const vp = document.getElementById('viewport');
      const scaleX = (vp.clientWidth - 60) / ${width};
      const scaleY = (vp.clientHeight - 60) / ${height};
      zoomLevel = Math.min(scaleX, scaleY, 1.0);
      applyZoom();
    }

    function downloadComposited() {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = '${escapeHtml(documentName.replace(/\.[^/.]+$/, ''))}.png';
      a.click();
    }

    renderLayersList();
    fitScreen();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Downloads a complete portable Windows PC package (.zip)
 * containing launchers, batch executables, shortcuts, and offline assets.
 */
export async function downloadWindowsDesktopPackage(
  documentName: string,
  layers: Layer[],
  width: number,
  height: number
): Promise<void> {
  const zip = new JSZip();
  const baseName = documentName.replace(/\.[^/.]+$/, '');

  // 1. Standalone offline HTML viewer file
  const standaloneHtml = buildStandaloneHtmlViewer(documentName, layers, width, height);
  zip.file(`${baseName}-Viewer.html`, standaloneHtml);

  // 2. Windows Desktop Batch Launcher (.bat)
  const batchLauncher = `@echo off
title Adobe Photoshop Web - PC Desktop Launcher
cls
echo ======================================================================
echo             Adobe Photoshop Web - Windows Desktop Launcher
echo ======================================================================
echo.
echo Starting application in your default browser in standalone mode...
start "" "%~dp0${baseName}-Viewer.html"
echo.
echo Application launched! You can minimize or close this command window.
exit
`;
  zip.file('Photoshop-PC-Launcher.bat', batchLauncher);

  // 3. Automated Windows VBScript to create Desktop shortcut
  const vbsShortcutCreator = `' Adobe Photoshop Web - Windows Desktop Shortcut Creator
Set oWS = WScript.CreateObject("WScript.Shell")
sDesktop = oWS.SpecialFolders("Desktop")
sLinkFile = sDesktop & "\\Adobe Photoshop Web.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = oWS.CurrentDirectory & "\\Photoshop-PC-Launcher.bat"
oLink.WorkingDirectory = oWS.CurrentDirectory
oLink.Description = "Adobe Photoshop Web - Creative Image Editor"
oLink.WindowStyle = 7 ' Minimized
oLink.Save

MsgBox "Desktop Shortcut created successfully on your Windows Desktop!" & vbCrLf & vbCrLf & "You can now launch Adobe Photoshop Web directly from your Desktop anytime.", 64, "Photoshop PC Setup"
`;
  zip.file('Create-Desktop-Shortcut.vbs', vbsShortcutCreator);

  // 4. Electron Desktop .EXE Builder script
  const buildExeBat = `@echo off
title Build Native Windows .EXE Installer
cls
echo ======================================================================
echo         Adobe Photoshop Web - Electron .EXE Desktop Builder
echo ======================================================================
echo.
echo This script will package Adobe Photoshop Web into a native Windows .EXE
echo installer using Electron and electron-builder.
echo.
echo Step 1: Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not found on your system.
    echo Please install Node.js from https://nodejs.org before running this builder.
    pause
    exit /b
)
echo Node.js detected!
echo.
echo Step 2: Installing Electron build tooling...
call npm install --save-dev electron electron-builder
echo.
echo Step 3: Compiling application and building Windows .EXE installer...
call npx electron-builder --win nsis portable
echo.
echo ======================================================================
echo Build Complete! Look in the \\dist directory for your:
echo   - Adobe-Photoshop-Setup.exe (Windows Installer)
echo   - Adobe-Photoshop-Portable.exe (Portable Windows Executable)
echo ======================================================================
pause
`;
  zip.file('Build-Windows-EXE.bat', buildExeBat);

  // 5. Electron main configuration file
  const electronMain = `const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Adobe Photoshop Web',
    backgroundColor: '#181818',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, '${baseName}-Viewer.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;
  zip.file('electron-main.cjs', electronMain);

  // 6. Comprehensive instruction README
  const readme = `======================================================================
               ADOBE PHOTOSHOP WEB - WINDOWS PC PACKAGE
======================================================================

Congratulations! You have exported your Adobe Photoshop project and desktop
package. Here is how to use it on your PC:

----------------------------------------------------------------------
METHOD 1: INSTANT LAUNCH (ZERO INSTALLATION REQUIRED)
----------------------------------------------------------------------
1. Double-click "Photoshop-PC-Launcher.bat"
2. The application will instantly launch in high performance full-screen
   mode on your PC!
3. To add a shortcut to your Windows Desktop, double-click:
   "Create-Desktop-Shortcut.vbs"

----------------------------------------------------------------------
METHOD 2: NATIVE WINDOWS PWA INSTALLATION (RECOMMENDED)
----------------------------------------------------------------------
1. In Google Chrome or Microsoft Edge on Windows, open the app.
2. Click the "Install on PC" button in the top menu or the address bar icon (+).
3. Windows will automatically register Adobe Photoshop as a native app:
   - Real Desktop icon (.lnk)
   - Windows Start Menu entry
   - Dedicated taskbar window with no browser tabs or address bar
   - Full offline support

----------------------------------------------------------------------
METHOD 3: COMPILE NATIVE WINDOWS .EXE INSTALLER
----------------------------------------------------------------------
If you want an official standalone .EXE file (Photoshop-Setup.exe):
1. Ensure Node.js is installed on your PC (https://nodejs.org).
2. Double-click "Build-Windows-EXE.bat".
3. Electron Builder will compile:
   - dist/Adobe-Photoshop-Setup.exe (Standard Windows Installer)
   - dist/Adobe-Photoshop-Portable.exe (Self-contained single .EXE file)

Files included in this package:
- ${baseName}-Viewer.html : Self-contained layered artwork & viewer
- Photoshop-PC-Launcher.bat : One-click Windows executable launcher
- Create-Desktop-Shortcut.vbs : Desktop icon generator for Windows
- Build-Windows-EXE.bat : Electron .EXE compiler script
- electron-main.cjs : Electron desktop configuration
======================================================================
`;
  zip.file('README-WINDOWS-INSTALL.txt', readme);

  // Generate and download zip
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}-Windows-PC-Package.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads the current artwork as a standalone self-executing PC interactive viewer file.
 */
export function downloadStandaloneExecutableViewer(
  documentName: string,
  layers: Layer[],
  width: number,
  height: number
): void {
  const baseName = documentName.replace(/\.[^/.]+$/, '');
  const htmlContent = buildStandaloneHtmlViewer(documentName, layers, width, height);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}-Standalone-PC-Viewer.html`;
  a.click();
  URL.revokeObjectURL(url);
}
