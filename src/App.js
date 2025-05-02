import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './Menu.css';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './LandingPage';
import CarSelection from './CarSelection';
import Login from './Login';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

console.log(process.env.REACT_APP_GOOGLE_CLIENT_ID);


function AppInner() {
  const [messages, setMessages] = useState(() => {
    // Try to load messages from localStorage when component mounts
    try {
      const savedMessages = localStorage.getItem('chatMessages');
      return savedMessages ? JSON.parse(savedMessages) : [];
    } catch (error) {
      console.error('Error loading saved messages:', error);
      return [];
    }
  });

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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const chatBoxRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const supabase = useSupabaseClient();
  const session = useSession();
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Save messages to localStorage whenever they change
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsDocumentVisible(isVisible);
      // Don't reset messages or do anything that would clear the chat
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const checkUserStatus = async () => {
      if (session?.user) {
        console.log("User is logged in:", session.user);
        
        // Check if there's a pending car save from the sign-in process
        const pendingCarSave = localStorage.getItem('pendingCarSave');
        if (pendingCarSave) {
          try {
            const carData = JSON.parse(pendingCarSave);
            
            // Before saving, check if user is at the car limit
            const atLimit = await checkCarLimit(session.user.id);
            if (atLimit) {
              console.error('Cannot save car: User at maximum vehicle limit');
              localStorage.removeItem('pendingCarSave');
              
              // Notify the user
              setMessages([
                { 
                  text: "I couldn't save your car details because you've reached the maximum number of vehicles allowed (5). You can delete existing vehicles from the car selection screen.",
                  sender: 'bot' 
                }
              ]);
              return;
            }
            
            // Save the car to the user's account
            saveCar(carData).then(savedCarData => {
              if (savedCarData) {
                // Update UI with the saved car
                setSavedCar(savedCarData);
                setCarDetails({
                  make: savedCarData.make,
                  model: savedCarData.model,
                  year: savedCarData.year
                });
                setStep(4); // Skip to problem description
                
                // Store as last selected car
                localStorage.setItem('lastSelectedCar', JSON.stringify(savedCarData));
                // Clear the pending save
                localStorage.removeItem('pendingCarSave');
                // Clear the temp car info
                localStorage.removeItem('tempCarInfo');
                // Set flag to show special welcome message
                localStorage.setItem('justTransferredCar', 'true');
                
                console.log("Successfully transferred temporary car to user account:", savedCarData);
              }
            });
            // Continue with the regular flow to check for other cars
          } catch (error) {
            console.error('Error processing pending car save:', error);
            localStorage.removeItem('pendingCarSave');
          }
        }
        
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
      } else {
        // For non-authenticated users, check if they have temporarily saved car info
        try {
          const tempCarInfo = localStorage.getItem('tempCarInfo');
          if (tempCarInfo) {
            const car = JSON.parse(tempCarInfo);
            setCarDetails({
              make: car.make,
              model: car.model,
              year: car.year
            });
            setSavedCar(car); // Use savedCar for temporary car too
            setStep(4); // Skip to problem description
          }
        } catch (error) {
          console.error('Error retrieving temporary car info:', error);
          // Simply continue with normal flow if error
        }
      }
    };
    
    checkUserStatus();
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
      // Only show welcome messages if there are no existing messages
      if (messages.length === 0) {
        setIsBotTyping(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        if (savedCar) {
          // Check if this was a car transfer from a non-authenticated session
          const wasPendingCarSave = localStorage.getItem('justTransferredCar') === 'true';
          
          // User has a car, show personalized welcome
          let initialMessage = `Hello, I am AutoMate! I see you're working with your ${savedCar.year} ${savedCar.make} ${savedCar.model}. How can I help you with it today?`;
          
          // If this was a transfer, add a special message
          if (wasPendingCarSave) {
            initialMessage = `Welcome back! I've saved your ${savedCar.year} ${savedCar.make} ${savedCar.model} to your account. How can I help you with it today?`;
            localStorage.removeItem('justTransferredCar');
          }
          
          setMessages([{ text: initialMessage, sender: 'bot' }]);
        } else if (step === 1) {
          // No car, starting fresh - show welcome and question in one update to prevent duplicates
          setMessages([
            { text: 'Hello, I am AutoMate, I am here to help you with your car problems!', sender: 'bot' },
            { text: 'What is the make of your car?', sender: 'bot' }
          ]);
        }
        
        setIsBotTyping(false);
      }
    }
    
    showInitialMessages();
  }, [savedCar, showCarSelection, isDocumentVisible, step, messages.length]);

  // Modify the car selection component rendering to appear only when needed
  useEffect(() => {
    if (session?.user && showCarSelection) {
      // Clear any existing messages when showing car selection
      setMessages([]);
    }
  }, [showCarSelection, session]);

  // Save car to database
  const saveCar = async (car) => {
    if (!session?.user) {
      console.error('Cannot save car: No user session');
      return null;
    }
    
    console.log('Attempting to save car to user account:', car);
    
    // Check if user is at car limit first
    const atLimit = await checkCarLimit(session.user.id);
    if (atLimit) {
      console.error('Cannot save car: User at maximum vehicle limit');
      return null;
    }
    
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
        console.error('Error saving car to database:', error);
        return null;
      }
      
      console.log('Car successfully saved to database:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Exception saving car to database:', error);
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
    // Check if user is at car limit first
    if (session?.user) {
      checkCarLimit(session.user.id).then(atLimit => {
        if (atLimit) {
          // Show a message that they're at the limit
          setMessages([
            { 
              text: "You've reached the maximum number of vehicles allowed (5). Please delete an existing vehicle before adding a new one.",
              sender: 'bot' 
            }
          ]);
          return;
        } else {
          // Proceed with adding a new car
          // Clear car details
          setSavedCar(null);
          setCarDetails({
            make: '',
            model: '',
            year: ''
          });
          setStep(1);
          setShowCarSelection(false);
          localStorage.removeItem('lastSelectedCar');
          
          // Add a "new car" indicator for the conversation flow
          const isExistingUser = session?.user && messages.length > 0;
          
          // Reset messages and start car input flow
          setMessages([
            { text: 'Hello, I am AutoMate, I am here to help you with your car problems!', sender: 'bot' },
            { 
              text: isExistingUser 
                ? 'Let\'s add information about your new vehicle. What is the make of your car?' 
                : 'What is the make of your car?', 
              sender: 'bot' 
            }
          ]);
        }
      });
    } else {
      // Non-logged in users have no limit
      // Clear car details
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
    }
  };

  // Check if user is at car limit
  const checkCarLimit = async (userId) => {
    try {
      const { data, error, count } = await supabase
        .from('cars')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error checking car count:', error);
        return false; // Assume not at limit if error
      }
      
      return (data?.length || 0) >= 5; // Maximum 5 cars per user
    } catch (error) {
      console.error('Failed to check car limit:', error);
      return false; // Assume not at limit if error
    }
  };

  // Update car handling for non-authenticated users
  const handleCarDetailInput = async (value) => {
    if (!value.trim()) return;

    const userMsg = { text: value, sender: 'user' };
    
    // Update messages with user's input
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsBotTyping(true);
    
    // Short delay before bot response
    const typingDelay = 1000;
    let updatedCarDetails = {...carDetails};

    let botMsg = null;
    if (step === 1) {
      updatedCarDetails.make = value;
      botMsg = { text: `What is the model of your ${value}?`, sender: 'bot' };
      setStep(2);
    } else if (step === 2) {
      updatedCarDetails.model = value;
      botMsg = { text: `What is the year of your ${carDetails.make} ${value}?`, sender: 'bot' };
      setStep(3);
    } else if (step === 3) {
      const year = value.trim();
      updatedCarDetails.year = year;
      
      // If user is logged in, save this car to database
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
      } else {
        // For non-authenticated users, save to localStorage temporarily
        const tempCar = {
          make: carDetails.make,
          model: carDetails.model,
          year: year
        };
        localStorage.setItem('tempCarInfo', JSON.stringify(tempCar));
        setSavedCar(tempCar);
        
        // Always show login prompt when entering car info
        setShowLoginPrompt(true);
        
        // Auto-hide the prompt after 15 seconds
        setTimeout(() => {
          setShowLoginPrompt(false);
        }, 15000);
      }
      
      botMsg = { text: 'Describe the problem with your car...', sender: 'bot' };
      setStep(4);
    }
    
    setCarDetails(updatedCarDetails);
    
    if (botMsg) {
      await new Promise((resolve) => setTimeout(resolve, typingDelay));
      setMessages((prev) => [...prev, botMsg]);
    }
    
    setIsBotTyping(false);
  };

  // Show sign-in prompt or confirm dialog for changing car
  const handleRestartClick = () => {
    // Close the settings menu
    setShowSettingsMenu(false);
    
    if (session?.user) {
      // For logged in users, show confirmation dialog
      setShowRestartConfirm(true);
    } else {
      // For non-logged in users, show login prompt first
      setShowLoginPrompt(true);
      
      // Set a flag to indicate this is for changing car
      localStorage.setItem('changingCar', 'true');
    }
  };

  // Modify restart for both user types
  const restartChat = () => {
    if (session?.user) {
      // For logged in users, show car selection UI
      setShowCarSelection(true);
      // Clear any existing messages while browsing cars
      setMessages([]);
      // Clear saved messages
      localStorage.removeItem('chatMessages');
    } else {
      // For non-authenticated users, restart the car input flow
      localStorage.removeItem('tempCarInfo');
      localStorage.removeItem('loginPromptShown'); // Reset this so they see login prompt again
      setSavedCar(null);
      
      // Show the initial car info input flow
      setMessages([
        { text: 'Hello, I am AutoMate, I am here to help you with your car problems!', sender: 'bot' },
        { text: 'What is the make of your car?', sender: 'bot' }
      ]);
      
      setInput('');
      setStep(1);
      setCarDetails({ make: '', model: '', year: '' });
      setIsBotTyping(false);
    }
    setShowRestartConfirm(false);
    setShowSettingsMenu(false);
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

  // Handle click outside for settings menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add login prompt handling
  const handleLoginPromptClose = () => {
    setShowLoginPrompt(false);
    
    // Check if this was from changing car
    if (localStorage.getItem('changingCar') === 'true') {
      // Clear the flag
      localStorage.removeItem('changingCar');
      
      // User chose to continue without account, so restart the chat
      restartChatWithoutConfirm();
    }
  };

  const handleLoginRedirect = () => {
    setShowLoginPrompt(false);
    
    // Clear the changingCar flag if it exists
    localStorage.removeItem('changingCar');
    
    // Redirect to home page to login
    // Instead, use the same Google sign-in as the Login component
    googleSignIn();
  };

  // Add the Google sign-in function
  async function googleSignIn() {
    try {
      // Store the car info before auth to ensure we can access it later
      const tempCarInfo = localStorage.getItem('tempCarInfo');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + '/chat',
        },
      });
      
      if (error) {
        console.error("Error signing in:", error);
      } else if (tempCarInfo) {
        // We need to store this information to transfer the car after login
        // We can't save it right away because the auth is redirecting
        // The car will be saved when the user comes back after auth
        localStorage.setItem('pendingCarSave', tempCarInfo);
      }
    } catch (err) {
      console.error("Error during sign in:", err);
    }
  }

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
  };
  
  const handleSettingsToggle = (e) => {
    e.stopPropagation();
    setShowSettingsMenu(!showSettingsMenu);
    // Close other menus
    setShowUserMenu(false);
  };
  
  // Function to reset chat but keep the same car
  const resetChat = () => {
    setMessages([]);
    setInput('');
    localStorage.removeItem('chatMessages');
    setIsBotTyping(true);
    
    // Using setTimeout to simulate typing delay
    setTimeout(() => {
      if (savedCar) {
        // User has a car, show personalized welcome
        let initialMessage = `Hello, I am AutoMate! I'm ready to help you with your ${savedCar.year} ${savedCar.make} ${savedCar.model}. How can I help you with it today?`;
        
        // Add warning for non-logged-in users
        if (!session?.user) {
          initialMessage = `Hello, I am AutoMate! I'm ready to help you with your ${savedCar.year} ${savedCar.make} ${savedCar.model}. Remember, without an account your car data will be lost if you restart. How can I help you today?`;
        }
        
        setMessages([{ text: initialMessage, sender: 'bot' }]);
      } else {
        // No car info - should not normally happen when resetting
        setMessages([
          { text: 'Hello, I am AutoMate, I am here to help you with your car problems!', sender: 'bot' },
          { text: 'What is the make of your car?', sender: 'bot' }
        ]);
        setStep(1);
      }
      setIsBotTyping(false);
      setShowSettingsMenu(false);
    }, 1500);
  };
  
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        // Clear any local car data
        localStorage.removeItem('lastSelectedCar');
        localStorage.removeItem('tempCarInfo');
        localStorage.removeItem('chatMessages');
        setShowUserMenu(false);
        // Redirect to home
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // A version of restartChat that doesn't require confirmation
  const restartChatWithoutConfirm = () => {
    if (session?.user) {
      // For logged in users, show car selection UI
      setShowCarSelection(true);
      // Clear any existing messages while browsing cars
      setMessages([]);
      // Clear saved messages
      localStorage.removeItem('chatMessages');
    } else {
      // For non-authenticated users, restart the car input flow
      localStorage.removeItem('tempCarInfo');
      localStorage.removeItem('loginPromptShown');
      setSavedCar(null);
      
      // Show the initial car info input flow
      setMessages([
        { text: 'Hello, I am AutoMate, I am here to help you with your car problems!', sender: 'bot' },
        { text: 'What is the make of your car?', sender: 'bot' }
      ]);
      
      setInput('');
      setStep(1);
      setCarDetails({ make: '', model: '', year: '' });
      setIsBotTyping(false);
    }
  };

  return (
    <div className="chat-app-layout">
      {!menuOpen && (
        <div
          className="menu-toggle-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          title={menuOpen ? 'Hide menu' : 'Show menu'}
        >
          <div className="menu-bar" />
          <div className="menu-bar" />
          <div className="menu-bar" />
        </div>
      )}
      <SideMenu isOpen={menuOpen} onToggle={() => setMenuOpen((open) => !open)} onHomeClick={handleHomeClick} />
      <div className={`App chat-centered${menuOpen ? '' : ' menu-hidden'}`}> 
        <header className="app-header">
          <div className="app-title-bubble" onClick={handleHomeClick} title="Go to Home">
            AutoMate
            <img src={require('./automateiconnew.png')} alt="AutoMate Icon" className="automate-icon app-title-large-icon" />
          </div>
          <div className="header-right" style={{ right: '15px' }}>
            {!session?.user ? (
              <Login />
            ) : (
              <div className="user-profile-container">
                <div className="user-profile-mini" onClick={handleUserMenuToggle}>
                  {session.user.user_metadata?.avatar_url ? (
                    <img 
                      src={session.user.user_metadata.avatar_url} 
                      alt={session.user.user_metadata.full_name || session.user.email} 
                      className="user-avatar-mini" 
                    />
                  ) : (
                    <div className="user-initial">
                      {(session.user.user_metadata?.full_name || session.user.email || '').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="user-name-mini">{session.user.user_metadata?.full_name || session.user.email}</span>
                </div>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-info">
                      <p className="user-name">{session.user.user_metadata?.full_name || session.user.email}</p>
                      <p className="user-email">{session.user.email}</p>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button className="sign-out-button" onClick={handleSignOut}>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
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
                  title="Send message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
                <div className="settings-container" ref={settingsMenuRef}>
                  <button
                    type="button"
                    className="settings-btn"
                    onClick={handleSettingsToggle}
                    title="Open menu for more options"
                  >
                    More
                  </button>
                  {showSettingsMenu && (
                    <div className="settings-menu">
                      {session?.user ? (
                        <>
                          <button onClick={handleRestartClick} className="settings-menu-item">
                            <span className="settings-icon">🚗</span>
                            <span>Change Car</span>
                          </button>
                          <button onClick={resetChat} className="settings-menu-item">
                            <span className="settings-icon">🔄</span>
                            <span>Reset Chat</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={handleRestartClick} className="settings-menu-item">
                            <span className="settings-icon">🚗</span>
                            <span>Change Car</span>
                          </button>
                          <button onClick={resetChat} className="settings-menu-item">
                            <span className="settings-icon">🔄</span>
                            <span>Reset Chat</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {showRestartConfirm && (
            <div className="restart-confirm-modal">
              <div className="restart-confirm-box">
                <p>{session?.user ? 'Do you want to select a different car?' : 'Do you want to enter new car information? You\'ll need to start over.'}</p>
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
                    Change Car
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
          {showLoginPrompt && (
            <div className="login-prompt-modal">
              <div className="login-prompt-box">
                <button className="close-btn" onClick={handleLoginPromptClose}>×</button>
                {localStorage.getItem('changingCar') === 'true' ? (
                  <p>To save your current car information when changing cars, please sign in with Google. If you continue without signing in, you'll need to re-enter your car details.</p>
                ) : (
                  <p>Sign in to save your car details! Without an account, you'll lose your car info when changing cars.</p>
                )}
                <div className="login-prompt-buttons">
                  <button
                    type="button"
                    onClick={handleLoginRedirect}
                    className="login-now-btn"
                  >
                    Sign in with<br />Google
                  </button>
                  <button
                    type="button"
                    onClick={handleLoginPromptClose}
                    className="continue-btn"
                  >
                    {localStorage.getItem('changingCar') === 'true' ? 'Continue & Reset' : 'Continue without account'}
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
      {isOpen && (
        <nav className="side-menu">
          <div className="menu-close-btn" onClick={onToggle} title="Close menu">
            <span className="close-x">×</span>
          </div>
          <div className="menu-title">Menu</div>
          <ul>
            <li><a href="/" onClick={onHomeClick}>Home</a></li>
            <li><a href="/chat">Chat</a></li>
            <li><a href="https://eliashannoncalculator.cikeys.com/Automate/index.php" target="_blank" rel="noopener noreferrer">About</a></li>
          </ul>
        </nav>
      )}
    </>
  );
}

export default App;
