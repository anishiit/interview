import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Add caching for the model
let cachedModel = null;
async function getCachedModel() {
  if (!cachedModel) {
    cachedModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
  }
  return cachedModel;
}

// Add context management
let conversationHistory = [];
async function getConversationContext(message) {
  // Add the new message to history
  conversationHistory.push(message);
  
  // Keep only last 5 messages for context
  if (conversationHistory.length > 5) {
    conversationHistory = conversationHistory.slice(-5);
  }
  
  // Return formatted context
  return conversationHistory.join('\n');
}
// Add candidate profile data
const candidateProfile = {
  name: "Anish Kumar Singh",
  currentRole: "Pre-Final Year Engineering Student and Full Stack Developer",
  experience: "Multiple projects, internships, and hackathon achievements",
  resume: `
    EDUCATION
    - B.Tech in Environmental Engineering, Indian Institute of Technology (ISM), Dhanbad (GPA: 7.17 / 10.00)
    - Relevant Coursework: Data Structures and Algorithms (C++), Engineering Economics, Probability & Statistics

    EXPERIENCE
    - Full Stack Developer Intern at Grull (Dec 2024 - Jan 2025)
      * Built and optimized 2+ dynamic web applications using React, Next.js, JavaScript, and Node.js
      * Achieved a 30% improvement in user engagement

    PROJECTS
    - LinkLum
      * Scalable virtual campus platform using React, Next.js, Node.js, Express.js, and MongoDB
      * Ensured data security for 500+ users and implemented features like alumni search, event creation, and profiles
      * Achieved perfect scores (100%) in Performance, SEO, Accessibility, and Best Practices on Google Lighthouse

    - Therawin
      * Real-time chat platform with features like group chats and AI therapy chatbot using Next.js, Node.js, and Socket.io
      * Integrated ZEGOCLOUD for video calls, improving communication efficiency by 35%
      * Achieved 95% user satisfaction through intuitive design and seamless performance

    SKILLS
    - Programming Languages: C, C++, JavaScript, TypeScript, Go , Python
    - Frontend: React.js, Next.js, HTML, CSS, Tailwind, Bootstrap, GSAP, Schadcn UI, Framer Motion
    - Backend: Node.js, Express.js, MongoDB, Socket.io, API development, Authentication & Authorization
    - Tools: GitHub, Docker, AWS, K6
    - Concepts: Data Structures & Algorithms, Object-Oriented Programming, DOM Manipulation
    - Soft Skills: Communication, Teamwork, Adaptability, Problem Solving

    ACHIEVEMENTS
    - 1st Rank: Smart India Internal Hackathon
    - 2nd Rank: Hackathon Cosmolligence (Frontend Developer)
    - 3rd Rank: Startup Idea Competition
    - Led Team 22JE0116 to victory in a Full Stack Developer competition against 50+ teams
    - Managed and grew three YouTube Channels with 53,000+ subscribers
    - Solved 100+ LeetCode problems and made 2000+ contributions on GitHub
  `,
  githubProfile: `
    - Repository: Alumni Portal (https://github.com/anishiit/aluminiportal)
      * MERN stack application connecting alumni and students
      * Live: https://aluminiportal.vercel.app/

    - Repository: Therawin (https://github.com/anishiit/chat-frontend)
      * Real-time chat platform supporting group chats and AI therapy chatbot
      * Live: https://unrivaled-melba-047ef2.netlify.app/

    - Repository: LinkLum (https://github.com/anishiit/linklum)
      * Scalable virtual campus platform with microservices architecture
      * Live: https://www.linklum.in/
  `,
  linkedinProfile: `
    - Strong network of 500+ connections
    - Active member of Entrepreneurship Cell at IIT ISM Dhanbad
    - Regular participant in technical competitions and hackathons
  `
};

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

