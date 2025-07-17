import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
   const navigate = useNavigate();
   const { register, isLoading, error, clearError, isAuthenticated } = useAuth();

   const [formData, setFormData] = useState({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
   });

   const [showPassword, setShowPassword] = useState(false);
   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
   const [validationErrors, setValidationErrors] = useState({});

   // Se já está autenticado, redirecionar para o chat
   useEffect(() => {
      if (isAuthenticated && !isLoading) {
         navigate('/chat', { replace: true });
      }
   }, [isAuthenticated, isLoading, navigate]);

   // Limpar erro quando componente é montado
   useEffect(() => {
      clearError();
   }, [clearError]);

   const validateForm = () => {
      const errors = {};

      // Validar nome de usuário
      if (!formData.username.trim()) {
         errors.username = 'Nome de usuário é obrigatório';
      } else if (formData.username.length < 3) {
         errors.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
         errors.username = 'Nome de usuário deve conter apenas letras, números e underscore';
      }

      // Validar email
      if (!formData.email.trim()) {
         errors.email = 'Email é obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
         errors.email = 'Email inválido';
      }

      // Validar senha
      if (!formData.password) {
         errors.password = 'Senha é obrigatória';
      } else if (formData.password.length < 6) {
         errors.password = 'Senha deve ter pelo menos 6 caracteres';
      }

      // Validar confirmação de senha
      if (!formData.confirmPassword) {
         errors.confirmPassword = 'Confirmação de senha é obrigatória';
      } else if (formData.password !== formData.confirmPassword) {
         errors.confirmPassword = 'Senhas não coincidem';
      }

      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
   };

   const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
         ...prev,
         [name]: value
      }));

      // Limpar erros quando usuário começa a digitar
      if (error) {
         clearError();
      }
      if (validationErrors[name]) {
         setValidationErrors(prev => ({
            ...prev,
            [name]: ''
         }));
      }
   };

   const handleSubmit = async (e) => {
      e.preventDefault();

      if (!validateForm()) {
         return;
      }

      try {
         await register({
            username: formData.username.trim(),
            email: formData.email.trim(),
            password: formData.password
         });
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
               <h2>Criar nova conta</h2>
               <p>Junte-se à nossa comunidade e comece a conversar!</p>
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
                     placeholder="Escolha um nome de usuário"
                     required
                     autoComplete="username"
                     disabled={isLoading}
                     className={validationErrors.username ? 'error' : ''}
                  />
                  {validationErrors.username && (
                     <span className="field-error">{validationErrors.username}</span>
                  )}
               </div>

               <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                     type="email"
                     id="email"
                     name="email"
                     value={formData.email}
                     onChange={handleChange}
                     placeholder="Digite seu email"
                     required
                     autoComplete="email"
                     disabled={isLoading}
                     className={validationErrors.email ? 'error' : ''}
                  />
                  {validationErrors.email && (
                     <span className="field-error">{validationErrors.email}</span>
                  )}
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
                        placeholder="Crie uma senha segura"
                        required
                        autoComplete="new-password"
                        disabled={isLoading}
                        className={validationErrors.password ? 'error' : ''}
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
                  {validationErrors.password && (
                     <span className="field-error">{validationErrors.password}</span>
                  )}
               </div>

               <div className="form-group">
                  <label htmlFor="confirmPassword">Confirmar senha</label>
                  <div className="password-input">
                     <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirme sua senha"
                        required
                        autoComplete="new-password"
                        disabled={isLoading}
                        className={validationErrors.confirmPassword ? 'error' : ''}
                     />
                     <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                     >
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                     </button>
                  </div>
                  {validationErrors.confirmPassword && (
                     <span className="field-error">{validationErrors.confirmPassword}</span>
                  )}
               </div>

               <button
                  type="submit"
                  className="auth-button"
                  disabled={isLoading}
               >
                  {isLoading ? (
                     <>
                        <span className="loading-spinner-small"></span>
                        Criando conta...
                     </>
                  ) : (
                     'Criar conta'
                  )}
               </button>
            </form>

            <div className="auth-footer">
               <p>
                  Já tem uma conta?{' '}
                  <button
                     type="button"
                     className="auth-link-btn"
                     onClick={() => navigate('/login')}
                  >
                     Fazer login
                  </button>
               </p>
            </div>
         </div>
      </div>
   );
};

export default Register;
