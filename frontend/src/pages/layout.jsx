import { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getLinkStyle = (path) => {
    // If the link is for My Datasets, keep it active even on the /dashboard/:id pages
    const isUploadPage = location.pathname === '/dashboard/upload';
    const isActive = path === '/dashboard' 
      ? location.pathname.startsWith('/dashboard') && !isUploadPage
      : location.pathname === path;

    return {
      color: isActive ? '#38bdf8' : '#94a3b8',
      textDecoration: 'none',
      fontWeight: 'bold',
      marginRight: '2rem',
      borderBottom: isActive ? '2px solid #38bdf8' : 'none',
      paddingBottom: '0.25rem',
      transition: 'all 0.2s ease'
    };
  };

  return (
    <>
      <nav style={{ padding: '1rem 2rem', backgroundColor: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc', marginRight: '3rem' }}>xVector</h1>
          <Link to="/dashboard" style={getLinkStyle('/dashboard')}>My Datasets</Link>
          <Link to="/dashboard/upload" style={getLinkStyle('/dashboard/upload')}>+ Upload File</Link>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Logout
        </button>
      </nav>

      {/* Outlet dynamically renders the current page here. textAlign 'left' overrides the Vite CSS bug */}
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', textAlign: 'left' }}>
        <Outlet /> 
      </main>
    </>
  );
}