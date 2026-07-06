import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { StreamSetup } from '@/pages/StreamSetup';
import { StreamLive } from '@/pages/StreamLive';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stream/new" element={<StreamSetup />} />
        <Route path="/stream/:id" element={<StreamLive />} />
      </Routes>
    </BrowserRouter>
  );
}
