import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AuthScreen from './pages/AuthScreen';
import Layout from './pages/layout';
import DatasetList from './pages/DatasetList';
import UploadDataset from './pages/UploadDataset';
import ComputeView from './pages/ComputeView';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      <ToastContainer position="bottom-right" theme="dark" autoClose={3000} />
      
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<AuthScreen />} />
          
          {/* The true nested dashboard routing! */}
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DatasetList />} />                  {/* URL: /dashboard */}
            <Route path="upload" element={<UploadDataset />} />        {/* URL: /dashboard/upload */}
            <Route path=":id" element={<ComputeView />} />             {/* URL: /dashboard/123 */}
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}