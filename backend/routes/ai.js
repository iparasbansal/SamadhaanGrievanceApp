const express = require('express');
const router = express.Router();

const ALL_CATEGORIES = [
  'Roads & Infrastructure',
  'Water Supply',
  'Electricity',
  'Waste Management',
  'Public Safety',
  'Emergency Services',
  'Other',
];

const AI_DEPARTMENT_MAPPING = {
  Roads: 'Roads & Infrastructure',
  Infrastructure: 'Roads & Infrastructure',
  'Roads & Infrastructure': 'Roads & Infrastructure',
  Water: 'Water Supply',
  'Water Supply': 'Water Supply',
  Electricity: 'Electricity',
  Power: 'Electricity',
  Waste: 'Waste Management',
  Sanitation: 'Waste Management',
  Garbage: 'Waste Management',
  'Waste Management': 'Waste Management',
  'Public Safety': 'Public Safety',
  Safety: 'Public Safety',
  'Law and Order': 'Public Safety',
  Emergency: 'Emergency Services',
  'Emergency Services': 'Emergency Services',
  'Fire Department': 'Emergency Services',
  Other: 'Other',
  Unassigned: 'Other',
};

const KEYWORD_RULES = [
  {
    category: 'Emergency Services',
    words: ['fire', 'ambulance', 'accident', 'collapse', 'medical emergency', 'rescue', 'flood', 'gas leak'],
  },
  {
    category: 'Public Safety',
    words: ['crime', 'theft', 'violence', 'harassment', 'street light broken', 'unsafe', 'police', 'security'],
  },
  {
    category: 'Water Supply',
    words: ['water', 'pipeline', 'pipe leak', 'sewage overflow', 'drain overflow', 'no supply', 'contaminated'],
  },
  {
    category: 'Electricity',
    words: ['electricity', 'power', 'transformer', 'wire', 'voltage', 'outage', 'streetlight'],
  },
  {
    category: 'Waste Management',
    words: ['garbage', 'waste', 'trash', 'dump', 'sanitation', 'dirty', 'cleaning', 'sweeper'],
  },
  {
    category: 'Roads & Infrastructure',
    words: ['road', 'pothole', 'footpath', 'bridge', 'traffic signal', 'drain', 'construction', 'street'],
  },
];

const PRIORITY_RULES = [
  { priority: 'Critical', words: ['fire', 'accident', 'collapse', 'gas leak', 'electrocution', 'medical emergency', 'danger'] },
  { priority: 'High', words: ['unsafe', 'overflow', 'contaminated', 'major', 'blocked', 'outage', 'leak'] },
  { priority: 'Medium', words: ['broken', 'damaged', 'delay', 'not working', 'dirty'] },
];

function normalizeCategory(category) {
  const mapped = AI_DEPARTMENT_MAPPING[category] || category;
  return ALL_CATEGORIES.includes(mapped) ? mapped : 'Other';
}

function pickByKeywords(text, rules, fallback) {
  const lowerText = text.toLowerCase();
  return rules.find((rule) => rule.words.some((word) => lowerText.includes(word)))?.category ||
    rules.find((rule) => rule.words.some((word) => lowerText.includes(word)))?.priority ||
    fallback;
}

function buildFallbackAnalysis(title, description) {
  const text = `${title} ${description}`;
  const category = pickByKeywords(text, KEYWORD_RULES, 'Other');
  const aiPriority = pickByKeywords(text, PRIORITY_RULES, 'Low');
  const shortDescription = description.trim().replace(/\s+/g, ' ').slice(0, 150);

  return {
    aiPriority,
    category,
    summary: `${category} issue reported: ${shortDescription}${description.length > 150 ? '...' : ''}`,
    analysisSource: 'local-rules',
  };
}

function parseJsonFromModel(text) {
  if (!text) throw new Error('Empty AI response');
  const cleaned = text.replace(/```json/i, '').replace(/```/g, '').trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('AI response did not contain JSON');
  return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
}

/**
 * Retries a fetch request with exponential backoff.
 */
