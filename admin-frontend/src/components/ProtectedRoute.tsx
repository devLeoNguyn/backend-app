import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const isAuthenticated = authService.isAuthenticated();
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    return <>{children}</>;
};

export default ProtectedRoute; 