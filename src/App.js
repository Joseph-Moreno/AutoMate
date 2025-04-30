import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './Menu.css';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './LandingPage';
import CarSelection from './CarSelection';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

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
  const [showCarSelection, setShowCarSelection] = useState(false);
  const [savedCar, setSavedCar] = useState(null);
  const chatBoxRef = useRef(null);
  const supabase = useSupabaseClient();
  const session = useSession();
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Check if user is logged in
    if (session?.user) {
      console.log("User is logged in:", session.user);
      
      // Load previously selected car from localStorage for immediate UI update
      const checkLastSelectedCar = () => {
        try {
          const lastSelectedCar = localStorage.getItem('lastSelectedCar');
          if (lastSelectedCar) {
            const car = JSON.parse(lastSelectedCar);
            console.log("Found car in localStorage:", car);
            setSavedCar(car);
            setCarDetails({
              make: car.make,
              model: car.model,
              year: car.year
            });
            setStep(4); // Skip to problem description
            return true;
          }
        } catch (error) {
          console.error('Error parsing localStorage car:', error);
        }
        return false;
      };
      
      // Try to load from localStorage first (faster)
      if (!checkLastSelectedCar()) {
        // No car in localStorage, check database
        const checkUserCars = async () => {
          try {
            const { data, error } = await supabase
              .from('cars')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false });
            
            if (error) {
              console.error('Error fetching cars:', error);
              setShowCarSelection(true);
              return;
            }
            
            if (data && data.length > 0) {
              // User has cars, auto-select most recent or show selection if multiple
              console.log("Found cars in database:", data);
              if (data.length === 1) {
                // Auto-select single car
                const car = data[0];
                setSavedCar(car);
                setCarDetails({
                  make: car.make,
                  model: car.model,
                  year: car.year
                });
                setStep(4); // Skip to problem description
                
                // Save to localStorage for faster loading next time
                localStorage.setItem('lastSelectedCar', JSON.stringify(car));
              } else {
                // Multiple cars, show selection
                setShowCarSelection(true);
              }
            } else {
              // No cars found, show car input flow
              console.log("No cars found for user");
              setShowCarSelection(true);
            }
          } catch (err) {
            console.error('Error checking user cars:', err);
            setShowCarSelection(true);
          }
        };
        
        checkUserCars();
      }
    }
  }, [session, supabase]);

  useEffect(() => {
    // Only show messages if we're not in car selection mode
    if (showCarSelection) {
      return; // Don't show welcome messages during car selection
    }
    
    // Only refresh messages if document becomes visible or savedCar changes
    // This prevents message reset when tabbing back to the app
    if (!isDocumentVisible) {
      return;
    }
    
    async function showInitialMessages() {
      // Reset messages first
      setMessages([]);
      setIsBotTyping(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (savedCar) {
        // User has a car, show personalized welcome
        const initialMessage = `Hello, I am AutoMate! I see you're working with your ${savedCar.year} ${savedCar.make} ${savedCar.model}. How can I help you with it today?`;
        setMessages([{ text: initialMessage, sender: 'bot' }]);
      } else if (step === 1) {
        // No car, starting fresh
        const initialMessage = 'Hello, I am AutoMate, I am here to help you with your car problems!';
        setMessages([{ text: initialMessage, sender: 'bot' }]);
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // Show the make question separately
        setMessages(prev => [...prev, { 
          text: 'What is the make of your car?', 
          sender: 'bot'
        }]);
      }
      
      setIsBotTyping(false);
    }
    
    showInitialMessages();
  }, [savedCar, showCarSelection, isDocumentVisible, step]);

  // Modify the car selection component rendering to appear only when needed
  useEffect(() => {
    if (session?.user && showCarSelection) {
      // Clear any existing messages when showing car selection
      setMessages([]);
    }
  }, [showCarSelection, session]);

  // Save car to database
  const saveCar = async (car) => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('cars')
        .insert([
          {
            user_id: session.user.id,
            make: car.make,
            model: car.model,
            year: car.year,
            // Optional fields
            nickname: car.nickname || null,
            created_at: new Date().toISOString()
          }
        ])
        .select();
        
      if (error) {
        console.error('Error saving car:', error);
        return null;
      }
      
      return data[0];
    } catch (error) {
      console.error('Failed to save car:', error);
      return null;
    }
  };

  // Handle car selection
  const handleCarSelect = (car) => {
    setSavedCar(car);
    setCarDetails({
      make: car.make,
      model: car.model,
      year: car.year
    });
    setStep(4);
    setShowCarSelection(false);
    // Save selection to localStorage
    localStorage.setItem('lastSelectedCar', JSON.stringify(car));
    
    // Add a welcome message
    setMessages([
      { 
        text: `Hello! I see you've selected your ${car.year} ${car.make} ${car.model}. How can I help you with it today?`, 
        sender: 'bot' 
      }
    ]);
  };

  // Handle adding a new car
  const handleAddNewCar = () => {
    setSavedCar(null);
    setCarDetails({
      make: '',
      model: '',
      year: ''
    });
    setStep(1);
    setShowCarSelection(false);
    localStorage.removeItem('lastSelectedCar');
    
    // Reset messages and start car input flow
    setMessages([
      { text: 'Hello, I am AutoMate, I am here to help you with your car problems!', sender: 'bot' },
      { text: 'What is the make of your car?', sender: 'bot' }
    ]);
  };

  // Reset chatbot
  const restartChat = () => {
    if (session?.user) {
      // For logged in users, show car selection
      setShowCarSelection(true);
    } else {
      // For anonymous users, reset to the beginning
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
    }
    setShowRestartConfirm(false);
  };

  // Improve the handleCarDetailInput function to prevent duplicates
  const handleCarDetailInput = async (value) => {
    if (!value.trim()) return;

    const userMsg = { text: value, sender: 'user' };
    
    // Update messages with user's input
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsBotTyping(true);
    
    // Short delay before bot response
    const typingDelay = 1000;

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
      const year = value.trim();
      setCarDetails({ ...carDetails, year });
      
      // If user is logged in, save this car
      if (session?.user) {
        const newCar = {
          make: carDetails.make,
          model: carDetails.model,
          year
        };
        
        const savedCarData = await saveCar(newCar);
        if (savedCarData) {
          setSavedCar(savedCarData);
          localStorage.setItem('lastSelectedCar', JSON.stringify(savedCarData));
        }
      }
      
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
    // Always use HTTP for the backend connection
    const apiUrl = 'http://localhost:5001/api/chat';

    try {
      // Await the API call first
      const response = await axios.post(apiUrl, {
        inputs: prompt
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
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
          {showCarSelection && session?.user ? (
            <CarSelection 
              userId={session.user.id}
              onCarSelect={handleCarSelect}
              onAddNewCar={handleAddNewCar}
            />
          ) : (
            <>
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
                            // Format REASON sections with numbers (1. REASON:, REASON 1:, etc.)
                            .replace(/(?:\n|^)(?:(\d+)\.?\s*)?REASON\s*(?:(\d+))?:?/gi, (match, num1, num2) => {
                              const number = num1 || num2 || '';
                              return `<div class="reason-section"><strong>REASON ${number}:</strong>`;
                            })
                            // Format EXPLANATION sections
                            .replace(/(?:\n|^)EXPLANATION:?/gi, '<br/><strong>EXPLANATION:</strong>')
                            // Format VIDEO sections
                            .replace(/(?:\n|^)VIDEO:?/gi, '<br/><strong>VIDEO:</strong>')
                            // Format links in VIDEO sections
                            .replace(/\[(.*?)\]\((https:\/\/www\.youtube\.com\/.*?)\)/g, '<div class="video-link"><a href="$2" target="_blank">▶️ $1</a></div>')
                            // Add proper closing div for reason sections that don't have YouTube links
                            .replace(/<strong>REASON.*?<\/strong>((?:(?!<div class="reason-section">).)*?)(?=<div class="reason-section">|$)/gs, '<strong>REASON:</strong>$1</div>')
                            // Replace remaining newlines with <br/>
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
                  {session?.user ? 'Change Car' : 'Restart'}
                </button>
              </div>
            </>
          )}
          {showRestartConfirm && (
            <div className="restart-confirm-modal">
              <div className="restart-confirm-box">
                <p>{session?.user ? 'Do you want to select a different car?' : 'Are you sure you want to restart the chat?'}</p>
                <div className="restart-confirm-buttons">
                  <button
                    type="button"
                    onClick={() => setShowRestartConfirm(false)}
                    className="restart-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={restartChat}
                    className="restart-confirm-btn"
                  >
                    {session?.user ? 'Select Car' : 'Restart'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {showHomeConfirm && (
            <div className="restart-confirm-modal">
              <div className="restart-confirm-box">
                <p>Are you sure you want to go back to the home page?</p>
                <div className="restart-confirm-buttons">
                  <button
                    type="button"
                    onClick={handleHomeCancel}
                    className="restart-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleHomeConfirm}
                    className="restart-confirm-btn"
                  >
                    Go to Home
                  </button>
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
