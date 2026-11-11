import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/client';

export default function UploadDataset() {
  const [file, setFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !uploadName) return toast.warning('Provide a name and file.');
    
    const formData = new FormData();
    formData.append('name', uploadName);
    formData.append('file', file);

    setUploading(true);
    try {
      // Server responds only after the file is saved, so success here means the dataset is ready
      const res = await api.post('/dataset', formData);
      toast.success(res.data.detail || 'Upload completed!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const cardStyle = { backgroundColor: '#1e293b', padding: '2rem', borderRadius: '8px', maxWidth: '500px' };
  const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', marginBottom: '1rem', boxSizing: 'border-box' };

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: '0 0 1.5rem 0' }}>Upload New Dataset</h2>
      <form onSubmit={handleUpload}>
        <input type="text" disabled={uploading} placeholder="Dataset Name" value={uploadName} onChange={e => setUploadName(e.target.value)} style={inputStyle} autoComplete="off" data-bwignore="true" />
        <input type="file" disabled={uploading} accept=".csv" onChange={e => setFile(e.target.files[0])} style={{ color: '#94a3b8', marginBottom: '1.5rem', display: 'block' }} />
        <button type="submit" disabled={uploading} style={{ width: '100%', padding: '0.75rem', backgroundColor: uploading ? '#64748b' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
          {uploading ? 'Uploading…' : 'Upload Dataset'}
        </button>
      </form>
    </div>
  );
}