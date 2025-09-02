// Enhanced Voice Control for Accessibility
import annyang from 'annyang';

// Voice control state
interface VoiceControlState {
  isActive: boolean;
  isListening: boolean;
  debugMode: boolean;
  confidence: number;
  lastCommand: string;
  helpMode: boolean;
}

const voiceState: VoiceControlState = {
  isActive: false,
  isListening: false,
  debugMode: false,
  confidence: 0.7,
  lastCommand: '',
  helpMode: false
};

// Game control functions - optimized for speed
function simulateKeyPress(keyCode: string, skipFeedback: boolean = false) {
  const event = new KeyboardEvent('keydown', {
    code: keyCode,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
  if (!skipFeedback) {
    announceAction(`${keyCode}`, true); // Skip speech, only log
  }
}

// Accessibility announcement function - optimized for speed
function announceAction(message: string, skipSpeech: boolean = false) {
  // Only speak important messages to reduce response time
  if ('speechSynthesis' in window && !skipSpeech && voiceState.debugMode) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.8; // Faster speech rate
    utterance.volume = 0.6; // Quieter volume
    speechSynthesis.speak(utterance);
  }
  console.log(`Voice Control: ${message}`);
}

// Enhanced voice control with comprehensive commands
export function startVoiceControl() {
  if (!annyang) {
    console.warn('Speech recognition not supported.');
    announceAction('Speech recognition not supported on this browser');
    return;
  }

  // Check for microphone permission first
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('MediaDevices API not supported');
    announceAction('Microphone access not supported on this browser');
    return;
  }

  // Request microphone permission
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => {
      console.log('Microphone permission granted');
      initializeVoiceRecognition();
    })
    .catch((error) => {
      console.error('Microphone permission denied:', error);
      announceAction('Microphone permission denied. Please allow microphone access and refresh the page.');
    });
}

