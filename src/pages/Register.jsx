import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
   const [formData, setFormData] = useState({
      username: '',
      password: '',
      confirmPassword: ''
   });
   const [showPassword, setShowPassword] = useState(false);
   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
   const [error, setError] = useState('');
   const [success, setSuccess] = useState('');
   const [loading, setLoading] = useState(false);
   // Estado inicial otimista - assumir conectado já que o login funciona
   const [apiStatus, setApiStatus] = useState('connected');

   const { register } = useAuth();
   const navigate = useNavigate();

   // Testar conectividade com a API ao carregar a página
   useEffect(() => {
      const testApiConnection = async () => {
         try {
            console.log('Verificando conexão com a API...');

            // Teste rápido - se der qualquer resposta, o servidor está funcionando
            await fetch('http://localhost:3000/api/auth/login', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ username: 'test', password: 'test' })
            });

            // Se chegou aqui sem erro, a conexão está ok
            console.log('API connection verified - server is responding');

         } catch (error) {
            // Só marcar como desconectado se for erro de rede real
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
               console.error('Network error - server appears to be down:', error);
               setApiStatus('disconnected');
               setError('Servidor não está acessível. Verifique se o backend está rodando.');
            } else {
               console.log('Server is responding (error is expected for invalid credentials)');
            }
         }
      };

      testApiConnection();
   }, []); const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setSuccess('');
      setLoading(true);

      if (formData.password !== formData.confirmPassword) {
         setError('As senhas não coincidem');
         setLoading(false);
         return;
      }

      if (formData.password.length < 3) {
         setError('A senha deve ter pelo menos 3 caracteres');
         setLoading(false);
         return;
      }

      try {
         console.log('Tentando registrar usuário:', formData.username);
         const success = await register(formData.username, formData.password);
         if (success) {
            setSuccess('Cadastro realizado com sucesso! Redirecionando para o login...');
            setTimeout(() => {
               navigate('/login');
            }, 2000);
         } else {
            setError('Erro ao criar conta. Verifique se o nome de usuário não está em uso.');
         }
      } catch (err) {
         console.error('Erro no cadastro:', err);
         setError('Erro ao criar conta. Tente novamente.');
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
            <h2>Cadastro</h2>

            {/* Status da API */}
            <div className={`api-status ${apiStatus}`}>
               {apiStatus === 'checking' && '🔄 Verificando conexão...'}
               {apiStatus === 'connected' && '✅ Servidor conectado'}
               {apiStatus === 'disconnected' && '❌ Servidor desconectado'}
            </div>

            <form onSubmit={handleSubmit}>
               <div className="form-group">
                  <input
                     type="text"
                     name="username"
                     placeholder="Nome de usuário"
                     value={formData.username}
                     onChange={handleChange}
                     required
                     disabled={apiStatus === 'disconnected'}
                  />
               </div>               <div className="form-group">
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

               <div className="form-group">
                  <div className="password-input">
                     <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        placeholder="Confirmar senha"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                     />
                     <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                     >
                        {showConfirmPassword ? '👁️' : '🙈'}
                     </button>
                  </div>
               </div>

               {error && <div className="error-message">{error}</div>}
               {success && <div className="success-message">{success}</div>}

               <button type="submit" disabled={loading}>
                  {loading ? 'Criando conta...' : 'Criar conta'}
               </button>
            </form>

            <p className="auth-link">
               Já tem uma conta? <Link to="/login">Faça login</Link>
            </p>
         </div>
      </div>
   );
};

export default Register;
