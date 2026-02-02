import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Launches } from './pages/Launches';
import { Staking } from './pages/Staking';
import { LaunchDetail } from './pages/LaunchDetail';

function App() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/launches" element={<Launches />} />
          <Route path="/launch/:id" element={<LaunchDetail />} />
          <Route path="/staking" element={<Staking />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
