class SpeechRecognitionController {
  private recognition: SpeechRecognition;

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error("Speech recognition not supported in this browser.");
    }
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = this.onResult.bind(this);
    this.recognition.onerror = this.onError.bind(this);
  }

  public startListening() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.recognition.start();
        console.log("Voice control listening started.");
        resolve();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        reject(error);
      }
    });
  }

  private onResult(event: SpeechRecognitionEvent) {
    for (const result of event.results) {
      if (result.isFinal) {
        const command = result[0].transcript.trim().toLowerCase();
        console.log("Voice command received:", command);
        this.handleCommand(command);
      }
    }
  }

  private onError(event: any) {
    console.error("Speech recognition error:", event);
  }

  private handleCommand(command: string) {
    // Implement command handling logic
    if (command.includes("start")) {
      this.simulateKeyPress("Enter");
    } else if (command.includes("left")) {
      this.simulateKeyPress("ArrowLeft");
    } else if (command.includes("right")) {
      this.simulateKeyPress("ArrowRight");
    } else if (command.includes("stop")) {
      this.simulateKeyPress("Space");
    }
  }

  private simulateKeyPress(key: string) {
    const event = new KeyboardEvent("keydown", {
      key: key,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  }
}

export { SpeechRecognitionController };

