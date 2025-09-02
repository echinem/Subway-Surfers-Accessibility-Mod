import "./assets/main.less";

import { createApp } from "vue";
import { createPinia } from "pinia";
import { gameModeSelector, GameMode } from "./gameMode-selector";

import App from "./App.vue";
import router from "./router";
import { startVoiceControl, stopVoiceControl, getVoiceControlState } from "./voiceControl";
import { initializeSpatialAudio } from "./spatialAudio";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");

async function initializeGame() {
  console.log("Subway Surfers Accessibility - Initializing...");

  // Wait for mode selection
  gameModeSelector.onModeSelect(async (selectedMode: GameMode) => {
    console.log(`Initializing ${selectedMode} mode...`);

    if (selectedMode === GameMode.AUDIO) {
      // Initialize audio mode - NO eye tracking, NO camera
      await initializeAudioMode();
    } else if (selectedMode === GameMode.EYE_TRACKING) {
      // Initialize eye tracking mode - WITH eye tracking and camera
      await initializeEyeTrackingMode();
    } else if (selectedMode === GameMode.VOICE_CONTROL) {
      // Initialize voice control mode
      await initializeVoiceControlMode();
    }

    // Show mode-specific instructions
    showModeInstructions(selectedMode);
  });
}

async function initializeAudioMode() {
  console.log("🔊 Initializing Audio Mode...");
  const { setupEyeControls } = await import("./eyeControl");
  setupEyeControls(false); // FALSE = No eye tracking, no camera, no visuals

  // Initialize spatial audio for all modes
  initializeSpatialAudio();

  // Add audio mode indicator
  addModeIndicator("🔊 Audio Mode - Keyboard Only", "#ff6b6b");

  console.log("Audio mode initialized - Only keyboard controls active!");
}

async function initializeEyeTrackingMode() {
  console.log("👁️ Initializing Eye Tracking Mode...");
  const { setupEyeControls } = await import("./eyeControl");
  setupEyeControls(true); // TRUE = Eye tracking, camera, and visuals enabled

  // Initialize spatial audio for all modes
  initializeSpatialAudio();

  addEyeTrackingControlPanel();

  // Add eye tracking mode indicator
  addModeIndicator("👁️ Eye Tracking Mode - Camera Active", "#4ecdc4");

  console.log(
    "Eye tracking mode initialized - Camera and eye tracking active!"
  );
}

async function initializeVoiceControlMode() {
  console.log("🎤 Initializing Voice Control Mode...");
  
  // Initialize spatial audio for all modes
  initializeSpatialAudio();
  
  // Start voice control
  startVoiceControl();
  
  // Add voice control mode indicator
  addModeIndicator("🎤 Voice Control Mode - Say Commands", "#9b59b6");

  console.log("Voice control mode initialized - Voice commands active!");
}

function addModeIndicator(modeText: string, color: string) {
  const indicator = document.createElement("div");
  indicator.id = "mode-indicator";
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${color};
    color: white;
    padding: 12px 25px;
    border-radius: 25px;
    font-weight: bold;
    font-size: 16px;
    z-index: 9998;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideDown 0.5s ease-out;
  `;
  indicator.textContent = modeText;

  // Add slide down animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideDown {
      from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(indicator);

  // Auto-hide after 6 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.style.animation = "slideUp 0.5s ease-out forwards";
      setTimeout(() => {
        if (indicator.parentNode) {
          document.body.removeChild(indicator);
        }
      }, 500);
    }
  }, 6000);
}

function addEyeTrackingControlPanel() {
  const controlPanel = document.createElement("div");
  controlPanel.id = "simple-eye-controls";
  controlPanel.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px;
    border-radius: 8px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    font-size: 14px;
    min-width: 200px;
    max-width: 250px;
  `;

  controlPanel.innerHTML = `
    <h4 style="margin: 0 0 10px 0;">👁️ Eye Tracking Status</h4>
    
    <div style="margin-bottom: 10px;">
      <strong>Current Lane: <span id="current-lane">Center</span></strong>
    </div>
    
    <div style="margin-bottom: 10px;">
      <strong>Status: <span id="calibration-status">Initializing...</span></strong>
    </div>
    
    <div style="margin-bottom: 10px;">
      <button id="recalibrate-btn" style="width: 100%; padding: 8px; margin-bottom: 5px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        🎯 Recalibrate (Ctrl+C)
      </button>
      <button id="toggle-zones-btn" style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
        👀 Toggle Zones (Ctrl+V)
      </button>
    </div>
    
    <div style="font-size: 12px; color: #ccc; line-height: 1.4;">
      <p><strong>How to use:</strong></p>
      <p>• Look LEFT to move left</p>
      <p>• Look RIGHT to move right</p>
      <p>• Look CENTER to stay center</p>
      <p style="color: #87CEEB;"><strong>📹 Camera is active</strong></p>
    </div>
  `;

  document.body.appendChild(controlPanel);

  setInterval(async () => {
    const currentLaneSpan = document.getElementById("current-lane");
    const statusSpan = document.getElementById("calibration-status");

    if (currentLaneSpan || statusSpan) {
      try {
        const { eyeTrackingController } = await import("./eyeControl");

        if (currentLaneSpan) {
          const lane = eyeTrackingController.getCurrentLane();
          const laneNames = ["", "Left", "Center", "Right"];
          currentLaneSpan.textContent = laneNames[lane] || "Center";
        }

        if (statusSpan) {
          const status = eyeTrackingController.getCalibrationStatus();
          statusSpan.textContent = status;

          // Color code the status
          if (status === "Ready") {
            statusSpan.style.color = "#90EE90"; // Light green
          } else if (
            status.includes("pending") ||
            status.includes("Initializing")
          ) {
            statusSpan.style.color = "#FFD700"; // Gold
          } else {
            statusSpan.style.color = "#FFA500"; // Orange
          }
        }
      } catch (error) {
        // Module not loaded yet
      }
    }
  }, 500);

  // Add event listeners
  document
    .getElementById("recalibrate-btn")
    ?.addEventListener("click", async () => {
      const { eyeTrackingController } = await import("./eyeControl");
      console.log("Manual recalibration requested via button");
      eyeTrackingController.recalibrate();
    });

  document
    .getElementById("toggle-zones-btn")
    ?.addEventListener("click", async () => {
      const { eyeTrackingController } = await import("./eyeControl");
      eyeTrackingController.toggleVisualFeedback();
    });
}

