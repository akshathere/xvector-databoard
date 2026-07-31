import { useState, useEffect,useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/client';

export default function DatasetList() {
  const [datasets, setDatasets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5; 
  const navigate = useNavigate();

  // 1. Cache the function with useCallback
  const fetchDatasets = useCallback(async (currentPage) => {
    try {
      const res = await api.get(`/dataset?page=${currentPage}&limit=${limit}`);
      setDatasets(res.data.data);
      setTotalPages(Math.ceil(res.data.total / limit) || 1);
    } catch (err) {
      toast.error('Failed to load datasets');
    }
  }, [limit]); // 'limit' goes in the dependency array

  // 2. Safely call it using an inner async function
  useEffect(() => {
    const loadData = async () => {
      await fetchDatasets(page);
    };
    loadData();
  }, [page, fetchDatasets]);

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this dataset?")) return;
    try {
      await api.delete(`/dataset/${id}`);
      toast.success('Deleted successfully');
      // Fetch the current page again to refresh the list
      fetchDatasets(page); 
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const cardStyle = { backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: '0 0 1rem 0' }}>Your Datasets</h2>
      {datasets.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No datasets uploaded yet.</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '0.75rem' }}>Name</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map(ds => (
                <tr key={ds.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem' }}>{ds.name}</td>
                  <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => navigate(`/dashboard/${ds.id}`)} style={{ padding: '0.25rem 0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Open</button>
                    <button onClick={() => handleDelete(ds.id)} style={{ padding: '0.25rem 0.75rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              style={{ padding: '0.5rem 1rem', backgroundColor: page === 1 ? '#334155' : '#38bdf8', color: 'white', border: 'none', borderRadius: '4px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span style={{ color: '#94a3b8' }}>Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              style={{ padding: '0.5rem 1rem', backgroundColor: page === totalPages ? '#334155' : '#38bdf8', color: 'white', border: 'none', borderRadius: '4px', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}