async function fetchWithBackoff(url, options, retries = 5, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.warn(`⚠️ Gemini rate limit hit. Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
        return fetchWithBackoff(url, options, retries - 1, delay * 2);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      console.warn(`⚠️ Network error: ${error.message}. Retrying in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * @route   POST /api/ai/analyze
 * @desc    Analyze grievance with Gemini AI (backend-side, key is hidden)
 * @access  Public
 */
router.post('/analyze', async (req, res) => {
  try {
    const { title, description } = req.body;

    // Input validation
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    if (title.length < 5 || title.length > 200) {
      return res.status(400).json({ error: 'Title must be 5-200 characters' });
    }

    if (description.length < 10 || description.length > 2000) {
      return res.status(400).json({ error: 'Description must be 10-2000 characters' });
    }

    const fallbackAnalysis = buildFallbackAnalysis(title, description);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json(fallbackAnalysis);
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const validDepartments = ALL_CATEGORIES.join(', ');

    const systemPrompt = `
You are an AI assistant for a public grievance portal.
Analyze the grievance based on the title and description.

Decide and return:
1️⃣ **aiPriority** — one of: "Critical", "High", "Medium", or "Low".
2️⃣ **category** — the department that should handle it. MUST be one of the following exact strings: ${validDepartments}. If the issue doesn't clearly fit, use "Other".
3️⃣ **summary** — a short 1–2 sentence natural-language summary (20–30 words) describing the main issue and urgency clearly.

⚠️ Always return valid JSON only.
`;

    const userQuery = `
Grievance Title: "${title}"
Grievance Description: "${description}"

Return valid JSON ONLY like:
{
  "aiPriority": "Critical" | "High" | "Medium" | "Low",
  "category": "Roads & Infrastructure" | "Water Supply" | "Electricity" | "Waste Management" | "Public Safety" | "Emergency Services" | "Other",
  "summary": "Short AI-written summary"
}
`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userQuery}` }],
        },
      ],
    };

    const data = await fetchWithBackoff(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const parsed = parseJsonFromModel(rawText);
    console.log('✅ AI Response:', parsed);

    const validatedCategory = normalizeCategory(parsed.category);
    const validatedPriority = ['Critical', 'High', 'Medium', 'Low'].includes(parsed.aiPriority)
      ? parsed.aiPriority
      : fallbackAnalysis.aiPriority;

    return res.json({
      aiPriority: validatedPriority,
      category: validatedCategory,
      summary: parsed.summary || fallbackAnalysis.summary,
      analysisSource: 'gemini',
    });
  } catch (error) {
    console.error('❌ AI Analysis failed:', error.message);
    const { title, description } = req.body;
    return res.json(buildFallbackAnalysis(title || '', description || ''));
  }
});

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with Gemini AI (multi-turn conversation with grievance context)
 * @access  Public
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, userContext } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        reply: "Hello! The AI service is currently unavailable as the API key is not configured. How else can I assist you today?"
      });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Construct user contexts
    let contextStr = '';
    if (userContext && Array.isArray(userContext) && userContext.length > 0) {
      contextStr = `Here are the citizen's currently filed municipal complaints:\n` +
        userContext.map((g, idx) => `${idx + 1}. Title: "${g.title}", Status: "${g.status}", Category: "${g.category}", Priority: "${g.aiPriority || 'Unknown'}", Date filed: ${g.createdAt ? new Date(g.createdAt).toLocaleDateString() : 'recent'}`).join('\n') +
        `\nRefer to this list to answer status questions.`;
    } else {
      contextStr = `The citizen has not filed any complaints yet.`;
    }

    const systemPrompt = `
You are **Samadhaan AI**, the official virtual assistant for the Samadhaan Grievance Portal.
Your purpose is to help citizens file complaints, track the status of existing complaints, and answer questions about municipal services (like roads, electricity, waste, public safety, water, emergency).

Rules:
1. Be polite, clear, and concise. Emojis (⚡, 📍, 🏢, 🥇, 🛠️) are encouraged.
2. If the user asks about the status of their complaints, use the following real-time context to answer:
---
${contextStr}
---
3. If they describe a new issue, summarize it and guide them to file it using the "New case" button in the navigation bar.
4. Keep formatting clean with simple bullet points. Use standard Markdown.
`;

    // Map frontend messages history to Gemini's expected contents structure
    // Gemini roles: "user" | "model"
    const contents = [];

    // First, feed system instructions
    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\nUnderstood. I will act as Samadhaan AI.` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: `Thank you. I am ready to assist citizens as Samadhaan AI. How can I help you today?` }]
    });

    // Now, push history
    messages.forEach((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      contents.push({
        role: role,
        parts: [{ text: msg.content }]
      });
    });

    const payload = {
      contents
    };

    const data = await fetchWithBackoff(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "I'm sorry, I couldn't process that response. Please try again.";
    
    return res.json({ reply: rawReply });
  } catch (error) {
    console.error('❌ AI Chat failed:', error.message);
    return res.status(500).json({ error: 'Chat service failed to respond. Please try again.' });
  }
});

module.exports = router;