function showModeInstructions(mode: GameMode) {
  const instructions = document.createElement("div");
  instructions.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px;
    border-radius: 10px;
    max-width: 320px;
    z-index: 9997;
    font-family: Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  `;

  if (mode === GameMode.AUDIO) {
    instructions.innerHTML = `
      <h4 style="margin: 0 0 10px 0; color: #ff6b6b;">🔊 Audio Mode Instructions</h4>
      <p><strong>Controls:</strong></p>
      <p>• Arrow Keys: Move player</p>
      <p>• Enter: Start game</p>
      <p>• Spacebar: Restart</p>
      <p><strong>Audio Features:</strong></p>
      <p>• Train warnings</p>
      <p>• Collision alerts</p>
      <p>• Lane announcements</p>
      <p style="color: #90EE90;"><strong>✓ Camera is OFF</strong></p>
      <p style="color: #90EE90;"><strong>✓ Eye tracking is OFF</strong></p>
      <p style="color: #90EE90;"><strong>✓ Keyboard controls only</strong></p>
    `;
  } else if (mode === GameMode.VOICE_CONTROL) {
    instructions.innerHTML = `
      <h4 style="margin: 0 0 10px 0; color: #9b59b6;">🎤 Voice Control Instructions</h4>
      <p><strong>Voice Commands:</strong></p>
      <p>• "start game" / "begin game": Start playing</p>
      <p>• "jump" / "leap": Jump over obstacles</p>
      <p>• "slide" / "duck": Slide under obstacles</p>
      <p>• "left" / "move left": Move to left lane</p>
      <p>• "right" / "move right": Move to right lane</p>
      <p>• "restart game": Restart after game over</p>
      <p><strong>Help Commands:</strong></p>
      <p>• "help": List all commands</p>
      <p>• "debug mode on": Enable voice feedback</p>
      <p style="color: #90EE90;"><strong>✓ Camera is OFF</strong></p>
      <p style="color: #90EE90;"><strong>✓ Eye tracking is OFF</strong></p>
      <p style="color: #87CEEB;"><strong>🎤 Microphone is ON</strong></p>
    `;
  } else {
    instructions.innerHTML = `
      <h4 style="margin: 0 0 10px 0; color: #4ecdc4;">👁️ Eye Tracking Instructions</h4>
      <p><strong>Eye Controls:</strong></p>
      <p>• Look LEFT: Move left</p>
      <p>• Look RIGHT: Move right</p>
      <p>• Look CENTER: Stay center</p>
      <p><strong>Keyboard:</strong></p>
      <p>• Enter: Start game</p>
      <p>• Spacebar: Restart</p>
      <p>• Ctrl+C: Recalibrate</p>
      <p>• Ctrl+V: Toggle visual zones</p>
      <p style="color: #87CEEB;"><strong>📹 Camera is ON</strong></p>
      <p style="color: #87CEEB;"><strong>👁️ Eye tracking is ON</strong></p>
      <p style="color: #FFD700;"><strong>⚡ Calibration happens ONCE on startup</strong></p>
      <p style="color: #FFD700;"><strong>🔄 Use Recalibrate button if needed</strong></p>
    `;
  }

  document.body.appendChild(instructions);

  // Auto-hide after 15 seconds for eye tracking mode (more info to read)
  const hideDelay = mode === GameMode.EYE_TRACKING ? 15000 : 12000;
  setTimeout(() => {
    if (instructions.parentNode) {
      instructions.style.opacity = "0";
      instructions.style.transition = "opacity 0.5s ease-out";
      setTimeout(() => {
        if (instructions.parentNode) {
          document.body.removeChild(instructions);
        }
      }, 500);
    }
  }, hideDelay);
}

// Initialize the game
initializeGame();
