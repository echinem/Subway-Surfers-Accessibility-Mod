import webgazer from "webgazer";

interface GazeData {
  x: number;
  y: number;
}

class SimpleEyeTrackingController {
  private currentLane = 2; // 1=left, 2=center, 3=right
  private lastAction = 0;
  private debounceTime = 800; // Increased debounce to prevent rapid switching
  private isGameActive = false;
  private gazeHistory: GazeData[] = [];
  private historySize = 8; // More history for stability
  private centerX = 0;
  private isCalibrated = false;
  private isEyeTrackingEnabled = false;
  private hasInitialCalibration = false;
  private webgazerStarted = false;
  private readonly LANE_THRESHOLD = 120; // Pixels from center to switch lanes
  private readonly CENTER_DEAD_ZONE = 80; // Large center zone to prevent accidental moves

  constructor() {
    this.centerX = window.innerWidth / 2;
  }

  private setupVisualFeedback() {
    if (!this.isEyeTrackingEnabled) {
      console.log("Eye tracking disabled - skipping visual feedback setup");
      return;
    }

    // Check if overlay already exists
    if (document.getElementById("lane-overlay")) {
      console.log("Visual feedback already set up");
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "lane-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      display: block;
    `;

    // Create 3 lane indicators
    const leftLane = document.createElement("div");
    leftLane.id = "lane-left";
    leftLane.style.cssText = `
      position: absolute;
      left: 0;
      top: 20%;
      width: 33.33%;
      height: 60%;
      background: rgba(255, 0, 0, 0.1);
      border: 3px solid rgba(255, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    leftLane.innerHTML = "LEFT<br>LANE";

    const centerLane = document.createElement("div");
    centerLane.id = "lane-center";
    centerLane.style.cssText = `
      position: absolute;
      left: 33.33%;
      top: 20%;
      width: 33.33%;
      height: 60%;
      background: rgba(0, 255, 0, 0.1);
      border: 3px solid rgba(0, 255, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    centerLane.innerHTML = "CENTER<br>LANE";

    const rightLane = document.createElement("div");
    rightLane.id = "lane-right";
    rightLane.style.cssText = `
      position: absolute;
      right: 0;
      top: 20%;
      width: 33.33%;
      height: 60%;
      background: rgba(0, 0, 255, 0.1);
      border: 3px solid rgba(0, 0, 255, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    rightLane.innerHTML = "RIGHT<br>LANE";

    overlay.appendChild(leftLane);
    overlay.appendChild(centerLane);
    overlay.appendChild(rightLane);
    document.body.appendChild(overlay);
  }

  public async quickCalibration(): Promise<void> {
    if (!this.isEyeTrackingEnabled) {
      console.log("Eye tracking disabled - skipping calibration");
      return;
    }

    if (!this.webgazerStarted) {
      console.log("WebGazer not started yet - skipping calibration");
      return;
    }

    return new Promise((resolve) => {
      console.log("Starting manual calibration...");

      const calibrationOverlay = document.createElement("div");
      calibrationOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 28px;
        text-align: center;
      `;

      calibrationOverlay.innerHTML = `
        <h2>Eye Tracking Calibration</h2>
        <p>Look at the CENTER of your screen</p>
        <p>Calibrating in <span id="countdown">3</span> seconds...</p>
        <div style="width: 30px; height: 30px; background: #00ff00; border-radius: 50%; margin-top: 20px;"></div>
      `;

      document.body.appendChild(calibrationOverlay);

      let countdown = 3;
      const countdownElement = calibrationOverlay.querySelector("#countdown");

      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
          countdownElement.textContent = countdown.toString();
        }

        if (countdown <= 0) {
          clearInterval(countdownInterval);

          // Collect center point data for 2 seconds
          const centerData: GazeData[] = [];
          const dataCollection = setInterval(() => {
            if (this.gazeHistory.length > 0) {
              centerData.push(this.gazeHistory[this.gazeHistory.length - 1]);
            }
          }, 100);

          setTimeout(() => {
            clearInterval(dataCollection);

            // Calculate center point
            if (centerData.length > 0) {
              this.centerX =
                centerData.reduce((sum, data) => sum + data.x, 0) /
                centerData.length;
              console.log(
                "Manual calibration complete. Center X:",
                this.centerX
              );
            }

            this.isCalibrated = true;
            this.hasInitialCalibration = true;
            document.body.removeChild(calibrationOverlay);
            resolve();
          }, 2000);
        }
      }, 1000);
    });
  }

  private async performInitialCalibration(): Promise<void> {
    if (
      this.hasInitialCalibration ||
      !this.isEyeTrackingEnabled ||
      !this.webgazerStarted
    ) {
      return;
    }

    console.log("Performing initial eye tracking calibration...");

    return new Promise((resolve) => {
      const calibrationOverlay = document.createElement("div");
      calibrationOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 28px;
        text-align: center;
      `;

      calibrationOverlay.innerHTML = `
        <h2>🎯 Initial Eye Tracking Setup</h2>
        <p>Look at the CENTER of your screen</p>
        <p>This will only happen once!</p>
        <p>Setting up in <span id="countdown">3</span> seconds...</p>
        <div style="width: 30px; height: 30px; background: #00ff00; border-radius: 50%; margin-top: 20px;"></div>
      `;

      document.body.appendChild(calibrationOverlay);

      let countdown = 3;
      const countdownElement = calibrationOverlay.querySelector("#countdown");

      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
          countdownElement.textContent = countdown.toString();
        }

        if (countdown <= 0) {
          clearInterval(countdownInterval);

          // Collect center point data for 2 seconds
          const centerData: GazeData[] = [];
          const dataCollection = setInterval(() => {
            if (this.gazeHistory.length > 0) {
              centerData.push(this.gazeHistory[this.gazeHistory.length - 1]);
            }
          }, 100);

          setTimeout(() => {
            clearInterval(dataCollection);

            // Calculate center point
            if (centerData.length > 0) {
              this.centerX =
                centerData.reduce((sum, data) => sum + data.x, 0) /
                centerData.length;
              console.log(
                "Initial calibration complete. Center X:",
                this.centerX
              );
            }

            this.isCalibrated = true;
            this.hasInitialCalibration = true;
            document.body.removeChild(calibrationOverlay);
            resolve();
          }, 2000);
        }
      }, 1000);
    });
  }

