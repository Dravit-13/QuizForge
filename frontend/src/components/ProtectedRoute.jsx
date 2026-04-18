import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuth } = useAuth();
  const location = useLocation();
  return isAuth
    ? children
    : <Navigate to="/login" state={{ from: location }} replace />;
}
