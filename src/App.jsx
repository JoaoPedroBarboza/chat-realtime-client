import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3000');

function App() {
  const [username, setUsername] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState({});
  const [message, setMessage] = useState('');
  const [typingStatus, setTypingStatus] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');

  useEffect(() => {
    socket.on('user_list', (userList) => {
      const otherUsers = userList.filter((user) => user.username !== username);
      setUsers(otherUsers);
    });

    socket.on('receive_private', ({ from, message, timestamp }) => {
      setMessages((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), { from, content: message, time: timestamp, self: false }],
      }));
    });

    socket.on('typing', ({ from }) => {
      setTypingStatus(`${from} está digitando...`);
      setTimeout(() => setTypingStatus(''), 2000);
    });

    return () => {
      socket.off('user_list');
      socket.off('receive_private');
      socket.off('typing');
    };
  }, [username]);

  const handleLogin = () => {
    if (username.trim()) {
      socket.emit('set_username', username);
      setLoggedIn(true);
    }
  };

  const sendMessage = () => {
    if (message && selectedUser) {
      socket.emit('send_private', {
        to: selectedUser.username,
        message,
      });

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages((prev) => ({
        ...prev,
        [selectedUser.username]: [
          ...(prev[selectedUser.username] || []),
          { from: username, content: message, time, self: true },
        ],
      }));

      setMessage('');
    }
  };

  const createGroup = () => {
    socket.emit('create_group', {
      groupName,
      members: groupMembers.split(',').map((m) => m.trim()),
    });
    setShowGroupForm(false);
    setGroupName('');
    setGroupMembers('');
  };

  return (
    <div className={`app dark-theme${showGroupForm ? ' modal-open' : ''}`}>
      {!loggedIn ? (
        <div className="login">
          <h1>Login</h1>
          <input
            placeholder="Seu nome"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleLogin}>Entrar</button>
        </div>
      ) : (
        <div className="chat-container">
          <div className="sidebar">
            <h3>Bem-vindo, {username}!</h3>
            <button onClick={() => setShowGroupForm(true)} className="group-button">+ Grupo</button>
            <h4>Usuários</h4>
            {users.length === 0 ? (
              <p style={{ color: '#888' }}>Nenhum outro usuário online</p>
            ) : (
              users.map((user) => (
                <div
                  key={user.username}
                  className={`user${selectedUser?.username === user.username ? ' active' : ''}`}
                  onClick={() => setSelectedUser(user)}
                >
                  <span>{user.username}</span>
                  <span>{user.online ? '🟢' : '⚫'}</span>
                </div>
              ))
            )}
          </div>
          <div className="chat">
            <div className="messages">
              {selectedUser ? (
                messages[selectedUser.username]?.map((msg, index) => (
                  <div
                    key={index}
                    className={`message ${msg.self ? 'sent' : 'received'}`}
                  >
                    {msg.content}
                    <div className="meta">{msg.time}</div>
                  </div>
                ))
              ) : (
                <div className="no-selection-message">
                  Selecione um usuário para começar a conversar.
                </div>
              )}
            </div>
            {typingStatus && <div className="typing">{typingStatus}</div>}
            <div className="input-area">
              <input
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (selectedUser) {
                    socket.emit('typing', { to: selectedUser.username });
                  }
                }}
                placeholder="Digite uma mensagem..."
                disabled={!selectedUser}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
              />
              <button onClick={sendMessage} disabled={!selectedUser}>Enviar</button>
            </div>
          </div>
          {showGroupForm && (
            <div className="group-form">
              <h3>Criar Grupo</h3>
              <input
                placeholder="Nome do grupo"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <input
                placeholder="Membros (separados por vírgula)"
                value={groupMembers}
                onChange={(e) => setGroupMembers(e.target.value)}
              />
              <button onClick={createGroup}>Criar</button>
              <button onClick={() => setShowGroupForm(false)}>Cancelar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
