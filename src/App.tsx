function App() {
  return (
    <div className="bg-gray-900 flex items-center justify-center rounded-4xl gap-4 w-fit px-8 py-2">
      <div className="size-12 bg-blue-800"></div>
      <div className="flex flex-col text-white w-40">
        <h1 className="text-xl font-bold">Starboy</h1>
        <h2 className="text-lg">Weeknd</h2>
      </div>
      <div className="flex items-center gap-2">
        <button className="bg-gray-700 text-white px-4 py-2 rounded">Prev</button>
        <button className="bg-gray-700 text-white px-4 py-2 rounded">Pause</button>
        <button className="bg-gray-700 text-white px-4 py-2 rounded">Next</button>
      </div>
    </div>
  )
}
export default App