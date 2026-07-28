import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { StreamSetup } from '@/pages/StreamSetup';
import { StreamLive } from '@/pages/StreamLive';
import { Categories } from '@/pages/Categories';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stream/new" element={<StreamSetup />} />
        <Route path="/stream/:id" element={<StreamLive />} />
        <Route path="/categories" element={<Categories />} />
      </Routes>
    </BrowserRouter>
  );
}
