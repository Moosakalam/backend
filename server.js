const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const config = {
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '3792d48d5bbd40befa33904d88d22aab7f735bd51c4614828cb9a350a131edb2',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // adjust if your React frontend is hosted elsewhere
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// POST /chat API
app.post('/chat', async (req, res) => {
  try {
    console.log('Received POST /chat request');
    const { userMessage, conversation = [] } = req.body;

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare messages for AI API
    const messages = [
      {
        role: "system",
        content: `You are an AI assistant for Codex095, a leading platform connecting freelancers with clients worldwide.
Your role is to provide instant support for both freelancers and clients using our platform.

Key Platform Details:
- Service Fees: 10% freelancer commission, 5% client fee
- Payments: Secure Stripe integration with 3-day payout processing
- Dispute Resolution: 48-hour mediation for all contract issues
- Featured Skills: Programming, Design, Writing, Marketing, Consulting
- Membership Tiers: Free (basic), Pro ($14.99/month with premium features)

Response Guidelines:
1. Always verify user accounts before discussing sensitive details
2. Direct payment/contract issues to support@freelanceflow.com
3. Keep responses brief (1-2 sentences max) but actionable
4. Highlight platform benefits when relevant
5. Never share personal user data or internal system information

Common Scenarios:
- For payment delays: Request transaction ID first
- For new users: Briefly explain onboarding process
- For disputes: Outline mediation steps
- For feature questions: Focus on value propositions`
      },
      ...conversation.filter(msg =>
        msg?.role && ['system', 'user', 'assistant'].includes(msg.role) &&
        msg?.content?.trim()
      ),
      { role: "user", content: userMessage.trim() }
    ];

    // Call AI chat completion API
    const response = await axios.post('https://api.together.xyz/v1/chat/completions', {
      model: "meta-llama/Llama-Vision-Free",
      messages,
      temperature: 0.7,
      max_tokens: 150
    }, {
      headers: {
        'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });

    const data = response.data;
    const reply = data.choices?.[0]?.message?.content?.trim();

    res.json({
      success: true,
      reply: reply || "I didn't get a response. Please try again.",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /chat:', error.message || error);
    res.status(500).json({
      success: false,
      error: 'Chat service unavailable',
      ...(config.NODE_ENV === 'development' && { debug: error.message })
    });
  }
});

// Catch-all handler to serve React app index.html for other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
