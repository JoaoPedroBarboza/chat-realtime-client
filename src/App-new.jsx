import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import './App.css';

function App() {
   return (
      <AuthProvider>
         <Router>
            <div className="app">
               <Routes>
                  {/* Rota padrão redireciona para o chat */}
                  <Route path="/" element={<Navigate to="/chat" replace />} />

                  {/* Rotas de autenticação */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Rota protegida do chat */}
                  <Route
                     path="/chat"
                     element={
                        <ProtectedRoute>
                           <Chat />
                        </ProtectedRoute>
                     }
                  />

                  {/* Rota 404 */}
                  <Route path="*" element={<Navigate to="/chat" replace />} />
               </Routes>
            </div>
         </Router>
      </AuthProvider>
   );
}

export default App;
