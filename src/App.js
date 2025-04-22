import { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(1);
  const [carDetails, setCarDetails] = useState({
    make: '',
    model: '',
    year: ''
  });
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Show initial bot message on load
  useEffect(() => {
    setMessages([{ text: 'What is the make of your car?', sender: 'bot' }]);
  }, []);

  // Reset chatbot
  const restartChat = () => {
    setMessages([{ text: 'What is the make of your car?', sender: 'bot' }]);
    setInput('');
    setStep(1);
    setCarDetails({ make: '', model: '', year: '' });
    setIsBotTyping(false);
  };

  const handleCarDetailInput = (value) => {
    if (!value.trim()) return;

    const userMsg = { text: value, sender: 'user' };

    if (step === 1) {
      setCarDetails({ ...carDetails, make: value });
      setMessages((prev) => [
        ...prev,
        userMsg,
        { text: `What is the model of your ${value}?`, sender: 'bot' }
      ]);
      setStep(2);
    } else if (step === 2) {
      setCarDetails({ ...carDetails, model: value });
      setMessages((prev) => [
        ...prev,
        userMsg,
        { text: `What is the year of your ${carDetails.make} ${value}?`, sender: 'bot' }
      ]);
      setStep(3);
    } else if (step === 3) {
      setCarDetails({ ...carDetails, year: value });
      setMessages((prev) => [
        ...prev,
        userMsg,
        { text: 'Describe the problem with your car...', sender: 'bot' }
      ]);
      setStep(4);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsBotTyping(true);

    const prompt = `You are an automotive diagnostic assistant. 
    Give the top 3 most likely causes and solutions for a ${carDetails.make} ${carDetails.model} ${carDetails.year} where the user says: "${input}". 
    Be specific and concise. Do not repeat the user’s message. Use bullet points and number each cause.`;

    console.log("Sending prompt:", prompt);

    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
        inputs: prompt
      });

      // Check if the response is successful
      console.log('Response from backend:', response);
      const botMessage = response.data.message || 'Sorry, something went wrong.';
      setMessages((prev) => [...prev, { text: botMessage, sender: 'bot' }]);
    } catch (error) {
      console.error('Error calling Open AI API:', error.response?.data || error.message);
      setMessages((prev) => [
        ...prev,
        { text: 'Sorry, something went wrong. Please try again.', sender: 'bot' },
      ]);
    } finally {
      setIsBotTyping(false);
    }
  };

  return (
    <div className="App">
      <h1>AutoMate</h1>
      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender}`}>
            <strong>{msg.sender === 'user' ? 'You' : 'AutoMate'}:</strong> {msg.text}
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
        >
          Send
        </button>
      </div>

      <div className="restart-button">
        <button onClick={restartChat}>Restart Chat</button>
      </div>
    </div>
  );
}

export default App;
