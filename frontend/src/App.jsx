import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { SnakeCVPage } from './pages/SnakeCVPage'
import { SlitherPage } from './pages/SlitherPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/games/snake" element={<SnakeCVPage />} />
        <Route path="/games/slither" element={<SlitherPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