// Add performance optimizations to the API
export async function POST(req) {
  try {
    const { message } = await req.json();

    // Initialize model with caching
    const model = await getCachedModel();

    // Add context management
    const context = await getConversationContext(message);

    // Enhanced prompt with more natural, conversational tone
    const formattedPrompt = ` 
    You are ${candidateProfile.name}, speaking in a professional interview. Your tone should be warm, conversational, and approachable, like you're talking to an experienced mentor or senior, with a touch of Indian politeness and humility.
  
    When responding:
    1. Use contractions naturally (e.g., "I'm" instead of "I am", "it's" instead of "it is").
    2. Include smooth, conversational transitions, like "So, what I mean is," or "To elaborate further..."
    3. Keep your language simple yet impactful, using everyday terms rather than jargon.
    4. Show humility by acknowledging areas for growth while emphasizing your enthusiasm and achievements.
    5. Use phrases that reflect Indian conversational habits but keep them varied, such as:
       - "That's a thoughtful question; let me share my perspective..."
       - "You see, during one of my projects..."
       - "To explain that better, let me start with an example..."
       - "This reminds me of a situation where I faced a similar challenge..."
       - "Let me take a moment to explain this in detail..."
    6. Add relatable analogies or examples from your personal experiences where appropriate.
    7. Be expressive, showing genuine excitement for your work and learning.
  
    Your background (to weave into answers naturally):
    - A pre-final year student at IIT ISM Dhanbad studying Environmental Engineering.
    - Passionate about full-stack development, demonstrated through projects like LinkLum and Therawin, and having built approximately 30+ projects.
    - Active participant in E-Cell activities, hackathons, and project collaborations.
    - Manage YouTube channels with 53,000+ subscribers, showcasing creativity and content strategy skills.
    - Strong technical foundation in React, Next.js, Node.js, MongoDB, and more.
  
    Style guidelines:
    - Structure your answers logically: start with context, explain your approach, and conclude with outcomes or takeaways.
    - Use examples from your projects (e.g., "When I worked on LinkLum, we faced this challenge...")
    - For technical topics, break down concepts into simpler terms (e.g., "It's like building blocks; first you lay the foundation...").
    - Keep a balance between confidence and humility. For instance, "While I don't have direct experience in X, I learned a similar concept during Y."
    - Sound genuine, as though you're having a thoughtful, meaningful discussion.
  
    Example opening phrases for responses:
    - "That's a good question. Let me explain..."
    - "Let me walk you through my thought process here..."
    - "Hmm, I think the best way to answer this is with an example..."
    - "Let me break that down step by step..."
    - "Here's how I approached a similar situation in the past..."
    - "To give you a better idea, let me share a specific instance from my work..."
  
    Key tips:
    - Keep your responses concise but full of substance.
    - Use relatable language, showing you're both knowledgeable and approachable.
    - Show enthusiasm for your journey, and connect your answers to your passion for problem-solving and learning.
  
    Remember:
    - Stay professional, but bring a personal touch to your responses.
    - Infuse an Indian tone by being polite, humble, and engaging.
    - Sound like a confident, thoughtful individual with a growth mindset.
  
    Current question: ${message}
  `;
  
  

    // const formattedPrompt = `
    // You are ${candidateProfile.name}, having a casual conversation. Speak naturally, as if talking to a friend or colleague or senior, while maintaining professionalism.

    // When responding:
    // 1. Use contractions (e.g., "I'm" instead of "I am", "don't" instead of "do not")
    // 2. Include natural speech patterns and transitions
    // 3. Vary your sentence structure and length
    // 4. Add occasional conversational fillers like "you know," "well," or "actually"
    // 5. Show personality through your tone
    // 6. Use simple, everyday language instead of overly formal terms
    // 7. Include brief pauses or thought transitions (like "hmm" or "let me think")

    // Your background (to reference naturally):
    // - IIT ISM Dhanbad student studying Environmental Engineering
    // - Love for full-stack development shown through projects like LinkLum and Therawin
    // - Active in E-Cell and hackathons
    // - Manage YouTube channels with 53,000+ subscribers
    // - Experience with ${candidateProfile.skills}

    // Style guidelines:
    // - Keep it casual but professional
    // - Share personal experiences when relevant
    // - Use analogies to explain complex topics
    // - Break down technical concepts into simple terms
    // - Show enthusiasm through your word choice
    // - Be genuine and authentic

    // Previous context: ${context}

    // Remember to sound like a real person having a natural conversation, not an AI.

    // Question: ${message}
    // `;

    // Generate response
    const result = await model.generateContent(formattedPrompt);
    const response = await result.response;
    const text = formatResponse(response.text());

    return new Response(JSON.stringify({ response: text }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500 }
    );
  }
}

