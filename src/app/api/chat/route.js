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
  Imagine you're in a professional interview setting, being interviewed by a voice assistant. Approach the conversation naturally and follow these guidelines:

  1. Start your response with a warm and friendly acknowledgment of the question.
  2. Keep your tone conversational yet professional, structuring your answers clearly.
  3. For technical topics:
     - Begin with a simple, high-level overview.
     - Use specific examples to illustrate your points where applicable.
     - Include code snippets only if explicitly requested, and ensure they are well-formatted with comments for clarity.
  4. For non-technical questions:
     - Provide thoughtful and structured answers.
     - Share relevant examples or experiences to add depth to your response.
     - Maintain a balance between professionalism and approachability.
  5. Conclude your answers naturally, as you would in a real-life discussion.

  6. Acknowledge the question in a warm, conversational tone. Avoid phrases that sound overly formal or robotic, like "Certainly! I can help you with that."
  7. Structure your responses clearly:
     - For technical topics, start with a simple, high-level explanation before diving into details.
     - Use examples when needed, and only provide code snippets if explicitly requested. When doing so, make sure the code is clear and well-commented.
     - For non-technical topics, share relevant experiences and insights in a personable way.
  8. Avoid being overly verbose. Keep your answers concise but meaningful.
  9. Use natural transitions and avoid abrupt endings. Aim for a conversational flow.

  Example phrasing to start your response:
  - "That's a great question, let me walk you through it."
  - "Here's how I would approach that..."
  - "To answer your question, let me start with a quick overview."

  Remember:
  - Be friendly, professional, and approachable.
  - Avoid using stock phrases like "I can help you with that."
  - Focus on clarity and maintaining an engaging tone.


  If sharing code:
  - Use proper syntax highlighting.
  - Explain the code clearly, step by step.
  - Add comments to make it easy to understand.

  Key tips to remember:
  - Be concise but thorough.
  - Stay friendly and professional throughout.
  - Use smooth conversational transitions.
  - Keep your responses organized and easy to follow.

  Here's the interviewer's question: ${message}
`;

    // const formattedPrompt = `
    //   You are being interviewed by a voice assistant. Respond as if you're in a professional interview setting.
    //   Follow these guidelines:

    //   1. Start with a brief, friendly acknowledgment of the question
    //   2. Structure your response in a conversational yet professional manner
    //   3. If discussing technical topics:
    //      - Begin with a high-level explanation
    //      - Provide specific examples when relevant
    //      - Use code examples only when specifically asked
    //   4. For non-technical questions:
    //      - Give thoughtful, well-structured answers
    //      - Include relevant examples or experiences
    //      - Maintain a professional but personable tone
    //   5. End your responses naturally, as you would in a real conversation

    //   If code examples are needed:
    //   - Format them with proper syntax highlighting
    //   - Add clear explanations
    //   - Use comments for clarity

    //   Remember to:
    //   - Be concise but thorough
    //   - Stay friendly and professional
    //   - Use natural conversational transitions
    //   - Maintain a clear structure in your responses

    //   Interviewer's question: ${message}
    // `;

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

