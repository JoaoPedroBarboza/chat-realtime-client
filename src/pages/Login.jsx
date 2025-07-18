import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
   const [formData, setFormData] = useState({
      username: '',
      password: ''
   });
   const [showPassword, setShowPassword] = useState(false);
   const [error, setError] = useState('');
   const [loading, setLoading] = useState(false);

   const { login, isAuthenticated } = useAuth();
   const navigate = useNavigate();

   useEffect(() => {
      if (isAuthenticated) {
         navigate('/chat', { replace: true });
      }
   }, [isAuthenticated, navigate]);

   const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      if (!formData.username.trim() || !formData.password.trim()) {
         setError('Por favor, preencha todos os campos');
         setLoading(false);
         return;
      }

      try {
         console.log('Tentando fazer login:', formData.username);
         const success = await login(formData.username, formData.password);
         if (success) {
            console.log('Login bem-sucedido, redirecionando...');
            navigate('/chat', { replace: true });
         } else {
            setError('Nome de usuário ou senha incorretos');
         }
      } catch (err) {
         console.error('Erro no login:', err);
         setError('Erro ao fazer login. Tente novamente.');
      } finally {
         setLoading(false);
      }
   }; const handleChange = (e) => {
      setFormData({
         ...formData,
         [e.target.name]: e.target.value
      });
   };

   return (
      <div className="auth-container">
         <div className="auth-card">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
               <div className="form-group">
                  <input
                     type="text"
                     name="username"
                     placeholder="Nome de usuário"
                     value={formData.username}
                     onChange={handleChange}
                     required
                  />
               </div>

               <div className="form-group">
                  <div className="password-input">
                     <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        placeholder="Senha"
                        value={formData.password}
                        onChange={handleChange}
                        required
                     />
                     <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                     >
                        {showPassword ? '👁️' : '🙈'}
                     </button>
                  </div>
               </div>

               {error && <div className="error-message">{error}</div>}

               <button type="submit" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
               </button>
            </form>

            <p className="auth-link">
               Não tem uma conta? <Link to="/register">Cadastre-se</Link>
            </p>
         </div>
      </div>
   );
};

export default Login;
