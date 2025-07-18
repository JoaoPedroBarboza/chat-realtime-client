import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';
import { chatService } from '../services/api';
import { getTimeUntilExpiration, formatTimeLeft, getStoredToken } from '../utils/auth';
import '../App.css';

const Chat = () => {
   const { user, logout } = useAuth();
   const {
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
   } = useSocket();

   // Debug dos usuários online
   useEffect(() => {
      console.log('Online users changed:', onlineUsers);
   }, [onlineUsers]);

   // Estados do chat
   const [selectedUser, setSelectedUser] = useState(null);
   const [selectedRoom, setSelectedRoom] = useState(null);
   const [messages, setMessages] = useState({});
   const [roomMessages, setRoomMessages] = useState({});
   const [unreadMessages, setUnreadMessages] = useState({}); // Novo estado para mensagens não lidas
   const [unreadRoomMessages, setUnreadRoomMessages] = useState({}); // Para grupos
   const [message, setMessage] = useState('');
   const [typingStatus, setTypingStatus] = useState('');
   const [typingTimer, setTypingTimer] = useState(null);
   const [sendingMessage, setSendingMessage] = useState(false);
   const [darkMode, setDarkMode] = useState(() => {
      // Inicializar o tema de forma mais segura
      try {
         const savedTheme = localStorage.getItem('darkMode');
         return savedTheme ? JSON.parse(savedTheme) : false; // Default para tema claro
      } catch (error) {
         console.error('Erro ao carregar tema:', error);
         return false; // Default para tema claro
      }
   });
   const [showGroupForm, setShowGroupForm] = useState(false);
   const [groupName, setGroupName] = useState('');
   const [groupMembers, setGroupMembers] = useState('');
   const [groups, setGroups] = useState([]);
   const [activeTab, setActiveTab] = useState('users');
   const [searchQuery, setSearchQuery] = useState('');
   const [searchResults, setSearchResults] = useState([]);
   const [userStatus, setUserStatus] = useState('available');
   const [notifications, setNotifications] = useState([]);
   const [showEmojiPicker, setShowEmojiPicker] = useState(false);

   // Aplicar tema ao documento
   useEffect(() => {
      try {
         console.log('Aplicando tema:', darkMode ? 'dark' : 'light');
         document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');

         // Salvar preferência do tema
         localStorage.setItem('darkMode', JSON.stringify(darkMode));

         // Verificar se o tema foi aplicado corretamente
         const appliedTheme = document.documentElement.getAttribute('data-theme');
         console.log('Tema aplicado:', appliedTheme);

         // Garantir que o body tenha o fundo correto
         document.body.style.backgroundColor = darkMode ? '#1a1a1a' : '#ffffff';
         document.body.style.color = darkMode ? '#ffffff' : '#000000';

      } catch (error) {
         console.error('Erro ao aplicar tema:', error);
      }
   }, [darkMode]);

   const [uploadProgress, setUploadProgress] = useState(0);
   const [isUploading, setIsUploading] = useState(false);
   const [tokenTimeLeft, setTokenTimeLeft] = useState('');

   // Refs
   const messagesEndRef = useRef(null);
   const fileInputRef = useRef(null);
   const typingTimeoutRef = useRef(null);

   // Emojis
   const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '🥴', '😠', '😡', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳', '🥺', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐', '🤓', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌'];

   // Scroll para baixo
   const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   };

   // Gerenciar mensagens não lidas
   const markAsRead = (username, roomId = null) => {
      if (username) {
         setUnreadMessages(prev => ({
            ...prev,
            [username]: 0
         }));
      }
      if (roomId) {
         setUnreadRoomMessages(prev => ({
            ...prev,
            [roomId]: 0
         }));
      }
   };

   const incrementUnreadCount = (username, roomId = null) => {
      if (username && username !== user?.username) {
         setUnreadMessages(prev => ({
            ...prev,
            [username]: (prev[username] || 0) + 1
         }));
      }
      if (roomId) {
         setUnreadRoomMessages(prev => ({
            ...prev,
            [roomId]: (prev[roomId] || 0) + 1
         }));
      }
   };

   // Atualizar tempo restante do token
   useEffect(() => {
      const updateTokenTime = () => {
         const token = getStoredToken();
         if (token) {
            const timeLeft = getTimeUntilExpiration(token);
            setTokenTimeLeft(timeLeft ? formatTimeLeft(timeLeft) : 'Expirado');
         }
      };

      updateTokenTime();
      const interval = setInterval(updateTokenTime, 60000); // Atualizar a cada minuto

      return () => clearInterval(interval);
   }, []);

   // Carregar grupos e salas do usuário
   useEffect(() => {
      const loadUserRooms = async () => {
         try {
            const userRooms = await chatService.getRooms();
            setGroups(userRooms || []);
         } catch (error) {
            console.error('Erro ao carregar grupos:', error);
            // Não exibir notificação para este erro específico, pode ser normal não ter grupos
         }
      };

      const testMessagesAPI = async () => {
         try {
            console.log('🧪 Testando API de mensagens...');

            // Verificar se o token está presente e válido
            const token = localStorage.getItem('token');
            console.log('🔐 Token disponível:', token ? 'sim' : 'não');

            if (token) {
               console.log('🔐 Token (primeiros 50 chars):', token.substring(0, 50) + '...');

               // Tentar decodificar o token para debug
               try {
                  const { jwtDecode } = await import('jwt-decode');
                  const decoded = jwtDecode(token);
                  console.log('🔐 Token decodificado:', decoded);
                  console.log('🔐 Token expira em:', new Date(decoded.exp * 1000));
                  console.log('🔐 Token ainda válido:', decoded.exp * 1000 > Date.now());
               } catch (decodeError) {
                  console.error('❌ Erro ao decodificar token:', decodeError);
               }
            }

            const testResult = await chatService.testMessages();
            console.log('✅ API de mensagens funcionando:', testResult);
         } catch (error) {
            console.error('❌ API de mensagens não está funcionando:', error);
            let errorMessage = 'API de mensagens indisponível';

            if (error.code === 'ECONNREFUSED') {
               errorMessage = 'Servidor indisponível. Verifique se o backend está rodando.';
            } else if (error.response?.status === 401) {
               errorMessage = 'Token de autenticação não fornecido. Faça login novamente.';
            } else if (error.response?.status === 403) {
               errorMessage = 'Token de autenticação inválido ou expirado. Faça login novamente.';
            } else if (error.response?.status === 500) {
               errorMessage = 'Erro interno do servidor de mensagens.';
            }

            // Apenas exibir o erro após alguns segundos, para dar tempo do servidor responder
            setTimeout(() => {
               addNotification('Erro', errorMessage);
            }, 3000);
         }
      };

      const loadConversations = async () => {
         try {
            // Carregar conversas existentes para popular a lista
            const conversations = await chatService.getConversations();
            console.log('Conversas carregadas:', conversations);

            // Opcional: você pode usar essas conversas para popular listas ou contadores
            // Por enquanto, vamos apenas logar para debug
         } catch (error) {
            console.error('Erro ao carregar conversas:', error);
            // Não exibir notificação, pode ser normal não ter conversas
         }
      };

      if (user && user.id && user.username) {
         console.log('👤 Usuário autenticado:', user);
         testMessagesAPI(); // Testar API primeiro
         loadUserRooms();
         loadConversations();
      } else {
         console.log('⚠️ Usuário não completamente autenticado ainda, aguardando...', user);
      }
   }, [user]);   // Socket event listeners
   useEffect(() => {
      if (!isConnected) return;

      // Mensagens privadas
      const handlePrivateMessage = ({ from, message, timestamp, id, fileData }) => {
         const messageData = {
            id: id || Date.now(),
            from,
            message,
            timestamp,
            fileData,
            type: 'received'
         };

         setMessages(prev => ({
            ...prev,
            [from]: [...(prev[from] || []), messageData]
         }));

         // Incrementar contador de não lidas apenas se não estiver na conversa ativa
         if (selectedUser !== from) {
            incrementUnreadCount(from);
            addNotification(`Nova mensagem de ${from}`, message);
         }
      };

      // Mensagens de grupo
      const handleGroupMessage = ({ from, roomId, message, timestamp, id, fileData }) => {
         const messageData = {
            id: id || Date.now(),
            from,
            message,
            timestamp,
            fileData,
            type: 'received'
         };

         setRoomMessages(prev => ({
            ...prev,
            [roomId]: [...(prev[roomId] || []), messageData]
         }));

         // Incrementar contador de não lidas apenas se não estiver na sala ativa e não for mensagem própria
         if (selectedRoom !== roomId && from !== user?.username) {
            incrementUnreadCount(null, roomId);
            const group = groups.find(g => g.id === roomId);
            addNotification(`Nova mensagem em ${group?.name || 'Grupo'}`, `${from}: ${message}`);
         }
      };

      // Confirmação de envio - REMOVIDO PARA EVITAR DUPLICAÇÃO
      const handleMessageSent = (messageData) => {
         setSendingMessage(false);
         // Não adicionar mensagem novamente, pois já foi adicionada localmente
         console.log('Mensagem enviada confirmada:', messageData);
      };

      // Histórico de mensagens
      const handleRoomHistory = ({ roomId, messages: historyMessages }) => {
         setRoomMessages(prev => ({
            ...prev,
            [roomId]: historyMessages || []
         }));
      };

      // Grupo criado
      const handleGroupCreated = ({ roomId, groupName, members, createdBy }) => {
         const newGroup = {
            id: roomId,
            name: groupName,
            type: 'group',
            members: members,
            created_by: createdBy
         };

         setGroups(prev => [...prev, newGroup]);
         addNotification('Grupo criado', `Grupo "${groupName}" foi criado com sucesso!`);
      };

      // Indicadores de digitação
      const handleTyping = ({ from, type, roomId }) => {
         if (type === 'private' && selectedUser === from) {
            setTypingStatus(`${from} está digitando...`);
         } else if (type === 'group' && selectedRoom === roomId) {
            setTypingStatus(`${from} está digitando...`);
         }

         // Limpar após 3 segundos
         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
         typingTimeoutRef.current = setTimeout(() => {
            setTypingStatus('');
         }, 3000);
      };

      const handleStopTyping = ({ from, type, roomId }) => {
         if ((type === 'private' && selectedUser === from) ||
            (type === 'group' && selectedRoom === roomId)) {
            setTypingStatus('');
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
         }
      };

      // Resultados de busca
      const handleSearchResults = (results) => {
         setSearchResults(results);
      };

      // Erros
      const handleError = ({ message }) => {
         addNotification('Erro', message);
      };

      // Adicionar listeners
      addEventListener('receive_private', handlePrivateMessage);
      addEventListener('receive_group', handleGroupMessage);
      addEventListener('message_sent', handleMessageSent);
      addEventListener('room_history', handleRoomHistory);
      addEventListener('group_created', handleGroupCreated);
      addEventListener('typing', handleTyping);
      addEventListener('stop_typing', handleStopTyping);
      addEventListener('search_results', handleSearchResults);
      addEventListener('error', handleError);

      // Cleanup
      return () => {
         removeEventListener('receive_private', handlePrivateMessage);
         removeEventListener('receive_group', handleGroupMessage);
         removeEventListener('message_sent', handleMessageSent);
         removeEventListener('room_history', handleRoomHistory);
         removeEventListener('group_created', handleGroupCreated);
         removeEventListener('typing', handleTyping);
         removeEventListener('stop_typing', handleStopTyping);
         removeEventListener('search_results', handleSearchResults);
         removeEventListener('error', handleError);

         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
   }, [isConnected, selectedUser, selectedRoom, groups, addEventListener, removeEventListener]);

   // Scroll automático para mensagens novas
   useEffect(() => {
      scrollToBottom();
   }, [messages, roomMessages]);

   // Adicionar notificação
   const addNotification = (title, message) => {
      const notification = {
         id: Date.now(),
         title,
         message,
         timestamp: new Date().toISOString()
      };

      setNotifications(prev => [notification, ...prev].slice(0, 10)); // Máximo 10 notificações

      // Remover após 5 segundos
      setTimeout(() => {
         setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
   };

   // Enviar mensagem
   const handleSendMessage = async (e) => {
      e.preventDefault();
      console.log('handleSendMessage chamado');

      if (!message.trim() || sendingMessage) {
         console.log('Mensagem vazia ou já enviando');
         return;
      }

      setSendingMessage(true);
      const messageText = message.trim();
      const timestamp = new Date().toLocaleTimeString();

      try {
         console.log('Preparando mensagem:', { messageText, selectedUser, selectedRoom });

         // Adicionar mensagem localmente primeiro
         const messageData = {
            id: Date.now(),
            from: user.username,
            message: messageText,
            timestamp,
            type: 'sent'
         };

         console.log('Dados da mensagem:', messageData);

         if (selectedUser) {
            // Mensagem privada
            console.log('Enviando mensagem privada para:', selectedUser);
            setMessages(prev => ({
               ...prev,
               [selectedUser]: [...(prev[selectedUser] || []), messageData]
            }));
            sendPrivateMessage(selectedUser, messageText);
         } else if (selectedRoom) {
            // Mensagem de grupo
            console.log('Enviando mensagem de grupo para:', selectedRoom);
            setRoomMessages(prev => ({
               ...prev,
               [selectedRoom]: [...(prev[selectedRoom] || []), messageData]
            }));
            sendGroupMessage(selectedRoom, messageText);
         }

         console.log('Limpando campo de mensagem');
         setMessage('');

         // Parar indicador de digitação
         if (selectedUser) {
            stopTyping(selectedUser);
         } else if (selectedRoom) {
            stopTyping(null, selectedRoom);
         }

         console.log('Mensagem enviada com sucesso');

      } catch (error) {
         console.error('Erro ao enviar mensagem:', error);
         addNotification('Erro', 'Falha ao enviar mensagem');
      } finally {
         console.log('Finalizando envio');
         setSendingMessage(false);
      }
   };

   // Handle typing
   const handleTyping = () => {
      if (selectedUser) {
         startTyping(selectedUser);
      } else if (selectedRoom) {
         startTyping(null, selectedRoom);
      }

      // Auto-stop após 3 segundos
      if (typingTimer) clearTimeout(typingTimer);
      setTypingTimer(setTimeout(() => {
         if (selectedUser) {
            stopTyping(selectedUser);
         } else if (selectedRoom) {
            stopTyping(null, selectedRoom);
         }
      }, 3000));
   };

   // Upload de arquivo
   const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsUploading(true);
      setUploadProgress(0);

      try {
         const fileData = await chatService.uploadFile(file);
         const timestamp = new Date().toLocaleTimeString();

         // Criar mensagem com arquivo
         const messageData = {
            id: Date.now(),
            from: user.username,
            message: `📎 ${file.name}`,
            timestamp,
            type: 'sent',
            fileData
         };

         // Adicionar mensagem localmente
         if (selectedUser) {
            setMessages(prev => ({
               ...prev,
               [selectedUser]: [...(prev[selectedUser] || []), messageData]
            }));
            sendPrivateMessage(selectedUser, `📎 ${file.name}`, fileData);
         } else if (selectedRoom) {
            setRoomMessages(prev => ({
               ...prev,
               [selectedRoom]: [...(prev[selectedRoom] || []), messageData]
            }));
            sendGroupMessage(selectedRoom, `📎 ${file.name}`, fileData);
         }

         addNotification('Sucesso', 'Arquivo enviado com sucesso!');
      } catch (error) {
         console.error('Erro no upload:', error);
         addNotification('Erro', 'Falha no upload do arquivo');
      } finally {
         setIsUploading(false);
         setUploadProgress(0);
         if (fileInputRef.current) {
            fileInputRef.current.value = '';
         }
      }
   };

   // Criar grupo
   const handleCreateGroup = () => {
      if (!groupName.trim() || !groupMembers.trim()) {
         addNotification('Erro', 'Nome do grupo e membros são obrigatórios');
         return;
      }

      const members = groupMembers.split(',').map(m => m.trim()).filter(m => m);
      createGroup(groupName.trim(), members);

      setGroupName('');
      setGroupMembers('');
      setShowGroupForm(false);
   };

   // Buscar mensagens
   const handleSearch = () => {
      if (searchQuery.trim()) {
         searchMessages(searchQuery.trim());
      }
   };

   // Atualizar status
   const handleStatusChange = (newStatus) => {
      setUserStatus(newStatus);
      updateStatus(newStatus);
   };

   // Logout
   const handleLogout = async () => {
      if (confirm('Tem certeza que deseja sair?')) {
         await logout();
      }
   };

   // Selecionar conversa
   const selectUser = async (username) => {
      try {
         setSelectedUser(username);
         setSelectedRoom(null);
         // Marcar mensagens como lidas quando selecionar a conversa
         markAsRead(username);

         // Carregar histórico de mensagens se ainda não estiver carregado
         if (!messages[username] || messages[username].length === 0) {
            try {
               console.log('🔍 Carregando histórico de mensagens para:', username);
               const historicMessages = await chatService.getPrivateMessages(username);
               console.log('📥 Mensagens históricas carregadas:', historicMessages);

               if (historicMessages && Array.isArray(historicMessages) && historicMessages.length > 0) {
                  setMessages(prev => ({
                     ...prev,
                     [username]: historicMessages
                  }));
                  console.log('✅ Mensagens adicionadas ao estado');
               } else {
                  console.log('ℹ️ Nenhuma mensagem histórica encontrada');
               }
            } catch (error) {
               console.error('❌ Erro ao carregar mensagens históricas:', error);
               let errorMessage = 'Falha ao carregar histórico de mensagens';

               if (error.code === 'ECONNREFUSED') {
                  errorMessage = 'Servidor indisponível. Verifique se o backend está rodando.';
               } else if (error.response?.status === 403) {
                  errorMessage = 'Token expirado. Faça login novamente.';
               }

               addNotification('Erro', errorMessage);
            }
         } else {
            console.log('ℹ️ Mensagens já carregadas para', username);
         }
      } catch (error) {
         console.error('❌ Erro ao selecionar usuário:', error);
         addNotification('Erro', 'Falha ao selecionar conversa');
      }
   };

   const selectRoom = async (roomId) => {
      try {
         setSelectedRoom(roomId);
         setSelectedUser(null);
         joinRoom(roomId);
         // Marcar mensagens como lidas quando selecionar a sala
         markAsRead(null, roomId);

         // Carregar histórico de mensagens se ainda não estiver carregado
         if (!roomMessages[roomId] || roomMessages[roomId].length === 0) {
            try {
               console.log('🔍 Carregando histórico de mensagens para sala:', roomId);
               const historicMessages = await chatService.getGroupMessages(roomId);
               console.log('📥 Mensagens históricas da sala carregadas:', historicMessages);

               if (historicMessages && Array.isArray(historicMessages) && historicMessages.length > 0) {
                  setRoomMessages(prev => ({
                     ...prev,
                     [roomId]: historicMessages
                  }));
                  console.log('✅ Mensagens da sala adicionadas ao estado');
               } else {
                  console.log('ℹ️ Nenhuma mensagem histórica encontrada para a sala');
               }
            } catch (error) {
               console.error('❌ Erro ao carregar mensagens históricas da sala:', error);
               let errorMessage = 'Falha ao carregar histórico de mensagens do grupo';

               if (error.code === 'ECONNREFUSED') {
                  errorMessage = 'Servidor indisponível. Verifique se o backend está rodando.';
               } else if (error.response?.status === 403) {
                  errorMessage = 'Token expirado. Faça login novamente.';
               }

               addNotification('Erro', errorMessage);
            }
         } else {
            console.log('ℹ️ Mensagens da sala já carregadas para', roomId);
         }
      } catch (error) {
         console.error('❌ Erro ao selecionar sala:', error);
         addNotification('Erro', 'Falha ao selecionar grupo');
      }
   };   // Obter mensagens da conversa ativa
   const getCurrentMessages = () => {
      try {
         let currentMessages = [];

         if (selectedUser) {
            currentMessages = messages[selectedUser] || [];
         } else if (selectedRoom) {
            currentMessages = roomMessages[selectedRoom] || [];
         }

         // Filtrar mensagens válidas
         const validMessages = currentMessages.filter(msg => {
            return msg && msg.id && (msg.message || msg.fileData) && msg.timestamp;
         });

         console.log('Mensagens válidas:', validMessages.length);
         return validMessages;

      } catch (error) {
         console.error('Erro ao obter mensagens:', error);
         return [];
      }
   };

   // Renderizar mensagem
   const renderMessage = (msg) => {
      try {
         if (!user || !msg) {
            console.error('Usuário ou mensagem inválidos:', { user, msg });
            return null;
         }

         const isOwn = msg.from === user.username || msg.type === 'sent';
         const messageUser = msg.from || user.username;
         const initials = messageUser ? messageUser.substring(0, 2).toUpperCase() : '??';

         return (
            <div key={msg.id} className={`message ${isOwn ? 'own' : ''}`}>
               <div className="message-avatar">
                  {initials}
               </div>
               <div className="message-content">
                  <div className="message-header">
                     <span className="message-sender">{messageUser}</span>
                     <span className="message-time">{msg.timestamp}</span>
                  </div>
                  <div className="message-bubble">
                     {msg.fileData ? (
                        <div className="file-message">
                           <span className="file-icon">📎</span>
                           <div className="file-info">
                              <div className="file-name">{msg.fileData.originalName}</div>
                              <div className="file-size">({(msg.fileData.size / 1024).toFixed(1)} KB)</div>
                           </div>
                           <a
                              href={`http://localhost:3000${msg.fileData.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-download"
                              download
                           >
                              ⬇️
                           </a>
                        </div>
                     ) : (
                        <div className="message-text">{msg.message}</div>
                     )}
                  </div>
               </div>
            </div>
         );
      } catch (error) {
         console.error('Erro ao renderizar mensagem:', error, msg);
         return (
            <div key={msg.id || Date.now()} className="message error">
               <div className="message-content">
                  <div className="message-bubble">
                     <div className="message-text">Erro ao exibir mensagem</div>
                  </div>
               </div>
            </div>
         );
      }
   }; return (
      <>
         {/* Verificação de estado crítico */}
         {!user && (
            <div className="loading-screen">
               <div className="loading-spinner">
                  <h2>Carregando...</h2>
                  <div className="spinner"></div>
               </div>
            </div>
         )}

         {user && (
            <>
               {/* Header */}
               <header className="chat-header">
                  <div className="header-left">
                     <div className="app-logo">
                        💬 Chat RealTime
                     </div>
                     <div className="connection-status">
                        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
                        {isConnected ? 'Conectado' : 'Desconectado'}
                     </div>
                  </div>

                  <div className="header-center">
                     <div className="search-container">
                        <input
                           type="text"
                           placeholder="Buscar mensagens..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch}>🔍</button>
                     </div>
                  </div>

                  <div className="header-right">
                     <div className="token-info">
                        <span>Token expira em: {tokenTimeLeft}</span>
                     </div>

                     <div className="user-info">
                        <span className="username">{user?.username}</span>
                        <select
                           value={userStatus}
                           onChange={(e) => handleStatusChange(e.target.value)}
                           className="status-select"
                        >
                           <option value="available">🟢 Disponível</option>
                           <option value="busy">🔴 Ocupado</option>
                           <option value="away">🟡 Ausente</option>
                        </select>
                     </div>

                     <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="theme-toggle"
                     >
                        {darkMode ? '☀️' : '🌙'}
                     </button>

                     <button onClick={handleLogout} className="logout-btn">
                        🚪 Sair
                     </button>
                  </div>
               </header>

               {/* Notificações */}
               {notifications.length > 0 && (
                  <div className="notifications">
                     {notifications.map(notification => (
                        <div key={notification.id} className="notification">
                           <strong>{notification.title}</strong>
                           <p>{notification.message}</p>
                        </div>
                     ))}
                  </div>
               )}

               <div className="chat-main">
                  {/* Sidebar */}
                  <aside className="sidebar">
                     <div className="sidebar-tabs">
                        <button
                           className={activeTab === 'users' ? 'active' : ''}
                           onClick={() => setActiveTab('users')}
                        >
                           👥 Usuários ({onlineUsers.length})
                        </button>
                        <button
                           className={activeTab === 'groups' ? 'active' : ''}
                           onClick={() => setActiveTab('groups')}
                        >
                           🏢 Grupos ({groups.length})
                        </button>
                     </div>

                     {activeTab === 'users' && (
                        <div className="users-list">
                           {onlineUsers.map(user => (
                              <div
                                 key={user.id}
                                 className={`user-item ${selectedUser === user.username ? 'selected' : ''}`}
                                 onClick={() => selectUser(user.username)}
                              >
                                 <div className="user-avatar">
                                    {user.username.charAt(0).toUpperCase()}
                                 </div>
                                 <div className="user-info">
                                    <div className="user-name">{user.username}</div>
                                    <div className="user-status">
                                       <span className={`status-dot ${user.status || 'available'}`}></span>
                                       {user.status === 'available' ? 'Disponível' :
                                          user.status === 'busy' ? 'Ocupado' :
                                             user.status === 'away' ? 'Ausente' : 'Disponível'}
                                    </div>
                                 </div>
                                 {unreadMessages[user.username] > 0 && (
                                    <span className="message-count">{unreadMessages[user.username]}</span>
                                 )}
                              </div>
                           ))}
                        </div>
                     )}

                     {activeTab === 'groups' && (
                        <div className="groups-section">
                           <button
                              onClick={() => setShowGroupForm(!showGroupForm)}
                              className="create-group-btn"
                           >
                              ➕ Criar Grupo
                           </button>

                           {showGroupForm && (
                              <div className="group-form">
                                 <input
                                    type="text"
                                    placeholder="Nome do grupo"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                 />
                                 <input
                                    type="text"
                                    placeholder="Membros (separados por vírgula)"
                                    value={groupMembers}
                                    onChange={(e) => setGroupMembers(e.target.value)}
                                 />
                                 <div className="form-buttons">
                                    <button onClick={handleCreateGroup}>Criar</button>
                                    <button onClick={() => setShowGroupForm(false)}>Cancelar</button>
                                 </div>
                              </div>
                           )}

                           <div className="groups-list">
                              {groups.map(group => (
                                 <div
                                    key={group.id}
                                    className={`group-item ${selectedRoom === group.id ? 'selected' : ''}`}
                                    onClick={() => selectRoom(group.id)}
                                 >
                                    <span className="group-icon">🏢</span>
                                    <span className="group-name">{group.name}</span>
                                    {unreadRoomMessages[group.id] > 0 && (
                                       <span className="message-count">{unreadRoomMessages[group.id]}</span>
                                    )}
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </aside>

                  {/* Chat Area */}
                  <main className="chat-area">
                     {selectedUser || selectedRoom ? (
                        <>
                           <div className="chat-header-info">
                              <div className="chat-user-info">
                                 <div className="chat-user-avatar">
                                    {selectedUser ?
                                       selectedUser.substring(0, 2).toUpperCase() :
                                       groups.find(g => g.id === selectedRoom)?.name?.substring(0, 2).toUpperCase()
                                    }
                                 </div>
                                 <div className="chat-user-details">
                                    <h3>
                                       {selectedUser ? selectedUser : groups.find(g => g.id === selectedRoom)?.name}
                                    </h3>
                                    <p>
                                       {selectedUser ?
                                          (onlineUsers.find(u => u.username === selectedUser)?.status === 'available' ? 'Online' : 'Offline') :
                                          'Grupo'
                                       }
                                    </p>
                                 </div>
                              </div>
                              {typingStatus && <span className="typing-indicator">{typingStatus}</span>}
                           </div>

                           <div className="messages-container">
                              {getCurrentMessages().map((msg, index) => {
                                 try {
                                    return renderMessage(msg);
                                 } catch (error) {
                                    console.error('Erro ao renderizar mensagem:', error, msg);
                                    return (
                                       <div key={`error-${index}`} className="message error">
                                          <div className="message-content">
                                             <div className="message-bubble">
                                                <div className="message-text">Erro ao exibir mensagem</div>
                                             </div>
                                          </div>
                                       </div>
                                    );
                                 }
                              })}
                              <div ref={messagesEndRef} />
                           </div>

                           <form onSubmit={handleSendMessage} className="message-input-container">
                              <div className="message-input-wrapper">
                                 <label className="file-input-label">
                                    📎
                                    <input
                                       type="file"
                                       ref={fileInputRef}
                                       onChange={handleFileUpload}
                                       className="file-input"
                                       accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                                    />
                                 </label>

                                 <textarea
                                    value={message}
                                    onChange={(e) => {
                                       setMessage(e.target.value);
                                       handleTyping();
                                    }}
                                    onKeyPress={(e) => {
                                       if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleSendMessage(e);
                                       }
                                    }}
                                    placeholder="Digite sua mensagem..."
                                    disabled={sendingMessage || !isConnected}
                                    className="message-input"
                                    rows="1"
                                 />

                                 <button
                                    type="submit"
                                    disabled={!message.trim() || sendingMessage || !isConnected}
                                    className="send-button"
                                 >
                                    {sendingMessage ? '⏳' : '📤'}
                                 </button>
                              </div>

                              {isUploading && (
                                 <div className="upload-progress">
                                    <div className="progress-bar">
                                       <div
                                          className="progress-fill"
                                          style={{ width: `${uploadProgress}%` }}
                                       ></div>
                                    </div>
                                    <span>Enviando arquivo...</span>
                                 </div>
                              )}
                           </form>
                        </>
                     ) : (
                        <div className="empty-chat">
                           <div className="empty-chat-icon">💬</div>
                           <h3>Bem-vindo ao Chat RealTime!</h3>
                           <p>Selecione um usuário ou grupo para começar a conversar.</p>
                           <div className="chat-stats">
                              <div className="stat">
                                 <span className="stat-number">{onlineUsers.length}</span>
                                 <span className="stat-label">Usuários Online</span>
                              </div>
                              <div className="stat">
                                 <span className="stat-number">{groups.length}</span>
                                 <span className="stat-label">Grupos</span>
                              </div>
                           </div>
                        </div>
                     )}
                  </main>
               </div>

               {/* Search Results */}
               {searchResults.length > 0 && (
                  <div className="search-results">
                     <h3>Resultados da busca:</h3>
                     {searchResults.map((result, index) => (
                        <div key={index} className="search-result">
                           <strong>{result.from}</strong>: {result.content}
                           <span className="search-timestamp">{result.timestamp}</span>
                        </div>
                     ))}
                     <button onClick={() => setSearchResults([])}>Fechar</button>
                  </div>
               )}
            </>
         )}
      </>
   );
};

export default Chat;
