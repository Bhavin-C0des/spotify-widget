import dotenv from 'dotenv';
import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

dotenv.config();

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

ipcMain.on('spotify-login', (_, url) => {
  console.log("Opening Spotify login...");

  const authWindow = new BrowserWindow({
    width: 500,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
    }
  });

  authWindow.loadURL(url);
  
  authWindow.webContents.on('will-redirect', (event, newUrl) => {

    if (newUrl.startsWith('http://127.0.0.1:8888/callback')) {
      event.preventDefault();

      const urlObj = new URL(newUrl);
      const code = urlObj.searchParams.get('code');

      if (!code) {
        console.error("No authorization code found in callback URL");
        return;
      }

      console.log("Authorization code received:", code);
      getAccessToken(code);

      authWindow.close();
    }
  })
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

async function getAccessToken(code: string){
  const clientId = process.env.VITE_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.VITE_SPOTIFY_CLIENT_SECRET;
  const redirectUri = 'http://127.0.0.1:8888/callback';

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization":
        "Basic " +
        Buffer.from(clientId + ":" + clientSecret).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
    }),
  });
  
  const data = await response.json();
  console.log("Access token response:", data);

  getCurrentlyPlaying(data.access_token);

  return data;
}

async function getCurrentlyPlaying(token: string) {
  const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", 
    {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("Status:", response.status);
  console.log("Status Text:", response.statusText);

  if (response.status === 204) {
    console.log("Nothing is currently playing");
    return null;
  }
  
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.log("Non-JSON response from Spotify:", text);
    return null;
  }

  if (!data?.item) {
    console.log("Nothing is currently playing");
    return null;
  }

  console.log("CURRENT TRACK:");
  console.log("Song:", data.item.name);
  console.log("Artist:", data.item.artists?.map((a: any) => a.name).join(", "));
  console.log("Album:", data.item.album.name);
  console.log("Album Art URL:", data.item.album.images?.[0]?.url);

  return data;
}