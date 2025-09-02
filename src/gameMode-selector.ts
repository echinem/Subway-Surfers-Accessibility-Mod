export enum GameMode {
  AUDIO = "audio",
  EYE_TRACKING = "eye_tracking",
  VOICE_CONTROL = "VOICE_CONTROL",
}

class GameModeSelector {
  private selectedMode: GameMode | null = null;
  private onModeSelected: ((mode: GameMode) => void) | null = null;

  constructor() {
    this.createModeSelectionUI();
  }

  private createModeSelectionUI() {
    const overlay = document.createElement("div");
    overlay.id = "game-mode-selector";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Arial', sans-serif;
      `;

    overlay.innerHTML = `
        <div style="
          background: rgba(255, 255, 255, 0.95);
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 600px;
          width: 90%;
        ">
          <h1 style="
            color: #333;
            margin: 0 0 20px 0;
            font-size: 36px;
            font-weight: bold;
          ">🏃‍♂️ Subway Surfers Accessibility</h1>
          
          <p style="
            color: #666;
            font-size: 18px;
            margin-bottom: 40px;
            line-height: 1.6;
          ">Choose your preferred game mode:</p>
          
          <div style="
            display: flex;
            gap: 30px;
            justify-content: center;
            flex-wrap: wrap;
          ">
            <div id="audio-mode" class="mode-card" style="
              background: linear-gradient(135deg, #ff6b6b, #ee5a24);
              color: white;
              padding: 30px;
              border-radius: 15px;
              cursor: pointer;
              transition: all 0.3s ease;
              min-width: 200px;
              box-shadow: 0 10px 20px rgba(238, 90, 36, 0.3);
            ">
              <div style="font-size: 48px; margin-bottom: 15px;">🔊</div>
              <h3 style="margin: 0 0 10px 0; font-size: 24px;">Audio Mode</h3>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                For blind and visually impaired players<br>
                <strong>Features:</strong><br>
                • Voice instructions<br>
                • Audio obstacle warnings<br>
                • Keyboard controls
              </p>
            </div>
            
            <div id="eye-tracking-mode" class="mode-card" style="
              background: linear-gradient(135deg, #4ecdc4, #44a08d);
              color: white;
              padding: 30px;
              border-radius: 15px;
              cursor: pointer;
              transition: all 0.3s ease;
              min-width: 200px;
              box-shadow: 0 10px 20px rgba(68, 160, 141, 0.3);
            ">
              <div style="font-size: 48px; margin-bottom: 15px;">👁️</div>
              <h3 style="margin: 0 0 10px 0; font-size: 24px;">Eye Tracking</h3>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                For players with mobility limitations<br>
                <strong>Features:</strong><br>
                • Eye movement controls<br>
                • 3-lane system<br>
                • Visual feedback
              </p>
            </div>
            
            <div id="voice-control-mode" class="mode-card" style="
              background: linear-gradient(135deg, #9b59b6, #8e44ad);
              color: white;
              padding: 30px;
              border-radius: 15px;
              cursor: pointer;
              transition: all 0.3s ease;
              min-width: 200px;
              box-shadow: 0 10px 20px rgba(142, 68, 173, 0.3);
            ">
              <div style="font-size: 48px; margin-bottom: 15px;">🎤</div>
              <h3 style="margin: 0 0 10px 0; font-size: 24px;">Voice Control</h3>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                For hands-free gaming experience<br>
                <strong>Features:</strong><br>
                • Voice commands<br>
                • Speech recognition<br>
                • Audio feedback
              </p>
            </div>
          </div>
          
          <div style="
            margin-top: 30px;
            padding: 20px;
            background: rgba(52, 152, 219, 0.1);
            border-radius: 10px;
            border-left: 4px solid #3498db;
          ">
            <p style="
              color: #2c3e50;
              margin: 0;
              font-size: 14px;
              line-height: 1.5;
            ">
              <strong>💡 Tip:</strong> You can switch between modes anytime by refreshing the page.
              Both modes include all accessibility features for an inclusive gaming experience.
            </p>
          </div>
        </div>
      `;

    document.body.appendChild(overlay);

    // Add hover effects
    const style = document.createElement("style");
    style.textContent = `
        .mode-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 15px 30px rgba(0,0,0,0.2);
        }
        
        .mode-card:active {
          transform: translateY(-2px) scale(1.01);
        }
      `;
    document.head.appendChild(style);

    // Add click handlers
    document.getElementById("audio-mode")?.addEventListener("click", () => {
      this.selectMode(GameMode.AUDIO);
    });

    document
      .getElementById("eye-tracking-mode")
      ?.addEventListener("click", () => {
        this.selectMode(GameMode.EYE_TRACKING);
      });

    document
      .getElementById("voice-control-mode")
      ?.addEventListener("click", () => {
        this.selectMode(GameMode.VOICE_CONTROL);
      });
  }

  private selectMode(mode: GameMode) {
    this.selectedMode = mode;
    console.log(`Game mode selected: ${mode}`);

    // Show loading animation
    this.showLoadingAnimation(mode);

    // Remove selector after animation
    setTimeout(() => {
      const overlay = document.getElementById("game-mode-selector");
      if (overlay) {
        document.body.removeChild(overlay);
      }

      // Notify about mode selection
      if (this.onModeSelected) {
        this.onModeSelected(mode);
      }
    }, 2000);
  }

  private showLoadingAnimation(mode: GameMode) {
    const overlay = document.getElementById("game-mode-selector");
    if (!overlay) return;

    const modeNames = {
      [GameMode.AUDIO]: "Audio Mode",
      [GameMode.EYE_TRACKING]: "Eye Tracking Mode",
      [GameMode.VOICE_CONTROL]: "Voice Control Mode",
    };

    const modeIcons = {
      [GameMode.AUDIO]: "🔊",
      [GameMode.EYE_TRACKING]: "👁️",
      [GameMode.VOICE_CONTROL]: "🎤",
    };

    overlay.innerHTML = `
        <div style="
          background: rgba(255, 255, 255, 0.95);
          padding: 60px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 400px;
        ">
          <div style="font-size: 72px; margin-bottom: 20px; animation: pulse 1s infinite;">
            ${modeIcons[mode]}
          </div>
          <h2 style="color: #333; margin: 0 0 20px 0;">Loading ${modeNames[mode]}...</h2>
          <div style="
            width: 200px;
            height: 4px;
            background: #e0e0e0;
            border-radius: 2px;
            margin: 0 auto;
            overflow: hidden;
          ">
            <div style="
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, #4ecdc4, #44a08d);
              border-radius: 2px;
              animation: loading 2s ease-in-out;
            "></div>
          </div>
          <p style="color: #666; margin-top: 20px; font-size: 14px;">
            Initializing accessibility features...
          </p>
        </div>
      `;

    // Add animations
    const animationStyle = document.createElement("style");
    animationStyle.textContent = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
      `;
    document.head.appendChild(animationStyle);
  }

  public onModeSelect(callback: (mode: GameMode) => void) {
    this.onModeSelected = callback;
  }

  public getSelectedMode(): GameMode | null {
    return this.selectedMode;
  }
}

export const gameModeSelector = new GameModeSelector();
