import { NextResponse } from 'next/server';

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

export async function POST(req) {
  try {
    const { audio } = await req.json();

    // Convert base64 to blob
    const base64Data = audio.split(',')[1]; // Remove data URL prefix if present
    const binaryData = Buffer.from(base64Data, 'base64');
    
    // Create form data with the correct audio format
    const formData = new FormData();
    formData.append('audio_file', new Blob([binaryData], { type: 'audio/webm' }), 'audio.webm');

    // Call Hugging Face API with proper headers and format
    const response = await fetch(
      'https://api-inference.huggingface.co/models/openai/whisper-base',
      {
        headers: {
          'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
          // Remove Content-Type header to let browser set it with boundary
        },
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Hugging Face API error:', error);
      throw new Error('Transcription failed');
    }

    const result = await response.json();
    
    // Handle different response formats
    const transcript = result.text || 
                      (result.chunks?.[0]?.text) || 
                      (typeof result === 'string' ? result : '');

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed: ' + error.message }, 
      { status: 500 }
    );
  }
} 