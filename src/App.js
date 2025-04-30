import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './Menu.css';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './LandingPage';

console.log(process.env.REACT_APP_GOOGLE_CLIENT_ID);


function AppInner() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(1);
  const [carDetails, setCarDetails] = useState({
    make: '',
    model: '',
    year: ''
  });
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    async function showInitialMessages() {
      setMessages([]);
      setIsBotTyping(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setMessages([{ text: 'Hello, I am AutoMate, I am here to help you with your car problems!', sender: 'bot' }]);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setMessages([
        { text: 'Hello, I am AutoMate, I am here to help you with your car problems!', sender: 'bot' },
        { text: 'What is the make of your car?', sender: 'bot' }
      ]);
      setIsBotTyping(false);
    }
    showInitialMessages();
  }, []);

  // Reset chatbot
  const restartChat = () => {
    async function showInitialMessages() {
      setMessages([]);
      setIsBotTyping(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setMessages([{ text: 'Hello, I am AutoMate, I am here to help you with your car problems!', sender: 'bot' }]);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setMessages([
        { text: 'Hello, I am AutoMate, I am here to help you with your car problems!', sender: 'bot' },
        { text: 'What is the make of your car?', sender: 'bot' }
      ]);
      setIsBotTyping(false);
    }
    showInitialMessages();
    setInput('');
    setStep(1);
    setCarDetails({ make: '', model: '', year: '' });
  };

  const handleCarDetailInput = async (value) => {
    if (!value.trim()) return;

    const userMsg = { text: value, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsBotTyping(true);
    const typingDelay = 2000;

    let botMsg = null;
    if (step === 1) {
      setCarDetails({ ...carDetails, make: value });
      botMsg = { text: `What is the model of your ${value}?`, sender: 'bot' };
      setStep(2);
    } else if (step === 2) {
      setCarDetails({ ...carDetails, model: value });
      botMsg = { text: `What is the year of your ${carDetails.make} ${value}?`, sender: 'bot' };
      setStep(3);
    } else if (step === 3) {
      setCarDetails({ ...carDetails, year: value });
      botMsg = { text: 'Describe the problem with your car...', sender: 'bot' };
      setStep(4);
    }
    if (botMsg) {
      await new Promise((resolve) => setTimeout(resolve, typingDelay));
      setMessages((prev) => [...prev, botMsg]);
    }
    setIsBotTyping(false);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsBotTyping(true);

    const prompt = `I have a ${carDetails.make} ${carDetails.model} ${carDetails.year}. ${input}`;
    console.log("Sending prompt:", prompt);

    const typingDelay = 2000;

    try {
      // Await the API call first
      const response = await axios.post('http://localhost:5001/api/chat', {
        inputs: prompt
      });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      const botMessage = response.data.message;
      
      // Wait 2 seconds after API responds
      await new Promise((resolve) => setTimeout(resolve, typingDelay));
      setMessages((prev) => [...prev, { text: botMessage, sender: 'bot' }]);
    } catch (error) {
      let errorMessage = 'Something went wrong. Please try again.';
      if (error.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to the server. Please check if the backend is running.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      await new Promise((resolve) => setTimeout(resolve, typingDelay));
      setMessages((prev) => [
        ...prev,
        { text: errorMessage, sender: 'bot' },
      ]);
    } finally {
      setIsBotTyping(false);
    }
  };

  // Replace restartChat button handler to show confirmation
  const handleRestartClick = () => {
    setShowRestartConfirm(true);
  };

  // Home confirmation logic
  const handleHomeClick = (e) => {
    e.preventDefault();
    setShowHomeConfirm(true);
  };
  const handleHomeConfirm = () => {
    setShowHomeConfirm(false);
    window.location.href = '/';
  };
  const handleHomeCancel = () => {
    setShowHomeConfirm(false);
  };

  // Add function to scroll to bottom of chat
  const scrollToBottom = () => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  };

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-app-layout">
      <SideMenu isOpen={menuOpen} onToggle={() => setMenuOpen((open) => !open)} onHomeClick={handleHomeClick} />
      <div className={`App chat-centered${menuOpen ? '' : ' menu-hidden'}`}> 
        <header className="app-header">
          <div className="app-title-bubble">
            AutoMate
            <img src={require('./automateiconnew.png')} alt="AutoMate Icon" className="automate-icon app-title-large-icon" />
          </div>
        </header>
        <main className="chat-container">
          <div className="chat-box" ref={chatBoxRef}>
            {messages.map((msg, i) => (
              <div key={`${msg.sender}-${i}`} className={`message ${msg.sender}`}>
                {msg.sender === 'user' ? (
                  <>
                    <strong>You:</strong> {msg.text}
                  </>
                ) : (
                  <>
                    <strong>AutoMate:</strong> 
                    <div dangerouslySetInnerHTML={{ 
                      __html: msg.text
                        .replace(/\n(\d+)\.\s*REASON:/g, '<div class="reason-section"><strong>REASON $1:</strong>')
                        .replace(/\nEXPLANATION:/g, '<br/><strong>EXPLANATION:</strong>')
                        .replace(/\nVIDEO:\s*\[(.*?)\]\((https:\/\/www\.youtube\.com\/.*?)\)/g, '<br/><strong>VIDEO:</strong><div class="video-link"><a href="$2" target="_blank">▶️ $1</a></div></div>')
                        .replace(/\n/g, '<br/>')
                    }} />
                  </>
                )}
              </div>
            ))}
            {isBotTyping && (
              <div className="typing-indicator">
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </div>
            )}
          </div>
          <div className="input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (step < 4) {
                    handleCarDetailInput(input);
                    setInput('');
                  } else {
                    sendMessage();
                  }
                }
              }}
              placeholder="Type your response here..."
              className="chat-input"
            />
            <button
              type="button"
              onClick={() => {
                if (step < 4) {
                  handleCarDetailInput(input);
                  setInput('');
                } else {
                  sendMessage();
                }
              }}
              className="send-btn"
            >
              Send
            </button>
            <button
              type="button"
              className="restart-btn"
              onClick={handleRestartClick}
            >
              Restart
            </button>
          </div>
          {showRestartConfirm && (
            <div className="restart-confirm-modal">
              <div className="restart-confirm-box">
                <p>Are you sure you want to restart the chat?</p>
                <div className="restart-confirm-actions">
                  <button className="confirm-yes" onClick={() => { setShowRestartConfirm(false); restartChat(); }}>Yes</button>
                  <button className="confirm-no" onClick={() => setShowRestartConfirm(false)}>No</button>
                </div>
              </div>
            </div>
          )}
          {showHomeConfirm && (
            <div className="restart-confirm-modal">
              <div className="restart-confirm-box">
                <p>Are you sure you want to go to the home page?</p>
                <div className="restart-confirm-actions">
                  <button className="confirm-yes" onClick={handleHomeConfirm}>Yes</button>
                  <button className="confirm-no" onClick={handleHomeCancel}>No</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/chat" element={<AppInner />} />
      </Routes>
    </Router>
  );
}

function SideMenu({ isOpen, onToggle, onHomeClick }) {
  return (
    <>
      <div
        className="menu-toggle-btn"
        onClick={onToggle}
        title={isOpen ? 'Hide menu' : 'Show menu'}
        style={isOpen ? { left: 245, top: 32 } : { left: 10, top: 32 }}
      >
        <div className="menu-bar" />
        <div className="menu-bar" />
        <div className="menu-bar" />
      </div>
      {isOpen && (
        <nav className="side-menu">
          <div className="menu-title">Menu</div>
          <ul>
            <li><a href="/" onClick={onHomeClick}>Home</a></li>
            <li><a href="/chat">Chat</a></li>
            <li><a href="#about">About</a></li>
          </ul>
        </nav>
      )}
    </>
  );
}

export default App;
