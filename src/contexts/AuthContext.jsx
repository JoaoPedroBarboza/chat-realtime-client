import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/api';
import {
   getStoredToken,
   getStoredUser,
   isTokenExpired,
   willExpireSoon,
   clearAuthData
} from '../utils/auth';

// Estados da autenticação
const AuthContext = createContext();

// Ações do reducer
const AUTH_ACTIONS = {
   LOGIN_START: 'LOGIN_START',
   LOGIN_SUCCESS: 'LOGIN_SUCCESS',
   LOGIN_ERROR: 'LOGIN_ERROR',
   LOGOUT: 'LOGOUT',
   REFRESH_TOKEN: 'REFRESH_TOKEN',
   SET_LOADING: 'SET_LOADING',
   CLEAR_ERROR: 'CLEAR_ERROR'
};

// Estado inicial
const initialState = {
   user: null,
   token: null,
   isAuthenticated: false,
   isLoading: true,
   error: null
};

// Reducer
const authReducer = (state, action) => {
   switch (action.type) {
      case AUTH_ACTIONS.LOGIN_START:
         return {
            ...state,
            isLoading: true,
            error: null
         };

      case AUTH_ACTIONS.LOGIN_SUCCESS:
         return {
            ...state,
            user: action.payload.user,
            token: action.payload.token,
            isAuthenticated: true,
            isLoading: false,
            error: null
         };

      case AUTH_ACTIONS.LOGIN_ERROR:
         return {
            ...state,
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: action.payload
         };

      case AUTH_ACTIONS.LOGOUT:
         return {
            ...state,
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
         };

      case AUTH_ACTIONS.REFRESH_TOKEN:
         return {
            ...state,
            token: action.payload.token,
            user: action.payload.user
         };

      case AUTH_ACTIONS.SET_LOADING:
         return {
            ...state,
            isLoading: action.payload
         };

      case AUTH_ACTIONS.CLEAR_ERROR:
         return {
            ...state,
            error: null
         };

      default:
         return state;
   }
};

// Provider do contexto
export const AuthProvider = ({ children }) => {
   const [state, dispatch] = useReducer(authReducer, initialState);

   // Verificar token automaticamente na inicialização
   useEffect(() => {
      const initializeAuth = async () => {
         try {
            const token = getStoredToken();
            const user = getStoredUser();

            if (token && user && !isTokenExpired(token)) {
               // Token válido - autenticar usuário
               dispatch({
                  type: AUTH_ACTIONS.LOGIN_SUCCESS,
                  payload: { user, token }
               });
            } else if (token) {
               // Token inválido - tentar renovar
               try {
                  const refreshData = await authService.refreshToken();
                  dispatch({
                     type: AUTH_ACTIONS.LOGIN_SUCCESS,
                     payload: refreshData
                  });
               } catch (error) {
                  // Falha na renovação - limpar dados
                  console.error('Falha ao renovar token na inicialização:', error);
                  clearAuthData();
                  dispatch({ type: AUTH_ACTIONS.LOGOUT });
               }
            } else {
               // Sem token - não autenticado
               dispatch({ type: AUTH_ACTIONS.LOGOUT });
            }
         } catch (error) {
            console.error('Erro na inicialização da autenticação:', error);
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
         } finally {
            dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
         }
      };

      initializeAuth();
   }, []);

   // Verificação periódica e renovação automática
   useEffect(() => {
      if (!state.isAuthenticated || !state.token) return;

      const checkAndRefreshToken = async () => {
         try {
            const token = getStoredToken();

            if (!token) {
               dispatch({ type: AUTH_ACTIONS.LOGOUT });
               return;
            }

            // Se token expira em menos de 5 minutos, renovar
            if (willExpireSoon(token, 300)) {
               console.log('🔄 Renovando token automaticamente...');
               const refreshData = await authService.refreshToken();

               dispatch({
                  type: AUTH_ACTIONS.REFRESH_TOKEN,
                  payload: refreshData
               });

               console.log('✅ Token renovado com sucesso');
            }
         } catch (error) {
            console.error('❌ Erro na renovação automática:', error);
            // Em caso de erro, fazer logout
            await logout();
         }
      };

      // Verificar a cada 2 minutos
      const interval = setInterval(checkAndRefreshToken, 2 * 60 * 1000);

      // Verificar também na primeira execução após 1 minuto
      const timeout = setTimeout(checkAndRefreshToken, 60 * 1000);

      return () => {
         clearInterval(interval);
         clearTimeout(timeout);
      };
   }, [state.isAuthenticated, state.token]);

   // Função de login
   const login = async (credentials) => {
      try {
         dispatch({ type: AUTH_ACTIONS.LOGIN_START });

         const data = await authService.login(credentials);

         dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: data
         });

         return data;
      } catch (error) {
         const errorMessage = error.response?.data?.error || 'Erro no login';
         dispatch({
            type: AUTH_ACTIONS.LOGIN_ERROR,
            payload: errorMessage
         });
         throw error;
      }
   };

   // Função de registro
   const register = async (userData) => {
      try {
         dispatch({ type: AUTH_ACTIONS.LOGIN_START });

         const data = await authService.register(userData);

         dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: data
         });

         return data;
      } catch (error) {
         const errorMessage = error.response?.data?.error || 'Erro no registro';
         dispatch({
            type: AUTH_ACTIONS.LOGIN_ERROR,
            payload: errorMessage
         });
         throw error;
      }
   };

   // Função de logout
   const logout = async () => {
      try {
         await authService.logout();
      } catch (error) {
         console.error('Erro no logout:', error);
      } finally {
         clearAuthData();
         dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
   };

   // Limpar erro
   const clearError = () => {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
   };

   // Renovar token manualmente
   const refreshToken = async () => {
      try {
         const data = await authService.refreshToken();
         dispatch({
            type: AUTH_ACTIONS.REFRESH_TOKEN,
            payload: data
         });
         return data;
      } catch (error) {
         console.error('Erro ao renovar token:', error);
         await logout();
         throw error;
      }
   };

   const value = {
      ...state,
      login,
      register,
      logout,
      clearError,
      refreshToken
   };

   return (
      <AuthContext.Provider value={value}>
         {children}
      </AuthContext.Provider>
   );
};

// Hook para usar o contexto
export const useAuth = () => {
   const context = useContext(AuthContext);
   if (!context) {
      throw new Error('useAuth deve ser usado dentro de AuthProvider');
   }
   return context;
};
