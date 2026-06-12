import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { useState } from 'react'

function App() {
  const [isPlaying, setIsPlaying] = useState(false)
  return (
    <div className="bg-gray-900 flex items-center justify-center rounded-4xl gap-4 w-fit px-8 py-2">
      <div className="size-12 bg-blue-800"></div>
      <div className="flex flex-col text-white w-40">
        <h1 className="text-xl font-bold">Starboy</h1>
        <h2 className="text-lg">Weeknd</h2>
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
export default App