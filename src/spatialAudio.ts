// Spatial Audio System for Subway Surfers Accessibility
// Handles all audio announcements, warnings, and spatial feedback

interface SpatialAudioState {
  isActive: boolean;
  isPlaying: boolean;
  gameOverAnnounced: boolean;
  gameOverAnnouncementTime: number;
  lastAnnouncementTime: number;
  lastCollisionTime: number;
  lastSideCollisionTime: number;
  announcedTrains: Map<string, { announced: boolean; distance: number }>;
}

interface AudioMessage {
  message: string;
  priority: number;
  id?: string;
}

class SpatialAudioController {
  private state: SpatialAudioState;
  private audioQueue: AudioMessage[] = [];
  private readonly TRAIN_WARNING_DISTANCE = 80;
  private readonly CRITICAL_WARNING_DISTANCE = 40;
  private readonly ANNOUNCEMENT_COOLDOWN = 1000;
  private readonly COLLISION_COOLDOWN = 1500;

  constructor() {
    this.state = {
      isActive: false,
      isPlaying: false,
      gameOverAnnounced: false,
      gameOverAnnouncementTime: 0,
      lastAnnouncementTime: 0,
      lastCollisionTime: 0,
      lastSideCollisionTime: 0,
      announcedTrains: new Map(),
    };
  }

  // Initialize spatial audio system
  initialize(): void {
    this.state.isActive = true;
    console.log('🔊 Spatial Audio System initialized');
  }

  // Reset for new game
  reset(): void {
    this.state.announcedTrains.clear();
    this.audioQueue = [];
    this.state.isPlaying = false;
    this.state.lastAnnouncementTime = 0;
    this.state.gameOverAnnounced = false;
    this.state.gameOverAnnouncementTime = 0;
    this.state.lastCollisionTime = 0;
    this.state.lastSideCollisionTime = 0;
  }

  // Process audio message queue
  private processAudioQueue = (): void => {
    if (this.state.isPlaying || this.audioQueue.length === 0) {
      return;
    }

    this.audioQueue.sort((a, b) => b.priority - a.priority);
    const nextAudio = this.audioQueue.shift();

    if (nextAudio) {
      this.state.isPlaying = true;
      this.speakMessage(nextAudio.message, () => {
        this.state.isPlaying = false;
        setTimeout(() => this.processAudioQueue(), 150);
      });
    }
  };

  // Add message to audio queue
  private addToAudioQueue = (message: string, priority = 1, id?: string): void => {
    // Prevent duplicate messages by ID or content
    if (id) {
      const existingById = this.audioQueue.findIndex((item) => item.id === id);
      if (existingById !== -1) {
        // Update priority if higher
        if (this.audioQueue[existingById].priority < priority) {
          this.audioQueue[existingById].priority = priority;
        }
        return;
      }
    }

    const existingByMessage = this.audioQueue.findIndex(
      (item) => item.message === message
    );
    if (existingByMessage !== -1) {
      if (this.audioQueue[existingByMessage].priority < priority) {
        this.audioQueue[existingByMessage].priority = priority;
      }
      return;
    }

    this.audioQueue.push({ message, priority, id });
    this.processAudioQueue();
  };

