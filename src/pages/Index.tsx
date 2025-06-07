
import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redirect the index page to the dashboard
  return <Navigate to="/dashboard" replace />;
};

export default Index;
