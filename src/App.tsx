import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import HeroCarousel from './components/HeroCarousel';
import CharacterStudio from './pages/CharacterStudio';
import Login from './pages/Login';
import Admin from './pages/Admin';

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HeroCarousel />} />
          <Route path="/login" element={<Login />} />
          <Route path="/character-studio" element={<CharacterStudio />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