  // Speak message using speech synthesis
  private speakMessage = (message: string, onComplete?: () => void): void => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser');
      onComplete?.();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 2.0;
      utterance.volume = 1.0;
      utterance.pitch = 1.3;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        onComplete?.();
      };

      utterance.onerror = () => {
        console.error('Speech synthesis error');
        onComplete?.();
      };

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error creating speech utterance:', error);
      onComplete?.();
    }
  };

  // Main obstacle warning method
  speakObstacleWarning = (
    message: string,
    obstacleType?: string,
    direction?: string,
    isUrgent = false
  ): void => {
    if (!this.state.isActive) return;

    const currentTime = Date.now();
    const cooldown = isUrgent ? 500 : this.ANNOUNCEMENT_COOLDOWN;

    if (obstacleType === 'wall' || obstacleType === 'obstacle') {
      if (currentTime - this.state.lastSideCollisionTime < this.COLLISION_COOLDOWN) {
        return;
      }
      this.state.lastSideCollisionTime = currentTime;
    } else {
      if (currentTime - this.state.lastAnnouncementTime < cooldown) {
        return;
      }
      this.state.lastAnnouncementTime = currentTime;
    }

    let finalMessage = message;
    let priority = isUrgent ? 8 : 5;
    const messageId = `${obstacleType}_${direction}_${Date.now()}`;

    if (obstacleType === 'train') {
      finalMessage = `Train ${direction || 'ahead'}!`;
    }

    this.addToAudioQueue(finalMessage, priority, messageId);
  };

  // Game over announcement
  speakGameOver = (): void => {
    const currentTime = Date.now();

    // Prevent repeated game over announcements
    if (
      this.state.gameOverAnnounced &&
      currentTime - this.state.gameOverAnnouncementTime < 3000
    ) {
      return;
    }

    this.state.gameOverAnnounced = true;
    this.state.gameOverAnnouncementTime = currentTime;

    // Clear all other audio and speak game over
    speechSynthesis.cancel();
    this.audioQueue = [];
    this.state.isPlaying = false;

    this.speakMessage('Game Over! Press Spacebar to restart.');
  };

  // Train proximity warning
  announceTrainProximity = (
    trainId: string,
    trainLane: string,
    playerLane: string,
    distance: number
  ): void => {
    let trackingData = this.state.announcedTrains.get(trainId);
    if (!trackingData) {
      trackingData = { announced: false, distance };
      this.state.announcedTrains.set(trainId, trackingData);
    }

    trackingData.distance = distance;

    const isInPlayerLane = trainLane === playerLane;
    const isAdjacent = Math.abs(
      this.getLaneNumber(playerLane) - this.getLaneNumber(trainLane)
    ) === 1;

    if (distance <= this.CRITICAL_WARNING_DISTANCE && !trackingData.announced) {
      if (isInPlayerLane) {
        this.speakObstacleWarning(
          `Train in ${trainLane} lane!`,
          'train',
          `${trainLane} lane`,
          true
        );
      } else if (isAdjacent) {
        this.speakObstacleWarning(
          `Train very close in ${trainLane}!`,
          'train',
          `${trainLane} lane`,
          true
        );
      }
      trackingData.announced = true;
    } else if (distance <= this.TRAIN_WARNING_DISTANCE && !trackingData.announced) {
      if (isInPlayerLane) {
        this.speakObstacleWarning(
          `Train ahead in ${trainLane} lane!`,
          'train',
          `${trainLane} lane`
        );
      } else if (isAdjacent) {
        this.speakObstacleWarning(
          `Train approaching ${trainLane} lane!`,
          'train',
          `${trainLane} lane`
        );
      }
      trackingData.announced = true;
    }

    // Clean up old train announcements
    if (distance > this.TRAIN_WARNING_DISTANCE * 2) {
      this.state.announcedTrains.delete(trainId);
    }
  };

  // Helper method to get lane number
  private getLaneNumber(laneName: string): number {
    switch (laneName) {
      case 'left':
        return 1;
      case 'center':
        return 2;
      case 'right':
        return 3;
      default:
        return 2;
    }
  }

  // Get current lane name from way number
  getCurrentLaneName(way: number): string {
    switch (way) {
      case 1:
        return 'left';
      case 2:
        return 'center';
      case 3:
        return 'right';
      default:
        return 'center';
    }
  }

  // Get train lane from x position
  getTrainLane(trainX: number): string {
    const roadWidth = 15;
    const threeRoad = [-roadWidth / 3, 0, roadWidth / 3];

    let closestLane = 0;
    let minDistance = Math.abs(trainX - threeRoad[0]);

    for (let i = 1; i < threeRoad.length; i++) {
      const distance = Math.abs(trainX - threeRoad[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestLane = i;
      }
    }

    switch (closestLane) {
      case 0:
        return 'left';
      case 1:
        return 'center';
      case 2:
        return 'right';
      default:
        return 'center';
    }
  }

  // Check if cooldown periods have passed
  canAnnounce(type: 'collision' | 'general'): boolean {
    const currentTime = Date.now();
    if (type === 'collision') {
      return currentTime - this.state.lastCollisionTime >= this.COLLISION_COOLDOWN;
    }
    return currentTime - this.state.lastAnnouncementTime >= this.ANNOUNCEMENT_COOLDOWN;
  }

  // Update collision time
  updateCollisionTime(): void {
    this.state.lastCollisionTime = Date.now();
  }

  // Stop all audio
  stop(): void {
    speechSynthesis.cancel();
    this.audioQueue = [];
    this.state.isPlaying = false;
    this.state.isActive = false;
  }
}

// Create and export the singleton instance
export const spatialAudioController = new SpatialAudioController();

// Export for backward compatibility and easy usage
export const initializeSpatialAudio = () => {
  spatialAudioController.initialize();
};

export const resetSpatialAudio = () => {
  spatialAudioController.reset();
};

export const stopSpatialAudio = () => {
  spatialAudioController.stop();
};
