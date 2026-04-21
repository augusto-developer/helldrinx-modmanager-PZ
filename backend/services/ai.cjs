const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * 🔗 GeminiService: The Intelligence behind HellDrinx Diagnosis
 * This service handles communication with Google's Gemini models.
 */
class GeminiService {
  constructor(apiKey) {
    if (!apiKey) throw new Error('Gemini API Key is required');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateDiagnosis(instructions, context) {
    try {
      const prompt = `
[SYSTEM INSTRUCTIONS]
${instructions || "You are an expert Project Zomboid modder and technician."}

[CONFLICT CONTEXT]
${context}

[OUTPUT REQUIREMENTS]
- Give the diagnosis a clear title starting with an emoji (e.g., 🧊 Diagnosis: ...).
- Explain WHY the conflict happened in simple terms.
- Be encouraging and use friendly emojis (😸, 🛠️, 🛡️).
- Clearly state if it's "CRITICAL" or "HARMLESS".
- Provide step-by-step fix/merge instructions or state if no action is needed.
- Keep it concise but professional.
- Do NOT use technical jargon without explaining it.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('[GeminiService] Error:', error);
      throw new Error('Failed to generate AI diagnosis: ' + error.message);
    }
  }
}

module.exports = { GeminiService };
