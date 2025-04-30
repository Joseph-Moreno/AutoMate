const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://localhost:3000', 'http://192.168.1.17:3000', 'https://192.168.1.17:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Update error handling to provide more detailed feedback
app.post('/api/chat', async (req, res) => {
  const prompt = req.body.inputs;
  console.log("Received prompt:", prompt);

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Extract car details from the prompt (assuming format "I have a [make] [model] [year]...")
  let carDetails = { make: "unknown", model: "unknown", year: "unknown" };
  const carMatch = prompt.match(/I have a ([A-Za-z]+) ([A-Za-z0-9]+) ([0-9]{4})/i);
  if (carMatch && carMatch.length >= 4) {
    carDetails = {
      make: carMatch[1],
      model: carMatch[2],
      year: carMatch[3]
    };
  }
  console.log("Extracted car details:", carDetails);

  // Verify API key is present
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is missing');
    return res.status(500).json({ error: 'OpenAI API key is not configured' });
  }

  try {
    console.log("Making request to OpenAI...");
    console.log("Request payload:", {
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `You are an automotive diagnostic assistant. For a ${carDetails.year} ${carDetails.make} ${carDetails.model} with the described issue, provide exactly 3 possible causes in this format:

1. REASON: [First possible cause]
EXPLANATION: [Brief explanation of this cause]
VIDEO: [How to Fix {specific issue} in a ${carDetails.year} ${carDetails.make} ${carDetails.model}](https://www.youtube.com/results?search_query=${carDetails.year}+${carDetails.make}+${carDetails.model}+{specific issue})

2. REASON: [Second possible cause]
EXPLANATION: [Brief explanation of this cause]
VIDEO: [${carDetails.make} ${carDetails.model} {issue} Repair Guide](https://www.youtube.com/results?search_query=${carDetails.year}+${carDetails.make}+${carDetails.model}+{issue}+repair+guide)

3. REASON: [Third possible cause]
EXPLANATION: [Brief explanation of this cause]
VIDEO: [DIY ${carDetails.make} ${carDetails.model} {problem} Fix](https://www.youtube.com/results?search_query=${carDetails.year}+${carDetails.make}+${carDetails.model}+{problem}+DIY+fix)

Always use the exact format above with the numbered reasons. Replace {specific issue}, {issue}, and {problem} with specific keywords related to that particular cause. Use proper URL encoding for spaces and special characters in the search URLs.`
        },
        { role: 'user', content: prompt }
      ]
    });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are an automotive diagnostic assistant. For a ${carDetails.year} ${carDetails.make} ${carDetails.model} with the described issue, provide exactly 3 possible causes in this format:

1. REASON: [First possible cause]
EXPLANATION: [Brief explanation of this cause]
VIDEO: [How to Fix {specific issue} in a ${carDetails.year} ${carDetails.make} ${carDetails.model}](https://www.youtube.com/results?search_query=${carDetails.year}+${carDetails.make}+${carDetails.model}+{specific issue})

2. REASON: [Second possible cause]
EXPLANATION: [Brief explanation of this cause]
VIDEO: [${carDetails.make} ${carDetails.model} {issue} Repair Guide](https://www.youtube.com/results?search_query=${carDetails.year}+${carDetails.make}+${carDetails.model}+{issue}+repair+guide)

3. REASON: [Third possible cause]
EXPLANATION: [Brief explanation of this cause]
VIDEO: [DIY ${carDetails.make} ${carDetails.model} {problem} Fix](https://www.youtube.com/results?search_query=${carDetails.year}+${carDetails.make}+${carDetails.model}+{problem}+DIY+fix)

Always use the exact format above with the numbered reasons. Replace {specific issue}, {issue}, and {problem} with specific keywords related to that particular cause. Use proper URL encoding for spaces and special characters in the search URLs.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log("Received OpenAI response:", response.data);
    const output = response.data.choices[0].message.content;
    res.json({ message: output });

  } catch (err) {
    console.error('Full error object:', err);
    
    if (err.code === 'ECONNREFUSED') {
      return res.status(500).json({ error: 'Could not connect to OpenAI API. Please check your internet connection.' });
    }
    
    if (err.response?.status === 401) {
      return res.status(500).json({ error: 'Invalid OpenAI API key. Please check your configuration.' });
    }

    if (err.response?.status === 429) {
      return res.status(500).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error occurred';
    res.status(500).json({ error: `Error: ${errorMessage}` });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('CORS enabled for:', ['http://localhost:3000', 'https://localhost:3000', 'http://192.168.1.17:3000', 'https://192.168.1.17:3000']);
});