import { useEffect, useState } from 'react'
import Widget from './Widget.tsx'
import Login from './Login.tsx'

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        window.ipcRenderer.on('auth-status', (_, data) => {
            console.log("Received auth status:", data);
            setIsLoggedIn(data.isLoggedIn)
            setLoading(false)
        })
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h1 className="text-3xl font-bold">Loading...</h1>
            </div>
        )
    }

    return isLoggedIn ? <Widget /> : <Login />
}

export default App