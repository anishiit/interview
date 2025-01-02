import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Function to format the response text
function formatResponse(text) {
  // Format code blocks with syntax highlighting
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, language, code) => {
    return `<div class="code-block">
      <div class="code-header">
        <span class="language-tag">${language || 'code'}</span>
      </div>
      <pre><code class="${language}">${code.trim()}</code></pre>
    </div>`;
  });

  // Format inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Format headers
  text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Format lists
  text = text.replace(/^\s*[-*+] (.*)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Format paragraphs
  text = text.replace(/^(?!<[hou]).+$/gm, '<p>$&</p>');

  return text;
}

export async function POST(req) {
  try {
    const { message } = await req.json();

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Add interview-style instructions to the prompt
    const formattedPrompt = `
      You are being interviewed by a voice assistant. Respond as if you're in a professional interview setting.
      Follow these guidelines:

      1. Start with a brief, friendly acknowledgment of the question
      2. Structure your response in a conversational yet professional manner
      3. If discussing technical topics:
         - Begin with a high-level explanation
         - Provide specific examples when relevant
         - Use code examples only when specifically asked
      4. For non-technical questions:
         - Give thoughtful, well-structured answers
         - Include relevant examples or experiences
         - Maintain a professional but personable tone
      5. End your responses naturally, as you would in a real conversation

      If code examples are needed:
      - Format them with proper syntax highlighting
      - Add clear explanations
      - Use comments for clarity

      Remember to:
      - Be concise but thorough
      - Stay friendly and professional
      - Use natural conversational transitions
      - Maintain a clear structure in your responses

      Interviewer's question: ${message}
    `;

    // Generate response
    const result = await model.generateContent(formattedPrompt);
    const response = await result.response;
    const text = formatResponse(response.text());

    return new Response(JSON.stringify({ response: text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

