import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const useSocket = () => {
   const [socket, setSocket] = useState(null);
   const [connectedUsers, setConnectedUsers] = useState([]);
   const [isConnected, setIsConnected] = useState(false);
   const { token, user } = useAuth();

   useEffect(() => {
      if (token && user) {
         console.log('🔌 Iniciando conexão Socket.IO...');
         console.log('🔑 Token disponível:', !!token);
         console.log('👤 Usuário:', user.username);

         const newSocket = io('http://localhost:3000', {
            auth: {
               token: token
            }
         });

         newSocket.on('connect', () => {
            console.log('✅ Socket conectado:', newSocket.id);
            setIsConnected(true);
         });

         newSocket.on('disconnect', () => {
            console.log('❌ Socket desconectado');
            setIsConnected(false);
         });

         newSocket.on('connect_error', (error) => {
            console.error('❌ Erro de conexão Socket.IO:', error);
         });

         newSocket.on('user_list', (users) => {
            console.log('Users list received:', users);
            console.log('Setting connected users to:', users);
            setConnectedUsers(users);
         });

         newSocket.on('user_joined', (userData) => {
            console.log('User joined:', userData);
            setConnectedUsers(prev => [...prev, userData]);
         });

         newSocket.on('user_left', (userData) => {
            console.log('User left:', userData);
            setConnectedUsers(prev => prev.filter(u => u.id !== userData.id));
         });

         setSocket(newSocket);

         return () => {
            newSocket.disconnect();
         };
      }
   }, [token, user]);

   return {
      socket,
      connectedUsers,
      isConnected,
      onlineUsers: connectedUsers,
      sendPrivateMessage: (to, message, fileData) => {
         if (socket) {
            socket.emit('send_private', { to, message, fileData });
         }
      },
      sendGroupMessage: (roomId, message, fileData) => {
         if (socket) {
            socket.emit('send_group', { roomId, message, fileData });
         }
      },
      createGroup: (groupName, members) => {
         if (socket) {
            socket.emit('create_group', { groupName, members });
         }
      },
      joinRoom: (roomId) => {
         if (socket) {
            socket.emit('join_room', roomId);
         }
      },
      leaveRoom: (roomId) => {
         if (socket) {
            socket.emit('leave_room', roomId);
         }
      },
      startTyping: (to, roomId) => {
         if (socket) {
            socket.emit('typing', { to, roomId });
         }
      },
      stopTyping: (to, roomId) => {
         if (socket) {
            socket.emit('stop_typing', { to, roomId });
         }
      },
      updateStatus: (status) => {
         if (socket) {
            socket.emit('update_status', { status });
         }
      },
      searchMessages: (query) => {
         if (socket) {
            socket.emit('search_messages', { query });
         }
      },
      addEventListener: (event, callback) => {
         if (socket) {
            socket.on(event, callback);
         }
      },
      removeEventListener: (event, callback) => {
         if (socket) {
            socket.off(event, callback);
         }
      }
   };
};

export default useSocket;
