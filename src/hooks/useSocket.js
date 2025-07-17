import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getStoredToken } from '../utils/auth';

const useSocket = () => {
   const { isAuthenticated, user } = useAuth();
   const socketRef = useRef(null);
   const [isConnected, setIsConnected] = useState(false);
   const [onlineUsers, setOnlineUsers] = useState([]);

   useEffect(() => {
      if (!isAuthenticated || !user) {
         // Se não está autenticado, desconectar socket
         if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
            setOnlineUsers([]);
         }
         return;
      }

      // Conectar socket com autenticação
      const connectSocket = () => {
         const token = getStoredToken();

         if (!token) {
            console.error('Sem token para conectar socket');
            return;
         }

         socketRef.current = io('http://localhost:3000', {
            auth: {
               token: token
            },
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
         });

         // Eventos de conexão
         socketRef.current.on('connect', () => {
            console.log('✅ Socket conectado:', socketRef.current.id);
            setIsConnected(true);
         });

         socketRef.current.on('disconnect', (reason) => {
            console.log('❌ Socket desconectado:', reason);
            setIsConnected(false);
         });

         socketRef.current.on('connect_error', (error) => {
            console.error('❌ Erro de conexão socket:', error.message);
            setIsConnected(false);

            // Se erro de autenticação, pode ser token expirado
            if (error.message.includes('Token')) {
               console.log('🔄 Erro de token no socket, tentando reconectar...');
            }
         });

         // Lista de usuários online
         socketRef.current.on('user_list', (users) => {
            setOnlineUsers(users);
         });

         // Eventos de erro
         socketRef.current.on('error', (error) => {
            console.error('❌ Erro no socket:', error);
         });
      };

      connectSocket();

      // Cleanup na desmontagem
      return () => {
         if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
            setOnlineUsers([]);
         }
      };
   }, [isAuthenticated, user]);

   // Reconectar socket quando token é renovado
   useEffect(() => {
      if (isAuthenticated && user && socketRef.current && !isConnected) {
         console.log('🔄 Reconectando socket após renovação de token...');

         // Desconectar e conectar novamente
         socketRef.current.disconnect();

         const token = getStoredToken();
         if (token) {
            socketRef.current.auth.token = token;
            socketRef.current.connect();
         }
      }
   }, [isAuthenticated, user, isConnected]);

   // Funções para enviar mensagens
   const sendPrivateMessage = (to, message, fileData = null) => {
      if (socketRef.current && isConnected) {
         socketRef.current.emit('send_private', { to, message, fileData });
      }
   };

   const sendGroupMessage = (roomId, message, fileData = null) => {
      if (socketRef.current && isConnected) {
         socketRef.current.emit('send_group', { roomId, message, fileData });
      }
   };

   const createGroup = (groupName, members) => {
      if (socketRef.current && isConnected) {
         socketRef.current.emit('create_group', { groupName, members });
      }
   };

   const joinRoom = (roomId) => {
      if (socketRef.current && isConnected) {
         socketRef.current.emit('join_room', roomId);
      }
   };

   const leaveRoom = (roomId) => {
      if (socketRef.current && isConnected) {
         socketRef.current.emit('leave_room', roomId);
      }
   };

   const startTyping = (to = null, roomId = null) => {
      if (socketRef.current && isConnected) {
         socketRef.current.emit('typing', { to, roomId });
      }
   };

   const stopTyping = (to = null, roomId = null) => {
      if (socketRef.current && isConnected) {
         socketRef.current.emit('stop_typing', { to, roomId });
      }
   };

   const updateStatus = (status) => {
      if (socketRef.current && isConnected) {
         socketRef.current.emit('update_status', { status });
      }
   };

   const searchMessages = (query) => {
      if (socketRef.current && isConnected) {
         socketRef.current.emit('search_messages', { query });
      }
   };

   // Função para adicionar listeners
   const addEventListener = (event, callback) => {
      if (socketRef.current) {
         socketRef.current.on(event, callback);
      }
   };

   // Função para remover listeners
   const removeEventListener = (event, callback) => {
      if (socketRef.current) {
         socketRef.current.off(event, callback);
      }
   };

   return {
      socket: socketRef.current,
      isConnected,
      onlineUsers,
      sendPrivateMessage,
      sendGroupMessage,
      createGroup,
      joinRoom,
      leaveRoom,
      startTyping,
      stopTyping,
      updateStatus,
      searchMessages,
      addEventListener,
      removeEventListener
   };
};

export default useSocket;
