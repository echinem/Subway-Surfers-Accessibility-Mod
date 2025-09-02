<template>
  <div class="score_container">
    <div class="score_panel">
      <div>
        <span class="label">Fraction:</span>
        <span class="value">{{ score }}</span>
      </div>
      <div>
        <span class="label">Gold Coins:</span>
        <span class="value">{{ coin }}</span>
      </div>
      <div>
        <span class="label">Errors:</span>
        <span class="value">{{ mistake }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
const props = defineProps({
  score: { type: Number, default: 0 },
  coin: { type: Number, default: 0 },
  mistake: { type: Number, default: 0 },
});
</script>

<style scoped>
.score_container {
  width: 100vw;
  height: 100vh;
  position: relative;
  z-index: 999;
}

.score_panel {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background-color: #333;
  color: #fff;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  padding: 16px;
  gap: 8px;
}

.label {
  font-weight: 600;
  margin-right: 5px;
  color: #ddd;
}

.value {
  font-weight: bold;
  color: #00ffcc;
}
</style>
