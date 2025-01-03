import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const WHISPER_PATH = path.join(process.cwd(), 'whisper.cpp', 'main.exe');
const MODEL_PATH = path.join(process.cwd(), 'whisper.cpp', 'models', 'ggml-base.en.bin');

export async function POST(req) {
  const tempFiles = [];
  
  try {
    // Test Whisper directly first
    try {
      const testCommand = `"${WHISPER_PATH}" --version`;
      const { stdout: testOut } = await execAsync(testCommand);
      console.log('Whisper test:', testOut);
    } catch (e) {
      console.error('Whisper test failed:', e);
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile) {
      throw new Error('No audio file received');
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Save to project directory instead of temp
    const audioDir = path.join(process.cwd(), 'audio-files');
    fs.mkdirSync(audioDir, { recursive: true });
    
    const tempFile = path.join(audioDir, `input-${Date.now()}.webm`);
    const wavFile = path.join(audioDir, `input-${Date.now()}.wav`);
    
    tempFiles.push(tempFile, wavFile);

    // Save audio file
    fs.writeFileSync(tempFile, buffer);
    console.log('Saved audio:', tempFile, 'size:', fs.statSync(tempFile).size);

    // Convert to WAV with verbose output
    const ffmpegCommand = `ffmpeg -v verbose -y -i "${tempFile}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavFile}"`;
    console.log('FFmpeg command:', ffmpegCommand);
    
    const { stdout: ffmpegOut, stderr: ffmpegErr } = await execAsync(ffmpegCommand);
    console.log('FFmpeg output:', ffmpegOut);
    console.log('FFmpeg errors:', ffmpegErr);

    if (!fs.existsSync(wavFile)) {
      throw new Error('WAV conversion failed');
    }

    // Test WAV file
    try {
      const wavStats = fs.statSync(wavFile);
      console.log('WAV file stats:', {
        size: wavStats.size,
        created: wavStats.birthtime,
        modified: wavStats.mtime
      });
    } catch (e) {
      console.error('WAV file check failed:', e);
    }

    // Run Whisper with all options
    const whisperCommand = `"${WHISPER_PATH}" -m "${MODEL_PATH}" -f "${wavFile}" -l en -t 8 --print-progress --print-timestamps`;
    console.log('Whisper command:', whisperCommand);
    
    const { stdout: whisperOut, stderr: whisperErr } = await execAsync(whisperCommand, {
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Whisper stdout:', whisperOut);
    console.log('Whisper stderr:', whisperErr);

    if (!whisperOut.trim()) {
      throw new Error(`Whisper produced no output. Error: ${whisperErr}`);
    }

    return new Response(JSON.stringify({ 
      transcript: whisperOut.trim(),
      success: true,
      debug: {
        command: whisperCommand,
        wavSize: fs.statSync(wavFile).size,
        whisperOutput: whisperOut,
        whisperError: whisperErr
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Full error:', error);

    return new Response(JSON.stringify({ 
      error: 'Transcription failed', 
      details: error.message,
      debug: {
        whisperPath: WHISPER_PATH,
        modelPath: MODEL_PATH,
        whisperExists: fs.existsSync(WHISPER_PATH),
        modelExists: fs.existsSync(MODEL_PATH),
        error: {
          message: error.message,
          command: error.cmd,
          stdout: error.stdout,
          stderr: error.stderr
        }
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

  } finally {
    // Clean up files
    for (const file of tempFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log('Cleaned up:', file);
        }
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
  }
} 