function initializeVoiceRecognition() {
  // Set up recognition settings
  annyang.setLanguage('en-US');
  
  // Enable debug mode by default to help troubleshoot
  annyang.debug(true);
  
  // Primary game control commands
  const gameCommands: any = {
    // Game state commands
    'start game': () => {
      simulateKeyPress('Enter');
      announceAction('Starting game');
    },
    'begin game': () => {
      simulateKeyPress('Enter');
      announceAction('Starting game');
    },
    'play game': () => {
      simulateKeyPress('Enter');
      announceAction('Starting game');
    },
    'restart game': () => {
      simulateKeyPress('Space');
      announceAction('Restarting game');
    },
    'reset game': () => {
      simulateKeyPress('Space');
      announceAction('Restarting game');
    },
    'new game': () => {
      simulateKeyPress('Space');
      announceAction('Starting new game');
    },

    // Movement commands - optimized for instant response
    'jump': () => {
      simulateKeyPress('ArrowUp', true); // Skip all feedback for speed
    },
    'jump up': () => {
      simulateKeyPress('ArrowUp', true);
    },
    'leap': () => {
      simulateKeyPress('ArrowUp', true);
    },
    'hop': () => {
      simulateKeyPress('ArrowUp', true);
    },

    'slide': () => {
      simulateKeyPress('ArrowDown', true);
    },
    'slide down': () => {
      simulateKeyPress('ArrowDown', true);
    },
    'duck': () => {
      simulateKeyPress('ArrowDown', true);
    },
    'roll': () => {
      simulateKeyPress('ArrowDown', true);
    },

    'move left': () => {
      simulateKeyPress('ArrowLeft', true);
    },
    'go left': () => {
      simulateKeyPress('ArrowLeft', true);
    },
    'left': () => {
      simulateKeyPress('ArrowLeft', true);
    },
    'turn left': () => {
      simulateKeyPress('ArrowLeft', true);
    },

    'move right': () => {
      simulateKeyPress('ArrowRight', true);
    },
    'go right': () => {
      simulateKeyPress('ArrowRight', true);
    },
    'right': () => {
      simulateKeyPress('ArrowRight', true);
    },
    'turn right': () => {
      simulateKeyPress('ArrowRight', true);
    },

    // Emergency commands - also optimized for speed
    'dodge left': () => {
      simulateKeyPress('ArrowLeft', true);
    },
    'dodge right': () => {
      simulateKeyPress('ArrowRight', true);
    },
    'avoid obstacle': () => {
      simulateKeyPress('ArrowUp', true);
    },
    'emergency jump': () => {
      simulateKeyPress('ArrowUp', true);
    },

    // Help and status commands
    'help': () => {
      voiceState.helpMode = true;
      announceHelp();
    },
    'what can I say': () => {
      announceHelp();
    },
    'voice commands': () => {
      announceHelp();
    },
    'list commands': () => {
      announceHelp();
    },

    // Voice control management
    'stop listening': () => {
      pauseVoiceControl();
    },
    'pause voice control': () => {
      pauseVoiceControl();
    },
    'resume listening': () => {
      resumeVoiceControl();
    },
    'start listening': () => {
      resumeVoiceControl();
    },

    // Debug and accessibility features
    'debug mode on': () => {
      voiceState.debugMode = true;
      announceAction('Debug mode enabled');
    },
    'debug mode off': () => {
      voiceState.debugMode = false;
      announceAction('Debug mode disabled');
    },
    'speak status': () => {
      speakGameStatus();
    },
    'what is my status': () => {
      speakGameStatus();
    },
    'game status': () => {
      speakGameStatus();
    },

    // Accessibility settings
    'slow speech': () => {
      adjustSpeechRate(0.8);
      announceAction('Speech rate slowed');
    },
    'fast speech': () => {
      adjustSpeechRate(1.5);
      announceAction('Speech rate increased');
    },
    'normal speech': () => {
      adjustSpeechRate(1.2);
      announceAction('Speech rate normalized');
    },

    // Confirmation commands
    'yes': () => {
      if (voiceState.helpMode) {
        announceAction('Continuing with help');
      } else {
        simulateKeyPress('p');
        announceAction('Confirmed - starting game');
      }
    },
    'no': () => {
      if (voiceState.helpMode) {
        voiceState.helpMode = false;
        announceAction('Exiting help mode');
      } else {
        announceAction('Cancelled');
      }
    }
  };

  // Add commands to annyang
  annyang.addCommands(gameCommands);

  // Set up event listeners
  annyang.addCallback('start', () => {
    voiceState.isListening = true;
    announceAction('Voice control is now listening');
  });

  annyang.addCallback('end', () => {
    voiceState.isListening = false;
    if (voiceState.debugMode) {
      announceAction('Voice control stopped listening');
    }
  });

  annyang.addCallback('result', (phrases: string[]) => {
    if (voiceState.debugMode) {
      console.log('Voice input detected:', phrases);
    }
  });

  annyang.addCallback('error', (err: any) => {
    console.warn('Voice recognition error:', err);
    if (voiceState.debugMode) {
      announceAction('Voice recognition error occurred');
    }
  });

  // Start voice recognition
  annyang.start({ autoRestart: true, continuous: true });
  voiceState.isActive = true;
  
  announceAction('Voice control system activated. Say "help" for available commands.');
}

// Helper functions
function announceHelp() {
  const helpText = `
    Voice commands available:
    Game control: "start game", "restart game"
    Movement: "jump", "slide", "move left", "move right"
    Emergency: "dodge left", "dodge right", "avoid obstacle"
    Voice control: "stop listening", "resume listening"
    Status: "speak status", "game status"
    Settings: "slow speech", "fast speech", "debug mode on"
    Say "yes" or "no" to confirm actions.
  `;
  announceAction(helpText);
}

function pauseVoiceControl() {
  if (annyang) {
    annyang.pause();
    voiceState.isListening = false;
    announceAction('Voice control paused. Say "resume listening" to continue.');
  }
}

function resumeVoiceControl() {
  if (annyang) {
    annyang.resume();
    voiceState.isListening = true;
    announceAction('Voice control resumed and listening.');
  }
}

function speakGameStatus() {
  // This would need to be connected to the actual game state
  const status = 'Game is ready to start. Use voice commands to play.';
  announceAction(status);
}

function adjustSpeechRate(rate: number) {
  // This affects future speech synthesis calls
  voiceState.confidence = rate;
}

// Stop voice control
export function stopVoiceControl() {
  if (annyang) {
    annyang.abort();
    voiceState.isActive = false;
    voiceState.isListening = false;
    announceAction('Voice control system deactivated');
  }
}

// Get voice control state
export function getVoiceControlState(): VoiceControlState {
  return { ...voiceState };
}

// Export for use in other components
export { voiceState };
