function App() {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = 'http://127.0.0.1:8888/callback';

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user-read-playback-state%20user-modify-playback-state%20user-read-currently-playing`;

    return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <h1 className="text-3xl font-bold">Spotify Widget App</h1>
            <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-4xl cursor-pointer" 
                onClick={() => {
                    console.log("Button clicked");

                    window.ipcRenderer.send('spotify-login', authUrl);

                }}>
                Connect to Spotify
            </button>
        </div>
    )
}

export default App