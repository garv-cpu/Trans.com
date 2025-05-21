import React, { useState } from 'react';

// Sample options for voice style and tone
const voiceStyles = ['Professional', 'Friendly', 'Romantic', 'Sarcastic'];
const tones = ['Serious', 'Happy', 'Angry'];

export default function Translator() {
  const [inputText, setInputText] = useState('');
  const [formalTranslation, setFormalTranslation] = useState('');
  const [slangTranslation, setSlangTranslation] = useState('');
  const [voiceStyle, setVoiceStyle] = useState(voiceStyles[0]);
  const [tone, setTone] = useState(tones[0]);
  const [useSlang, setUseSlang] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');

  // Your backend API URLs (replace with your actual endpoints)
  const FORMAL_TRANSLATE_API = '/api/translate/formal';  // POST { text } => { translation }
  const SLANG_TRANSLATE_API = '/api/translate/slang';    // POST { text } => { slangTranslation }
  const TTS_API = '/api/tts';                            // POST { text, voiceStyle, tone } => audio stream or URL

  // Fetch formal translation from your backend or translation service
  async function fetchFormalTranslation(text) {
    const res = await fetch(FORMAL_TRANSLATE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Failed to fetch formal translation');
    const data = await res.json();
    return data.translation;
  }

  // Fetch slang translation from your backend or slang conversion service
  async function fetchSlangTranslation(formalText) {
    const res = await fetch(SLANG_TRANSLATE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: formalText }),
    });
    if (!res.ok) throw new Error('Failed to fetch slang translation');
    const data = await res.json();
    return data.slangTranslation;
  }

  // Call backend to get TTS audio URL or blob for playback
  async function callTTSApi(text, voiceStyle, tone) {
    setIsPlaying(true);
    setError('');
    try {
      const res = await fetch(TTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceStyle, tone }),
      });
      if (!res.ok) throw new Error('TTS API error');
      const data = await res.json();
      if (!data.audioUrl) throw new Error('No audio URL received');
      playAudio(data.audioUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsPlaying(false);
    }
  }

  // Play audio from URL
  function playAudio(url) {
    const audio = new Audio(url);
    audio.play();
  }

  // Handle Translate button click
  const translateText = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setError('');
    try {
      // Formal translation
      const formal = await fetchFormalTranslation(inputText);
      setFormalTranslation(formal);

      // Slang translation from formal text
      const slang = await fetchSlangTranslation(formal);
      setSlangTranslation(slang);
    } catch (e) {
      setError(e.message);
      setFormalTranslation('');
      setSlangTranslation('');
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle Play Voice button click
  const playVoice = () => {
    const textToSpeak = useSlang ? slangTranslation : formalTranslation;
    if (!textToSpeak) {
      setError('No translation to speak.');
      return;
    }
    callTTSApi(textToSpeak, voiceStyle, tone);
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>Multilingual Translator with Slang & Voice Styles</h2>

      <textarea
        rows={4}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Enter text to translate"
        style={{ width: '100%', padding: 10, fontSize: 16 }}
      />

      <button
        onClick={translateText}
        disabled={isTranslating}
        style={{ marginTop: 10, padding: '10px 20px', fontSize: 16 }}
      >
        {isTranslating ? 'Translating...' : 'Translate'}
      </button>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div style={{ marginTop: 20 }}>
        <h3>Formal Translation:</h3>
        <p style={{ backgroundColor: '#f0f0f0', padding: 10, borderRadius: 4 }}>
          {formalTranslation || '---'}
        </p>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Slang Translation:</h3>
        <p style={{ backgroundColor: '#f9f9f9', padding: 10, borderRadius: 4, fontStyle: 'italic' }}>
          {slangTranslation || '---'}
        </p>
      </div>

      <label style={{ display: 'block', marginTop: 20, fontSize: 16 }}>
        <input
          type="checkbox"
          checked={useSlang}
          onChange={() => setUseSlang(!useSlang)}
          style={{ marginRight: 8 }}
        />
        Use Slang Version for Voice Output
      </label>

      <div style={{ marginTop: 15 }}>
        <label>
          Voice Style:{' '}
          <select
            value={voiceStyle}
            onChange={(e) => setVoiceStyle(e.target.value)}
            style={{ fontSize: 16 }}
          >
            {voiceStyles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 15 }}>
        <label>
          Tone:{' '}
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={{ fontSize: 16 }}
          >
            {tones.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={playVoice}
        disabled={isPlaying}
        style={{ marginTop: 20, padding: '10px 20px', fontSize: 16 }}
      >
        {isPlaying ? 'Playing...' : 'Play Voice'}
      </button>
    </div>
  );
}
