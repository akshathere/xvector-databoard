import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/client';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // If already logged in, redirect away from the login page
  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.access_token);
        toast.success('Successfully logged in!');
        
        // Push user to the separate dashboard page!
        navigate('/dashboard'); 
      } else {
        await api.post('/auth/register', { email, password });
        toast.success('Registration successful! Please log in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem', marginBottom: '1rem', 
    borderRadius: '4px', border: '1px solid #334155', 
    backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box'
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', backgroundColor: '#1e293b', padding: '2rem', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.2)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#f8fafc' }}>
        {isLogin ? 'Welcome Back' : 'Create an Account'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '1rem' }}>
          {isLogin ? 'Sign In' : 'Register'}
        </button>
      </form>

      <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span onClick={() => setIsLogin(!isLogin)} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}>
          {isLogin ? 'Register here' : 'Login here'}
        </span>
      </p>
    </div>
  );
}