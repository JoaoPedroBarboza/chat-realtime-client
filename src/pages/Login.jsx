import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
   const navigate = useNavigate();
   const location = useLocation();
   const { login, isLoading, error, clearError, isAuthenticated } = useAuth();

   const [formData, setFormData] = useState({
      username: '',
      password: ''
   });

   const [showPassword, setShowPassword] = useState(false);

   // Se já está autenticado, redirecionar para o chat
   useEffect(() => {
      if (isAuthenticated && !isLoading) {
         const from = location.state?.from?.pathname || '/chat';
         navigate(from, { replace: true });
      }
   }, [isAuthenticated, isLoading, navigate, location]);

   // Limpar erro quando componente é montado
   useEffect(() => {
      clearError();
   }, [clearError]);

   const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
         ...prev,
         [name]: value
      }));

      // Limpar erro quando usuário começa a digitar
      if (error) {
         clearError();
      }
   };

   const handleSubmit = async (e) => {
      e.preventDefault();

      if (!formData.username.trim() || !formData.password.trim()) {
         return;
      }

      try {
         await login(formData);
         // Navegação será feita automaticamente pelo useEffect
      } catch (err) {
         // Erro já é tratado no contexto
      }
   };

   return (
      <div className="auth-container">
         <div className="auth-card">
            <div className="auth-header">
               <h1>Chat RealTime</h1>
               <h2>Entrar na sua conta</h2>
               <p>Bem-vindo de volta! Faça login para continuar conversando.</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
               {error && (
                  <div className="error-message">
                     <span className="error-icon">⚠️</span>
                     {error}
                  </div>
               )}

               <div className="form-group">
                  <label htmlFor="username">Nome de usuário</label>
                  <input
                     type="text"
                     id="username"
                     name="username"
                     value={formData.username}
                     onChange={handleChange}
                     placeholder="Digite seu nome de usuário"
                     required
                     autoComplete="username"
                     disabled={isLoading}
                  />
               </div>

               <div className="form-group">
                  <label htmlFor="password">Senha</label>
                  <div className="password-input">
                     <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Digite sua senha"
                        required
                        autoComplete="current-password"
                        disabled={isLoading}
                     />
                     <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                     >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                     </button>
                  </div>
               </div>

               <button
                  type="submit"
                  className="auth-button"
                  disabled={isLoading || !formData.username.trim() || !formData.password.trim()}
               >
                  {isLoading ? (
                     <>
                        <span className="loading-spinner-small"></span>
                        Entrando...
                     </>
                  ) : (
                     'Entrar'
                  )}
               </button>
            </form>

            <div className="auth-footer">
               <p>
                  Não tem uma conta?{' '}
                  <button
                     type="button"
                     className="auth-link-btn"
                     onClick={() => navigate('/register')}
                  >
                     Criar conta
                  </button>
               </p>
            </div>
         </div>
      </div>
   );
};

export default Login;
