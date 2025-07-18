import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

const AuthContext = createContext();

const authReducer = (state, action) => {
   switch (action.type) {
      case 'LOGIN_SUCCESS':
         return {
            ...state,
            user: action.payload.user,
            token: action.payload.token,
            isAuthenticated: true,
            loading: false
         };
      case 'LOGOUT':
         return {
            ...state,
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false
         };
      case 'SET_LOADING':
         return {
            ...state,
            loading: action.payload
         };
      default:
         return state;
   }
};

export const AuthProvider = ({ children }) => {
   const [state, dispatch] = useReducer(authReducer, {
      user: null,
      token: localStorage.getItem('token'),
      isAuthenticated: false,
      loading: true
   });

   useEffect(() => {
      const token = localStorage.getItem('token');
      if (token) {
         try {
            const decoded = jwtDecode(token);
            console.log('🔐 AuthContext - Token decodificado:', decoded);

            if (decoded.exp * 1000 > Date.now()) {
               // Criar objeto de usuário compatível
               const user = {
                  id: decoded.userId || decoded.id,
                  username: decoded.username
               };

               console.log('🔐 AuthContext - Usuário extraído do token:', user);

               dispatch({
                  type: 'LOGIN_SUCCESS',
                  payload: {
                     user,
                     token
                  }
               });
            } else {
               console.log('⚠️ AuthContext - Token expirado');
               localStorage.removeItem('token');
            }
         } catch (error) {
            console.error('❌ AuthContext - Erro ao decodificar token:', error);
            localStorage.removeItem('token');
         }
      }
      dispatch({ type: 'SET_LOADING', payload: false });
   }, []);

   const login = async (username, password) => {
      try {
         dispatch({ type: 'SET_LOADING', payload: true });
         console.log('Attempting login with:', { username, password: '***' });

         const response = await api.post('/api/auth/login', { username, password });
         console.log('Login response:', response.data);

         if (response.data.success) {
            const { token, user } = response.data.data;
            console.log('Login successful, token and user:', { token: token ? 'received' : 'missing', user });
            localStorage.setItem('token', token);

            dispatch({
               type: 'LOGIN_SUCCESS',
               payload: { user, token }
            });

            return true;
         }
         console.log('Login failed - response not successful');
         return false;
      } catch (error) {
         console.error('Login error:', error);
         console.error('Error response:', error.response?.data);
         return false;
      } finally {
         dispatch({ type: 'SET_LOADING', payload: false });
      }
   };

   const register = async (username, password) => {
      try {
         dispatch({ type: 'SET_LOADING', payload: true });
         console.log('Attempting register with:', { username, password: '***' });

         const response = await api.post('/api/auth/register', { username, password });
         console.log('Register response:', response.data);

         return response.data.success;
      } catch (error) {
         console.error('Register error:', error);
         console.error('Error response:', error.response?.data);
         return false;
      } finally {
         dispatch({ type: 'SET_LOADING', payload: false });
      }
   };

   const logout = () => {
      localStorage.removeItem('token');
      dispatch({ type: 'LOGOUT' });
   };

   return (
      <AuthContext.Provider value={{
         user: state.user,
         token: state.token,
         isAuthenticated: state.isAuthenticated,
         loading: state.loading,
         login,
         register,
         logout
      }}>
         {children}
      </AuthContext.Provider>
   );
};

export const useAuth = () => {
   const context = useContext(AuthContext);
   if (!context) {
      throw new Error('useAuth must be used within an AuthProvider');
   }
   return context;
};
