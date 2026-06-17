import dotenv from 'dotenv';
import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'fs'

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    const refreshToken = getSavedRefreshToken();
    const isLoggedIn = !!refreshToken;
    
    win?.webContents.send("auth-status", {
      isLoggedIn,
      refreshToken,
    });
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

function getSavedRefreshToken() {
  try {
    const data = fs.readFileSync("spotify-token.json", "utf-8");
    return JSON.parse(data).refresh_token;
  } catch (err) {
    return null;
  }
}

app.whenReady().then(async () => {
  createWindow();

  refreshToken = getSavedRefreshToken();

  if (refreshToken) {
    await refreshAccessToken();
  }

  if (accessToken) {
    await getCurrentlyPlaying(accessToken);
  }

  startSpotifyPolling();
});

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
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  console.log("Access token response:", data);

  fs.writeFileSync(
    "spotify-token.json",
    JSON.stringify(
      {
        refresh_token: refreshToken,
      },
      null,
      2
    )
  )

  if (!accessToken) {
    console.log("Failed to obtain access token");
    return;
  }

  win?.webContents.send("auth-status", {
    isLoggedIn: true,
    refreshToken,
  });
  console.log("Refresh token saved.");
  await getCurrentlyPlaying(accessToken);

  return data;
}

async function refreshAccessToken() {
  const clientId = process.env.VITE_SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.VITE_SPOTIFY_CLIENT_SECRET!;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization":
        "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken!,
    }),
  });

  const data = await response.json();
  console.log("Refresh token response:", data);

  if (!data.access_token) {
    console.log("Refresh failed");
    accessToken = null;
    return;
  }

  accessToken = data.access_token;
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

  if (response.status === 401) {
    console.log("Access token expired, refreshing...");
    await refreshAccessToken();
    if (!accessToken) {
      console.log("Failed to refresh access token");
      return null;
    }
    return getCurrentlyPlaying(accessToken);
  }

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

  const trackInfo = {
    name: data.item.name,
    artists: data.item.artists.map((artist: any) => artist.name).join(", "),
    album: data.item.album.name,
    albumCover: data.item.album.images[0]?.url,
  };

  win?.webContents.send('current-track', trackInfo);

  return data;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

let pollingStarted = false;

function startSpotifyPolling() {
  if (pollingStarted) return;
  pollingStarted = true;

  setInterval(async () => {
    try {
      if (!accessToken) return;

      await getCurrentlyPlaying(accessToken);
      } catch (err) {
        console.log("Polling error:", err);
      }
    }, 5000);
}