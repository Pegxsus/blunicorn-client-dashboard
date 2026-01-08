import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';

const Index = () => {
  const { user } = useAuth();

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise show the login page
  return <Login />;
};

export default Index;
