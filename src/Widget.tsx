import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useState } from 'react'

function Widget() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState({
    name: 'No song',
    artists: 'No artist',
    album: 'No album',
    albumCover: 'No album art',
  })

  useEffect(() => {
    const handler = (_: any, trackInfo: any) => {
      console.log("Received current track info:", trackInfo);
      setCurrentTrack(trackInfo);
    };

    window.ipcRenderer.on('current-track', handler);

    return () => {
      window.ipcRenderer.off('current-track', handler);
    };
  }, []);
  const isIdle = currentTrack.name === 'No song';

  if (isIdle) {
    return (
      <div className="bg-gray-900 flex items-center justify-center rounded-4xl gap-4 w-fit px-8 py-2">
        <h1>No song playing</h1>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 flex items-center justify-center rounded-4xl gap-4 w-fit px-8 py-2">
      <div className="size-12">
        <img src={currentTrack.albumCover} alt="Album Cover" className="rounded" />
      </div>
      <div className="flex flex-col text-white w-40">
        <h1 className="text-xl font-bold">{currentTrack.name}</h1>
        <h2 className="text-lg">{currentTrack.artists}</h2>
      </div>
      <div className="flex items-center gap-2 text-white">
        <SkipBack />
        <Play onClick={() => setIsPlaying(!isPlaying)} className={isPlaying ? 'hidden' : ''} />
        <Pause onClick={() => setIsPlaying(!isPlaying)} className={isPlaying ? '' : 'hidden'}/>
        <SkipForward />
      </div>
    </div>
  )
}
export default Widget