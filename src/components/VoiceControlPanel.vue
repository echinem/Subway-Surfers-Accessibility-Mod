&lt;template&gt;
  &lt;div class="voice-control-panel" v-if="isVoiceControlMode"&gt;
    &lt;div class="voice-status"&gt;
      &lt;div class="mic-indicator" :class="{ active: isListening }"&gt;
        🎤
      &lt;/div&gt;
      &lt;div class="status-text"&gt;
        {{ statusText }}
      &lt;/div&gt;
    &lt;/div&gt;
    &lt;div class="voice-commands" v-if="showCommands"&gt;
      &lt;h4&gt;Voice Commands:&lt;/h4&gt;
      &lt;div class="command-list"&gt;
        &lt;div&gt;• "start game" - Start playing&lt;/div&gt;
        &lt;div&gt;• "jump" - Jump over obstacles&lt;/div&gt;
        &lt;div&gt;• "slide" - Slide under obstacles&lt;/div&gt;
        &lt;div&gt;• "left" / "right" - Move left/right&lt;/div&gt;
        &lt;div&gt;• "restart game" - Restart after game over&lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script lang="ts" setup&gt;
import { ref, onMounted, onUnmounted } from 'vue';
import { gameModeSelector, GameMode } from '../gameMode-selector';
import { getVoiceControlState } from '../voiceControl';

const isVoiceControlMode = ref(false);
const isListening = ref(false);
const showCommands = ref(false);
const statusText = ref('Voice control not active');

let checkInterval: number | null = null;

onMounted(() =&gt; {
  // Check if we're in voice control mode
  const selectedMode = gameModeSelector.getSelectedMode();
  isVoiceControlMode.value = selectedMode === GameMode.VOICE_CONTROL;

  if (isVoiceControlMode.value) {
    // Check voice control state periodically
    checkInterval = setInterval(() =&gt; {
      try {
        const state = getVoiceControlState();
        isListening.value = state.isListening;
        
        if (state.isActive && state.isListening) {
          statusText.value = 'Listening for commands...';
        } else if (state.isActive && !state.isListening) {
          statusText.value = 'Voice control paused';
        } else {
          statusText.value = 'Voice control not active';
        }
      } catch (error) {
        statusText.value = 'Voice control error';
      }
    }, 500);
  }
});

onUnmounted(() =&gt; {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
});

// Toggle command help
const toggleCommands = () =&gt; {
  showCommands.value = !showCommands.value;
};
&lt;/script&gt;

&lt;style scoped&gt;
.voice-control-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px;
  border-radius: 10px;
  z-index: 9999;
  max-width: 300px;
  font-family: Arial, sans-serif;
}

.voice-status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.mic-indicator {
  font-size: 24px;
  padding: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.mic-indicator.active {
  background: rgba(76, 175, 80, 0.8);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.status-text {
  font-size: 14px;
  font-weight: bold;
}

.voice-commands {
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  padding-top: 10px;
}

.voice-commands h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #9b59b6;
}

.command-list {
  font-size: 12px;
  line-height: 1.5;
}

.command-list div {
  margin-bottom: 5px;
}
&lt;/style&gt;
