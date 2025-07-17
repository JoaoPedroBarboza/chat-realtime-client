import axios from 'axios';

// Configuração base da API
const API_BASE_URL = 'http://localhost:3000/api';

// Instância do axios
const api = axios.create({
   baseURL: API_BASE_URL,
   timeout: 10000,
   headers: {
      'Content-Type': 'application/json',
   },
});

// Flag para evitar múltiplas tentativas de refresh simultâneas
let isRefreshing = false;
let failedQueue = [];

// Processar fila de requisições após refresh
const processQueue = (error, token = null) => {
   failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
         reject(error);
      } else {
         resolve(token);
      }
   });

   failedQueue = [];
};

// Interceptor de request - Adiciona token automaticamente
api.interceptors.request.use(
   (config) => {
      const token = localStorage.getItem('token');
      if (token) {
         config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
   },
   (error) => {
      return Promise.reject(error);
   }
);

// Interceptor de response - Renovação automática de token
api.interceptors.response.use(
   (response) => {
      return response;
   },
   async (error) => {
      const originalRequest = error.config;

      // Se erro de token expirado e não é uma tentativa de refresh
      if (error.response?.status === 403 &&
         error.response?.data?.code === 'INVALID_TOKEN' &&
         !originalRequest._retry) {

         if (isRefreshing) {
            // Se já está fazendo refresh, adiciona à fila
            return new Promise((resolve, reject) => {
               failedQueue.push({ resolve, reject });
            }).then(token => {
               originalRequest.headers.Authorization = `Bearer ${token}`;
               return api(originalRequest);
            }).catch(err => {
               return Promise.reject(err);
            });
         }

         originalRequest._retry = true;
         isRefreshing = true;

         try {
            const oldToken = localStorage.getItem('token');
            if (!oldToken) {
               throw new Error('No token available');
            }

            // Tentar renovar o token
            const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
               token: oldToken
            });

            const { token: newToken } = refreshResponse.data.data;

            // Salvar novo token
            localStorage.setItem('token', newToken);

            // Processar fila de requisições pendentes
            processQueue(null, newToken);

            // Repetir requisição original com novo token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);

         } catch (refreshError) {
            console.error('Erro ao renovar token:', refreshError);

            // Token não pode ser renovado - fazer logout
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            processQueue(refreshError, null);

            // Redirecionar para login
            window.location.href = '/login';

            return Promise.reject(refreshError);
         } finally {
            isRefreshing = false;
         }
      }

      return Promise.reject(error);
   }
);

// Serviços de autenticação
export const authService = {
   // Login
   login: async (credentials) => {
      const response = await api.post('/auth/login', credentials);
      const { user, token } = response.data.data;

      // Salvar no localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return { user, token };
   },

   // Registro
   register: async (userData) => {
      const response = await api.post('/auth/register', userData);
      const { user, token } = response.data.data;

      // Salvar no localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return { user, token };
   },

   // Logout
   logout: async () => {
      try {
         await api.post('/auth/logout');
      } catch (error) {
         console.error('Erro no logout:', error);
      } finally {
         // Limpar dados locais independente do resultado
         localStorage.removeItem('token');
         localStorage.removeItem('user');
      }
   },

   // Verificar usuário atual
   getCurrentUser: async () => {
      const response = await api.get('/auth/me');
      return response.data.data.user;
   },

   // Renovar token manualmente
   refreshToken: async () => {
      const oldToken = localStorage.getItem('token');
      if (!oldToken) {
         throw new Error('No token to refresh');
      }

      const response = await api.post('/auth/refresh', { token: oldToken });
      const { user, token } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return { user, token };
   }
};

// Serviços do chat
export const chatService = {
   // Buscar usuários
   getUsers: async () => {
      const response = await api.get('/users');
      return response.data.data;
   },

   // Buscar salas/grupos
   getRooms: async () => {
      const response = await api.get('/rooms');
      return response.data.data;
   },

   // Upload de arquivo
   uploadFile: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload', formData, {
         headers: {
            'Content-Type': 'multipart/form-data',
         },
      });

      return response.data.file;
   },

   // Deletar arquivo
   deleteFile: async (filename) => {
      const response = await api.delete(`/upload/${filename}`);
      return response.data;
   }
};

export default api;