  private stabilizeGaze(data: GazeData): GazeData {
    this.gazeHistory.push(data);
    if (this.gazeHistory.length > this.historySize) {
      this.gazeHistory.shift();
    }

    // Use median instead of average for better stability
    const sortedX = this.gazeHistory.map((p) => p.x).sort((a, b) => a - b);
    const sortedY = this.gazeHistory.map((p) => p.y).sort((a, b) => a - b);

    const medianX = sortedX[Math.floor(sortedX.length / 2)];
    const medianY = sortedY[Math.floor(sortedY.length / 2)];

    return { x: medianX, y: medianY };
  }
  private processGaze(data: GazeData) {
    if (!this.isGameActive || !this.isCalibrated || !this.isEyeTrackingEnabled)
      return;

    const stableGaze = this.stabilizeGaze(data);
    const dx = stableGaze.x - this.centerX;

    let targetLane = this.currentLane;
    if (Math.abs(dx) > this.CENTER_DEAD_ZONE) {
      if (dx < -this.LANE_THRESHOLD) {
        targetLane = 1; // Left lane
      } else if (dx > this.LANE_THRESHOLD) {
        targetLane = 3; // Right lane
      } else {
        targetLane = 2; // Center lane
      }
    } else {
      targetLane = 2; // Stay in center if within dead zone
    }

    // Only trigger action if lane changed
    if (targetLane !== this.currentLane) {
      this.switchToLane(targetLane);
    }

    this.updateVisualFeedback(targetLane);
  }
  private switchToLane(targetLane: number) {
    const now = Date.now();
    if (now - this.lastAction < this.debounceTime) {
      return;
    }

    this.lastAction = now;
    const currentLane = this.currentLane;

    console.log(`Switching from lane ${currentLane} to lane ${targetLane}`);

    // Calculate how many moves needed
    const moves = targetLane - currentLane;

    if (moves > 0) {
      // Move right
      for (let i = 0; i < moves; i++) {
        setTimeout(() => {
          this.simulateKeyPress("ArrowRight");
        }, i * 100);
      }
    } else if (moves < 0) {
      // Move left
      for (let i = 0; i < Math.abs(moves); i++) {
        setTimeout(() => {
          this.simulateKeyPress("ArrowLeft");
        }, i * 100);
      }
    }

    this.currentLane = targetLane;
  }
  private updateVisualFeedback(activeLane: number) {
    if (!this.isEyeTrackingEnabled) return;

    const lanes = ["left", "center", "right"];
    lanes.forEach((lane, index) => {
      const element = document.getElementById(`lane-${lane}`);
      if (element) {
        const laneNumber = index + 1;
        if (laneNumber === activeLane) {
          element.style.background = "rgba(255, 255, 0, 0.4)"; // Yellow for active
          element.style.borderColor = "rgba(255, 255, 0, 0.8)";
          element.style.transform = "scale(1.05)";
        } else {
          // Default colors
          if (lane === "left") {
            element.style.background = "rgba(255, 0, 0, 0.1)";
            element.style.borderColor = "rgba(255, 0, 0, 0.5)";
          } else if (lane === "center") {
            element.style.background = "rgba(0, 255, 0, 0.1)";
            element.style.borderColor = "rgba(0, 255, 0, 0.5)";
          } else {
            element.style.background = "rgba(0, 0, 255, 0.1)";
            element.style.borderColor = "rgba(0, 0, 255, 0.5)";
          }
          element.style.transform = "scale(1)";
        }
      }
    });
  }

