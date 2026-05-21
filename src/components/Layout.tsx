import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('edu_token')) {
      navigate('/登录');
    }
  }, [navigate]);

  if (!localStorage.getItem('edu_token')) return null;

  return (
    <div className="flex min-h-screen bg-[var(--color-warm-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
