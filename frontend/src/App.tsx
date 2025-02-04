import { Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Restaurant from './pages/Restaurant';
import Profile from './pages/Profile';
import Settings from './pages/Settings';


function App() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Analytics />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/restaurant/:id" element={<Restaurant />} />
      </Routes>
    </div>
  );
}

export default App;
