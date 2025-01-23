import { Routes, Route } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react"
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Explore from './pages/Explore';

function App() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Analytics/>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
      </Routes>
    </div>
  );
}

export default App;
