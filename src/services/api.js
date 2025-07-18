import axios from 'axios';

// Configuração base da API
const API_BASE_URL = 'http://localhost:3000';

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
      console.log('📤 Interceptor - Fazendo requisição para:', config.url);
      console.log('📤 Interceptor - Token encontrado:', token ? 'sim' : 'não');

      if (token) {
         config.headers.Authorization = `Bearer ${token}`;
         console.log('📤 Interceptor - Header Authorization adicionado');
      } else {
         console.log('⚠️ Interceptor - Nenhum token encontrado no localStorage');
      }
      return config;
   },
   (error) => {
      console.error('❌ Interceptor Request - Erro:', error);
      return Promise.reject(error);
   }
);

// Interceptor de response - Renovação automática de token
api.interceptors.response.use(
   (response) => {
      console.log('📥 Interceptor Response - Sucesso:', response.status, response.config.url);
      return response;
   },
   async (error) => {
      console.log('📥 Interceptor Response - Erro:', error.response?.status, error.config?.url);
      const originalRequest = error.config;

      // Se erro de token expirado e não é uma tentativa de refresh
      if ((error.response?.status === 401 || error.response?.status === 403) &&
         (error.response?.data?.code === 'INVALID_TOKEN' || error.response?.data?.code === 'NO_TOKEN') &&
         !originalRequest._retry) {

         console.log('🔄 Interceptor - Tentando renovar token automaticamente...');

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
               console.log('❌ Interceptor - Nenhum token para renovar');
               throw new Error('No token available');
            }

            console.log('🔄 Interceptor - Tentando renovar token...');
            // Tentar renovar o token
            const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
               token: oldToken
            });

            console.log('✅ Interceptor - Token renovado com sucesso');
            const { token: newToken, user } = refreshResponse.data.data;

            // Salvar novo token
            localStorage.setItem('token', newToken);

            // Se há informações do usuário, salvar também
            if (user) {
               localStorage.setItem('user', JSON.stringify(user));
            }

            // Processar fila de requisições pendentes
            processQueue(null, newToken);

            // Repetir requisição original com novo token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);

         } catch (refreshError) {
            console.error('❌ Interceptor - Erro ao renovar token:', refreshError);

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
      const response = await api.post('/api/auth/login', credentials);
      const { user, token } = response.data.data;

      // Salvar no localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return { user, token };
   },

   // Registro
   register: async (userData) => {
      const response = await api.post('/api/auth/register', userData);
      const { user, token } = response.data.data;

      // Salvar no localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return { user, token };
   },

   // Logout
   logout: async () => {
      try {
         await api.post('/api/auth/logout');
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
      const response = await api.get('/api/auth/me');
      return response.data.data.user;
   },

   // Renovar token manualmente
   refreshToken: async () => {
      const oldToken = localStorage.getItem('token');
      if (!oldToken) {
         throw new Error('No token to refresh');
      }

      const response = await api.post('/api/auth/refresh', { token: oldToken });
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
      const response = await api.get('/api/users');
      return response.data.data;
   },

   // Buscar salas/grupos
   getRooms: async () => {
      const response = await api.get('/api/rooms');
      return response.data.data;
   },

   // Upload de arquivo
   uploadFile: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/upload', formData, {
         headers: {
            'Content-Type': 'multipart/form-data',
         },
      });

      return response.data.file;
   },

   // Deletar arquivo
   deleteFile: async (filename) => {
      const response = await api.delete(`/api/upload/${filename}`);
      return response.data;
   },

   // ===== MENSAGENS =====

   // Teste da API de mensagens
   testMessages: async (retryCount = 0) => {
      const maxRetries = 3;
      try {
         console.log(`🧪 Testando API de mensagens... (tentativa ${retryCount + 1})`);
         const response = await api.get('/api/messages/test');
         console.log('✅ Teste da API bem-sucedido:', response.data);
         return response.data;
      } catch (error) {
         console.error(`❌ Erro no teste da API (tentativa ${retryCount + 1}):`, error);
         if (error.response) {
            console.error('❌ Status da resposta:', error.response.status);
            console.error('❌ Dados da resposta:', error.response.data);
         }

         // Retry logic para erros de rede ou servidor temporário
         if (retryCount < maxRetries && (error.code === 'ECONNREFUSED' || error.response?.status >= 500)) {
            console.log(`🔄 Tentando novamente em 2 segundos... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await chatService.testMessages(retryCount + 1);
         }

         throw error;
      }
   },

   // Carregar mensagens de conversa privada
   getPrivateMessages: async (username) => {
      try {
         console.log('🔍 Carregando mensagens privadas para:', username);
         const response = await api.get(`/api/messages/private/${username}`);
         console.log('📥 Resposta da API:', response.data);
         return response.data.data;
      } catch (error) {
         console.error('❌ Erro ao carregar mensagens privadas:', error);
         throw error;
      }
   },

   // Carregar mensagens de grupo
   getGroupMessages: async (roomId) => {
      try {
         console.log('🔍 Carregando mensagens do grupo:', roomId);
         const response = await api.get(`/api/messages/group/${roomId}`);
         console.log('📥 Resposta da API do grupo:', response.data);
         return response.data.data;
      } catch (error) {
         console.error('❌ Erro ao carregar mensagens do grupo:', error);
         throw error;
      }
   },

   // Carregar todas as conversas do usuário
   getConversations: async () => {
      try {
         console.log('🔍 Carregando conversas...');
         const response = await api.get('/api/messages/conversations');
         console.log('📥 Conversas carregadas:', response.data);
         return response.data.data;
      } catch (error) {
         console.error('❌ Erro ao carregar conversas:', error);
         throw error;
      }
   }
};

export default api;
