class VoiceControl {
  private recognition: SpeechRecognition | null = null;
  private commandMap: Record<string, () => void> = {};
  private isListening: boolean = false;
  private debounceTimeout: any = null;

  constructor(commands: Record<string, () => void>) {
    this.commandMap = commands;
  }

  init() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Reverting to keyboard controls.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event) => {
      if (this.debounceTimeout) return;
      this.debounceTimeout = setTimeout(() => {
        this.debounceTimeout = null;
      }, 300);

      const transcript = event.results[0][0].transcript.toLowerCase();
      const command = this.normalizeCommand(transcript);

      if (this.commandMap[command]) {
        this.commandMap[command]();
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error', event);
      alert('Error with speech recognition. Reverting to keyboard controls.');
    };
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      this.recognition.start();
      this.isListening = true;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  destroy() {
    this.stopListening();
    this.recognition = null;
  }

  private normalizeCommand(transcript: string): string {
    return transcript.replace(/\b(?:hey|please|can you)\b/gi, '').trim();
  }
}

export default VoiceControl;

