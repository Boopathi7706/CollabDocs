import React from 'react';
import { useNavigate, Outlet } from 'react-router-dom';

export const Layout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans transition-colors duration-200">
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                  C
                </div>
                <span className="font-bold text-xl text-gray-900 tracking-tight">CollabDocs</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Future feature placeholders like profiles avatars could go here */}
              <button 
                onClick={handleLogout}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Sign out
              </button>
            </div>
            
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
