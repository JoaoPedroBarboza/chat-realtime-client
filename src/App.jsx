import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3000');

function App() {
  const [username, setUsername] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState({});
  const [roomMessages, setRoomMessages] = useState({});
  const [message, setMessage] = useState('');
  const [typingStatus, setTypingStatus] = useState('');
  const [typingTimer, setTypingTimer] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users' ou 'groups'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userStatus, setUserStatus] = useState('available');
  const [notifications, setNotifications] = useState([]);
  const [avatar, setAvatar] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '🥴', '😠', '😡', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳', '🥺', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐', '🤓', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤏', '💪', '🦾', '🖕', '✍️', '🙏', '🦶', '🦵', '👂', '🦻', '👃', '👀', '👁️', '🧠', '🦷', '🦴', '👅', '👄', '💋', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💤', '💢', '💣', '💥', '💦', '💨', '💫', '💬', '🗨️', '🗯️', '💭', '🕳️'];

  useEffect(() => {
    // Event listeners
    socket.on('user_list', (userList) => {
      setUsers(userList);
    });

    socket.on('receive_private', ({ from, message, timestamp, id }) => {
      setMessages((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), { id, from, content: message, time: timestamp, self: false }],
      }));

      // Adicionar notificação
      if (from !== selectedUser?.username) {
        addNotification(`Nova mensagem de ${from}`, 'message');
      }
    });

    socket.on('receive_group', ({ from, message, timestamp, roomId, id }) => {
      setRoomMessages((prev) => ({
        ...prev,
        [roomId]: [...(prev[roomId] || []), { id, from, content: message, time: timestamp, self: from === username }],
      }));

      // Adicionar notificação
      if (roomId !== selectedRoom) {
        addNotification(`Nova mensagem no grupo de ${from}`, 'group');
      }
    });

    socket.on('typing', ({ from, type, roomId }) => {
      if (type === 'private') {
        setTypingStatus(`${from} está digitando...`);
      } else if (type === 'group' && roomId === selectedRoom) {
        setTypingStatus(`${from} está digitando...`);
      }

      // Limpar status após 3 segundos
      setTimeout(() => setTypingStatus(''), 3000);
    });

    socket.on('stop_typing', () => {
      setTypingStatus('');
    });

    socket.on('group_created', ({ roomId, groupName, members, createdBy }) => {
      setGroups(prev => [...prev, { id: roomId, name: groupName, members, createdBy }]);
      addNotification(`Você foi adicionado ao grupo "${groupName}"`, 'group');
    });

    socket.on('message_history', (history) => {
      setMessageHistory(history);
    });

    socket.on('search_results', (results) => {
      setSearchResults(results);
    });

    socket.on('room_history', (history) => {
      if (selectedRoom) {
        setRoomMessages(prev => ({
          ...prev,
          [selectedRoom]: history
        }));
      }
    });

    return () => {
      socket.off('user_list');
      socket.off('receive_private');
      socket.off('receive_group');
      socket.off('typing');
      socket.off('stop_typing');
      socket.off('group_created');
      socket.off('message_history');
      socket.off('search_results');
      socket.off('room_history');
    };
  }, [username, selectedUser, selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, roomMessages]);

  const addNotification = (message, type) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setNotifications(prev => [notification, ...prev.slice(0, 4)]);

    // Remover após 5 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const handleLogin = () => {
    if (username.trim()) {
      socket.emit('set_username', { username, avatar });
      setLoggedIn(true);
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      if (selectedUser) {
        // Mensagem privada
        socket.emit('send_private', {
          to: selectedUser.username,
          message,
        });

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newMessage = {
          id: Date.now(),
          from: username,
          content: message,
          time,
          self: true
        };

        setMessages((prev) => ({
          ...prev,
          [selectedUser.username]: [...(prev[selectedUser.username] || []), newMessage],
        }));
      } else if (selectedRoom) {
        // Mensagem em grupo
        socket.emit('send_group', {
          roomId: selectedRoom,
          message,
        });

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newMessage = {
          id: Date.now(),
          from: username,
          content: message,
          time,
          self: true
        };

        setRoomMessages((prev) => ({
          ...prev,
          [selectedRoom]: [...(prev[selectedRoom] || []), newMessage],
        }));
      }

      setMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleTyping = () => {
    if (selectedUser) {
      socket.emit('typing', { to: selectedUser.username });
    } else if (selectedRoom) {
      socket.emit('typing', { roomId: selectedRoom });
    }

    // Limpar timer anterior
    if (typingTimer) {
      clearTimeout(typingTimer);
    }

    // Configurar novo timer para parar de digitar
    const newTimer = setTimeout(() => {
      if (selectedUser) {
        socket.emit('stop_typing', { to: selectedUser.username });
      } else if (selectedRoom) {
        socket.emit('stop_typing', { roomId: selectedRoom });
      }
    }, 2000);

    setTypingTimer(newTimer);
  };

  const createGroup = () => {
    if (groupName.trim() && groupMembers.trim()) {
      socket.emit('create_group', {
        groupName,
        members: groupMembers.split(',').map((m) => m.trim()),
      });
      setShowGroupForm(false);
      setGroupName('');
      setGroupMembers('');
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    setSelectedRoom(null);
    setActiveTab('users');
  };

  const selectRoom = (room) => {
    setSelectedRoom(room.id);
    setSelectedUser(null);
    setActiveTab('groups');
    socket.emit('join_room', room.id);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      socket.emit('search_messages', { query: searchQuery });
    }
  };

  const updateStatus = (status) => {
    setUserStatus(status);
    socket.emit('update_status', { status });
  };

  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
  };

  const getCurrentMessages = () => {
    if (selectedUser) {
      return messages[selectedUser.username] || [];
    } else if (selectedRoom) {
      return roomMessages[selectedRoom] || [];
    }
    return [];
  };

  const getCurrentChatTitle = () => {
    if (selectedUser) {
      return selectedUser.username;
    } else if (selectedRoom) {
      const room = groups.find(g => g.id === selectedRoom);
      return room ? room.name : 'Grupo';
    }
    return 'Selecione um chat';
  };

  const getLastSeenText = (user) => {
    if (user.online) return 'Online';
    if (user.lastSeen) {
      const lastSeen = new Date(user.lastSeen);
      const now = new Date();
      const diffInHours = Math.floor((now - lastSeen) / (1000 * 60 * 60));

      if (diffInHours < 1) return 'Visto recentemente';
      if (diffInHours < 24) return `Visto há ${diffInHours}h`;
      return `Visto há ${Math.floor(diffInHours / 24)}d`;
    }
    return 'Offline';
  };

  return (
    <div className={`app ${darkMode ? 'dark-theme' : 'light-theme'}${showGroupForm ? ' modal-open' : ''}`}>
      {/* Notificações */}
      {notifications.length > 0 && (
        <div className="notifications">
          {notifications.map(notification => (
            <div key={notification.id} className={`notification ${notification.type}`}>
              <span>{notification.message}</span>
              <span className="notification-time">{notification.timestamp}</span>
            </div>
          ))}
        </div>
      )}

      {!loggedIn ? (
        <div className="login">
          <h1>Chat em Tempo Real</h1>
          <div className="login-form">
            <input
              placeholder="Seu nome"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <input
              placeholder="Avatar (emoji ou URL)"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
            />
            <button onClick={handleLogin}>Entrar</button>
          </div>
        </div>
      ) : (
        <div className="chat-container">
          <div className="sidebar">
            <div className="user-profile">
              <div className="avatar">{avatar || '👤'}</div>
              <div className="user-info">
                <h3>{username}</h3>
                <select
                  value={userStatus}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="status-select"
                >
                  <option value="available">Disponível</option>
                  <option value="busy">Ocupado</option>
                  <option value="away">Ausente</option>
                  <option value="dnd">Não perturbe</option>
                </select>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="theme-toggle"
                title="Alternar tema"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>

            <div className="search-bar">
              <input
                placeholder="Buscar mensagens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch}>🔍</button>
            </div>

            <div className="tabs">
              <button
                className={activeTab === 'users' ? 'active' : ''}
                onClick={() => setActiveTab('users')}
              >
                Usuários ({users.length})
              </button>
              <button
                className={activeTab === 'groups' ? 'active' : ''}
                onClick={() => setActiveTab('groups')}
              >
                Grupos ({groups.length})
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'users' && (
                <div className="users-list">
                  {users.length === 0 ? (
                    <p className="empty-state">Nenhum outro usuário online</p>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user.username}
                        className={`user-item${selectedUser?.username === user.username ? ' active' : ''}`}
                        onClick={() => selectUser(user)}
                      >
                        <div className="user-avatar">{user.avatar || '👤'}</div>
                        <div className="user-details">
                          <span className="user-name">{user.username}</span>
                          <span className="user-status">{getLastSeenText(user)}</span>
                        </div>
                        <div className={`status-indicator ${user.online ? 'online' : 'offline'}`}></div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'groups' && (
                <div className="groups-list">
                  <button
                    onClick={() => setShowGroupForm(true)}
                    className="create-group-btn"
                  >
                    ➕ Criar Grupo
                  </button>
                  {groups.length === 0 ? (
                    <p className="empty-state">Nenhum grupo criado</p>
                  ) : (
                    groups.map((group) => (
                      <div
                        key={group.id}
                        className={`group-item${selectedRoom === group.id ? ' active' : ''}`}
                        onClick={() => selectRoom(group)}
                      >
                        <div className="group-avatar">👥</div>
                        <div className="group-details">
                          <span className="group-name">{group.name}</span>
                          <span className="group-members">{group.members.length} membros</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="chat-area">
            <div className="chat-header">
              <div className="chat-title">
                <h3>{getCurrentChatTitle()}</h3>
                {selectedUser && (
                  <span className="chat-subtitle">{getLastSeenText(selectedUser)}</span>
                )}
              </div>
              <div className="chat-actions">
                <button onClick={() => setSearchQuery('')} title="Limpar busca">🗑️</button>
                <button onClick={() => window.location.reload()} title="Atualizar">🔄</button>
              </div>
            </div>

            <div className="messages">
              {selectedUser || selectedRoom ? (
                <>
                  {searchResults.length > 0 && (
                    <div className="search-results">
                      <h4>Resultados da busca:</h4>
                      {searchResults.map((result, index) => (
                        <div key={index} className="search-result">
                          <strong>{result.from}:</strong> {result.message}
                          <span className="search-time">{result.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {getCurrentMessages().map((msg) => (
                    <div
                      key={msg.id}
                      className={`message ${msg.self ? 'sent' : 'received'}`}
                    >
                      <div className="message-content">
                        {!msg.self && (
                          <div className="message-sender">{msg.from}</div>
                        )}
                        <div className="message-text">{msg.content}</div>
                      </div>
                      <div className="message-time">{msg.time}</div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="no-selection-message">
                  <div className="welcome-message">
                    <h2>🎉 Bem-vindo ao Chat em Tempo Real</h2>
                    <p>Selecione um usuário ou grupo para começar a conversar</p>
                  </div>
                </div>
              )}
            </div>

            {typingStatus && (
              <div className="typing-indicator">
                <span>{typingStatus}</span>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div className="input-area">
              <div className="input-wrapper">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="emoji-button"
                  title="Adicionar emoji"
                >
                  😊
                </button>

                {showEmojiPicker && (
                  <div className="emoji-picker">
                    {emojis.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => addEmoji(emoji)}
                        className="emoji-option"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Digite uma mensagem..."
                  disabled={!selectedUser && !selectedRoom}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="message-input"
                />

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={() => {/* Implementar envio de arquivo */ }}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="file-button"
                  title="Enviar arquivo"
                  disabled={!selectedUser && !selectedRoom}
                >
                  📎
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!selectedUser && !selectedRoom}
                  className="send-button"
                >
                  📤
                </button>
              </div>
            </div>
          </div>
          {showGroupForm && (
            <div className="modal-overlay">
              <div className="group-form">
                <h3>📝 Criar Novo Grupo</h3>
                <div className="form-content">
                  <input
                    placeholder="Nome do grupo"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="form-input"
                  />
                  <input
                    placeholder="Membros (separados por vírgula)"
                    value={groupMembers}
                    onChange={(e) => setGroupMembers(e.target.value)}
                    className="form-input"
                  />
                  <div className="form-actions">
                    <button onClick={createGroup} className="btn-primary">
                      Criar Grupo
                    </button>
                    <button
                      onClick={() => setShowGroupForm(false)}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
