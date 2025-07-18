import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
   const { isAuthenticated, loading } = useAuth();
   const location = useLocation();

   // Mostra loading enquanto verifica autenticação
   if (loading) {
      return (
         <div className="loading-screen">
            <div className="loading-spinner">
               <div className="spinner"></div>
               <p>Verificando autenticação...</p>
            </div>
         </div>
      );
   }

   // Se não está autenticado, redireciona para login
   if (!isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
   }

   // Se está autenticado, renderiza o componente
   return children;
};

export default ProtectedRoute;
