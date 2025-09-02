<template>
  <div v-if="showMask" class="game-mask">
    <div class="message">
      Please press<span class="key">{{ displayKey }}</span>
      {{ textCompute.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, computed, watch, onMounted, nextTick } from "vue";

const props = defineProps({
  showMask: { type: Boolean, default: false },
  gameStatus: { type: String, default: "ready" },
});
const displayKey = computed(() =>
  textCompute.value?.key === "Space" ? "Spacebar" : textCompute.value?.key
);

const keyMap: Record<string, any> = {
  ready: {
    key: "Enter",
    text: "Start Game",
  },
  end: {
    key: "Space",
    text: "Restart Game",
  },
};

const textCompute = computed(() => {
  return keyMap[props.gameStatus];
});

// Speech synthesis function
const speakKeyInstruction = (key: string, action: string) => {
  if ("speechSynthesis" in window) {
    // Cancel any existing speech
    speechSynthesis.cancel();

    const spokenKey = key === "Space" ? "the spacebar" : key;
    const gameover = key === "Space" ? "Game Over" : "";
    const utterance = new SpeechSynthesisUtterance(
      `${gameover} Please press ${spokenKey} to ${action}`
    );
    utterance.rate = 1.5; // Moderate speed for clarity
    utterance.volume = 0.8; // Good audibility
    utterance.pitch = 1.1; // Slightly higher pitch for attention

    // Add event listeners for debugging
    utterance.onstart = () => console.log("Speech started");
    utterance.onend = () => console.log("Speech ended");
    utterance.onerror = (event) => console.error("Speech error:", event);

    speechSynthesis.speak(utterance);
  }
};

// Function to trigger speech with proper timing
const triggerSpeech = () => {
  if (textCompute.value) {
    console.log("Triggering speech for:", textCompute.value);
    speakKeyInstruction(textCompute.value.key, textCompute.value.text);
  }
};

// Handle initial load speech
onMounted(() => {
  console.log(
    "Component mounted, showMask:",
    props.showMask,
    "gameStatus:",
    props.gameStatus
  );
  nextTick(() => {
    if (props.showMask) {
      console.log("Triggering initial speech after mount");
      // Longer delay for initial speech on mount
      setTimeout(triggerSpeech, 1000);
    }
  });
});

// Watch for when the mask becomes visible (not on initial load)
watch(
  () => props.showMask,
  (newShowMask, oldShowMask) => {
    // Only trigger if mask wasn't shown before (avoid initial load)
    if (newShowMask && oldShowMask === false) {
      console.log("Mask became visible, gameStatus:", props.gameStatus);
      setTimeout(triggerSpeech, 500);
    }
  }
);

// Watch for gameStatus changes while mask is visible
watch(
  () => props.gameStatus,
  (newGameStatus) => {
    console.log(
      "Game status changed to:",
      newGameStatus,
      "showMask:",
      props.showMask
    );
    if (props.showMask) {
      // Delay to ensure computed value is updated
      setTimeout(triggerSpeech, 300);
    }
  }
);
</script>

<style scoped>
.game-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.message {
  font-size: 24px;
  color: white;
  text-align: center;
}

.key {
  background-color: #3498db;
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
}
</style>
