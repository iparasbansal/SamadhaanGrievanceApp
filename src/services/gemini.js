import { request } from './api.js';

/**
 * 🧠 Analyzes the grievance using Gemini AI (via backend)
 */
export async function analyzeGrievanceWithAI(title, description) {
  try {
    const result = await request('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });

    return {
      aiPriority: result.aiPriority || 'Low',
      category: result.category || 'Other',
      summary: result.summary || 'No summary available.',
    };
  } catch (error) {
    console.error('❌ AI Analysis failed:', error.message);
    throw new Error('AI analysis failed. Please try again.');
  }
}
