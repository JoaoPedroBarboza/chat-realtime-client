import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';
import { chatService } from '../services/api';
import { getTimeUntilExpiration, formatTimeLeft, getStoredToken } from '../utils/auth';

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

   // Estados do chat
   const [selectedUser, setSelectedUser] = useState(null);
   const [selectedRoom, setSelectedRoom] = useState(null);
   const [messages, setMessages] = useState({});
   const [roomMessages, setRoomMessages] = useState({});
   const [message, setMessage] = useState('');
   const [typingStatus, setTypingStatus] = useState('');
   const [typingTimer, setTypingTimer] = useState(null);
   const [sendingMessage, setSendingMessage] = useState(false);
   const [darkMode, setDarkMode] = useState(true);
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

   // Atualizar tempo restante do token
   useEffect(() => {
      const updateTokenTime = () => {
         const token = getStoredToken();
         if (token) {
            const timeLeft = getTimeUntilExpiration(token);
            setTokenTimeLeft(formatTimeLeft(timeLeft));
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
            const rooms = await chatService.getRooms();
            setGroups(rooms);
         } catch (error) {
            console.error('Erro ao carregar salas:', error);
         }
      };

      if (user) {
         loadUserRooms();
      }
   }, [user]);

   // Socket event listeners
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

         // Notificação se não está na conversa ativa
         if (selectedUser !== from) {
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

         // Notificação se não está na sala ativa
         if (selectedRoom !== roomId) {
            const group = groups.find(g => g.id === roomId);
            addNotification(`Nova mensagem em ${group?.name || 'Grupo'}`, `${from}: ${message}`);
         }
      };

      // Confirmação de envio
      const handleMessageSent = (messageData) => {
         setSendingMessage(false);

         if (messageData.type === 'private') {
            setMessages(prev => ({
               ...prev,
               [messageData.to]: [...(prev[messageData.to] || []), {
                  ...messageData,
                  type: 'sent'
               }]
            }));
         } else if (messageData.type === 'group') {
            setRoomMessages(prev => ({
               ...prev,
               [messageData.roomId]: [...(prev[messageData.roomId] || []), {
                  ...messageData,
                  type: 'sent'
               }]
            }));
         }
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

      if (!message.trim() || sendingMessage) return;

      setSendingMessage(true);

      try {
         if (selectedUser) {
            // Mensagem privada
            sendPrivateMessage(selectedUser, message.trim());
         } else if (selectedRoom) {
            // Mensagem de grupo
            sendGroupMessage(selectedRoom, message.trim());
         }

         setMessage('');

         // Parar indicador de digitação
         if (selectedUser) {
            stopTyping(selectedUser);
         } else if (selectedRoom) {
            stopTyping(null, selectedRoom);
         }

      } catch (error) {
         console.error('Erro ao enviar mensagem:', error);
         setSendingMessage(false);
         addNotification('Erro', 'Falha ao enviar mensagem');
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

         // Enviar mensagem com arquivo
         if (selectedUser) {
            sendPrivateMessage(selectedUser, `📎 ${file.name}`, fileData);
         } else if (selectedRoom) {
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
   const selectUser = (username) => {
      setSelectedUser(username);
      setSelectedRoom(null);
   };

   const selectRoom = (roomId) => {
      setSelectedRoom(roomId);
      setSelectedUser(null);
      joinRoom(roomId);
   };

   // Obter mensagens da conversa ativa
   const getCurrentMessages = () => {
      if (selectedUser) {
         return messages[selectedUser] || [];
      } else if (selectedRoom) {
         return roomMessages[selectedRoom] || [];
      }
      return [];
   };

   // Renderizar mensagem
   const renderMessage = (msg) => (
      <div key={msg.id} className={`message ${msg.type === 'sent' ? 'sent' : 'received'}`}>
         <div className="message-header">
            <span className="sender">{msg.from || user.username}</span>
            <span className="timestamp">{msg.timestamp}</span>
         </div>
         <div className="message-content">
            {msg.fileData ? (
               <div className="file-message">
                  <span className="file-icon">📎</span>
                  <a
                     href={`http://localhost:3000${msg.fileData.url}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="file-link"
                  >
                     {msg.fileData.originalName}
                  </a>
                  <span className="file-size">({(msg.fileData.size / 1024).toFixed(1)} KB)</span>
               </div>
            ) : (
               <span className="text">{msg.message}</span>
            )}
         </div>
      </div>
   );

   return (
      <div className={`chat-container ${darkMode ? 'dark' : 'light'}`}>
         {/* Header */}
         <header className="chat-header">
            <div className="header-left">
               <h1>💬 Chat RealTime</h1>
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
                           <span className={`status-dot ${user.status || 'available'}`}></span>
                           <span className="user-name">{user.username}</span>
                           {messages[user.username]?.length > 0 && (
                              <span className="message-count">{messages[user.username].length}</span>
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
                              {roomMessages[group.id]?.length > 0 && (
                                 <span className="message-count">{roomMessages[group.id].length}</span>
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
                        <h3>
                           {selectedUser ? `💬 ${selectedUser}` : `🏢 ${groups.find(g => g.id === selectedRoom)?.name}`}
                        </h3>
                        {typingStatus && <span className="typing-indicator">{typingStatus}</span>}
                     </div>

                     <div className="messages-container">
                        {getCurrentMessages().map(renderMessage)}
                        <div ref={messagesEndRef} />
                     </div>

                     <form onSubmit={handleSendMessage} className="message-form">
                        <div className="message-input-container">
                           <button
                              type="button"
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className="emoji-btn"
                           >
                              😀
                           </button>

                           {showEmojiPicker && (
                              <div className="emoji-picker">
                                 {emojis.map(emoji => (
                                    <button
                                       key={emoji}
                                       type="button"
                                       onClick={() => {
                                          setMessage(prev => prev + emoji);
                                          setShowEmojiPicker(false);
                                       }}
                                       className="emoji-option"
                                    >
                                       {emoji}
                                    </button>
                                 ))}
                              </div>
                           )}

                           <input
                              type="text"
                              value={message}
                              onChange={(e) => {
                                 setMessage(e.target.value);
                                 handleTyping();
                              }}
                              placeholder="Digite sua mensagem..."
                              disabled={sendingMessage || !isConnected}
                              autoComplete="off"
                           />

                           <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              style={{ display: 'none' }}
                              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                           />

                           <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="file-btn"
                              disabled={isUploading || !isConnected}
                           >
                              📎
                           </button>

                           <button
                              type="submit"
                              disabled={!message.trim() || sendingMessage || !isConnected}
                              className="send-btn"
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
                  <div className="welcome-screen">
                     <h2>Bem-vindo ao Chat RealTime! 👋</h2>
                     <p>Selecione um usuário ou grupo para começar a conversar.</p>
                     <div className="welcome-stats">
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
      </div>
   );
};

export default Chat;
