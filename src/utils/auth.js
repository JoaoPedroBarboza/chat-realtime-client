// Utilitários para manipulação de tokens JWT

/**
 * Decodifica um token JWT e retorna o payload
 */
export const decodeToken = (token) => {
   try {
      if (!token) return null;

      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
         atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
      );

      return JSON.parse(jsonPayload);
   } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return null;
   }
};

/**
 * Verifica se o token está expirado
 */
export const isTokenExpired = (token) => {
   const decoded = decodeToken(token);
   if (!decoded || !decoded.exp) return true;

   const now = Date.now() / 1000;
   return decoded.exp < now;
};

/**
 * Retorna o tempo restante até expiração em segundos
 */
export const getTimeUntilExpiration = (token) => {
   const decoded = decodeToken(token);
   if (!decoded || !decoded.exp) return 0;

   const now = Date.now() / 1000;
   return Math.max(0, decoded.exp - now);
};

/**
 * Verifica se o token expira em menos de X segundos
 */
export const willExpireSoon = (token, seconds = 300) => { // 5 minutos por padrão
   const timeLeft = getTimeUntilExpiration(token);
   return timeLeft <= seconds && timeLeft > 0;
};

/**
 * Obtém informações do usuário do token
 */
export const getUserFromToken = (token) => {
   const decoded = decodeToken(token);
   return decoded ? { userId: decoded.userId } : null;
};

/**
 * Formata tempo restante em formato legível
 */
export const formatTimeLeft = (seconds) => {
   if (seconds <= 0) return 'Expirado';

   const days = Math.floor(seconds / 86400);
   const hours = Math.floor((seconds % 86400) / 3600);
   const minutes = Math.floor((seconds % 3600) / 60);

   if (days > 0) return `${days}d ${hours}h`;
   if (hours > 0) return `${hours}h ${minutes}m`;
   return `${minutes}m`;
};

/**
 * Obtém token do localStorage
 */
export const getStoredToken = () => {
   return localStorage.getItem('token');
};

/**
 * Obtém usuário do localStorage
 */
export const getStoredUser = () => {
   const userStr = localStorage.getItem('user');
   try {
      return userStr ? JSON.parse(userStr) : null;
   } catch (error) {
      console.error('Erro ao parsear usuário:', error);
      return null;
   }
};

/**
 * Remove dados de autenticação do localStorage
 */
export const clearAuthData = () => {
   localStorage.removeItem('token');
   localStorage.removeItem('user');
};

/**
 * Verifica se usuário está autenticado
 */
export const isAuthenticated = () => {
   const token = getStoredToken();
   return token && !isTokenExpired(token);
};
