import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import Login from './pages/Login';
import Register from './pages/Register';
import { CollabLayout } from './components/collabdocs/layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes (no layout/navbar) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Authenticated routes wrapped in CollabLayout (has Navbar) */}
        <Route element={<CollabLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Editor has its own full-page layout (no top navbar) */}
        <Route path="/doc/:id" element={<EditorPage />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