  private simulateKeyPress(code: string) {
    const event = new KeyboardEvent("keydown", {
      code: code,
      key: code.replace("Arrow", ""),
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    console.log(`Eye tracking: ${code}`);
  }

  public async startEyeTracking() {
    if (!this.isEyeTrackingEnabled) {
      console.log("Eye tracking disabled - not starting WebGazer");
      return;
    }

    if (this.webgazerStarted) {
      console.log("WebGazer already started");
      return;
    }

    console.log("Starting simplified eye tracking...");

    this.setupVisualFeedback();

    try {
      await webgazer
        .setGazeListener((data: GazeData | null) => {
          if (data) {
            this.processGaze(data);
          }
        })
        .begin();

      this.webgazerStarted = true;
      console.log("WebGazer started successfully");
      setTimeout(async () => {
        if (!this.hasInitialCalibration) {
          await this.performInitialCalibration();
          console.log("Eye tracking ready!");
        }
      }, 3000); // 3 second delay to let WebGazer stabilize
    } catch (error) {
      console.error("WebGazer failed to start:", error);
    }
  }
  public setEyeTrackingEnabled(enabled: boolean) {
    this.isEyeTrackingEnabled = enabled;
    console.log(`Eye tracking: ${enabled ? "ENABLED" : "DISABLED"}`);

    if (!enabled) {
      // Stop WebGazer if it's running
      try {
        if (this.webgazerStarted) {
          webgazer.end();
          this.webgazerStarted = false;
          console.log("WebGazer stopped");
        }
      } catch (error) {
        console.log("WebGazer was not running");
      }

      // Hide visual elements
      const overlay = document.getElementById("lane-overlay");
      if (overlay) {
        overlay.style.display = "none";
      }

      // Reset calibration flags
      this.isCalibrated = false;
      this.hasInitialCalibration = false;
    }
  }
  public setGameActive(active: boolean) {
    this.isGameActive = active;
    if (active) {
      this.currentLane = 2; // Reset to center when game starts
    }
    console.log(`Eye tracking game mode: ${active ? "ACTIVE" : "INACTIVE"}`);
  }

  public toggleVisualFeedback() {
    if (!this.isEyeTrackingEnabled) {
      console.log("Eye tracking disabled - visual feedback not available");
      return;
    }

    const overlay = document.getElementById("lane-overlay");
    if (overlay) {
      overlay.style.display =
        overlay.style.display === "none" ? "block" : "none";
    }
  }

  public getCurrentLane(): number {
    return this.currentLane;
  }
  public recalibrate() {
    if (!this.isEyeTrackingEnabled) {
      console.log("Eye tracking disabled - calibration not available");
      return;
    }

    if (!this.webgazerStarted) {
      console.log("WebGazer not started - cannot calibrate");
      return;
    }

    console.log("Manual recalibration requested");
    this.isCalibrated = false; // Reset calibration status
    this.quickCalibration(); // Perform manual calibration
  }
  public isReady(): boolean {
    return (
      this.isEyeTrackingEnabled &&
      this.webgazerStarted &&
      this.hasInitialCalibration
    );
  }
  public getCalibrationStatus(): string {
    if (!this.isEyeTrackingEnabled) return "Eye tracking disabled";
    if (!this.webgazerStarted) return "WebGazer not started";
    if (!this.hasInitialCalibration) return "Initial calibration pending";
    if (!this.isCalibrated) return "Calibration needed";
    return "Ready";
  }
}
export const eyeTrackingController = new SimpleEyeTrackingController();

export function setupEyeControls(enableEyeTracking = true) {
  console.log(
    `Setting up eye controls - Eye tracking: ${
      enableEyeTracking ? "ENABLED" : "DISABLED"
    }`
  );

  eyeTrackingController.setEyeTrackingEnabled(enableEyeTracking);

  if (enableEyeTracking) {
    // Only start eye tracking if enabled
    eyeTrackingController.startEyeTracking();

    // Keyboard shortcuts only for eye tracking mode
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        console.log("Manual recalibration requested via Ctrl+C");
        eyeTrackingController.recalibrate();
      }
      if (e.ctrlKey && e.key === "v") {
        e.preventDefault();
        eyeTrackingController.toggleVisualFeedback();
      }
    });
  } else {
    console.log("Audio mode - Eye tracking and camera disabled");
  }
}
