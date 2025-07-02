<template>
  <view v-if="count > 0" class="rc-badge" :style="badgeStyle">
    <text class="rc-badge-text">{{ displayCount }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from '../adapter-vue';

const props = defineProps({
  count: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 99,
  },
  color: {
    type: String,
    default: '#FFFFFF',
  },
  bgColor: {
    type: String,
    default: '#F74D43',
  },
});

const displayCount = computed(() => (props.count > props.max ? `${props.max}+` : props.count));

const badgeStyle = computed(() => ({
  backgroundColor: props.bgColor,
  color: props.color,
}));
</script>

<style lang="scss" scoped>
@use '../styles/_variables.scss' as var;
.rc-badge {
  max-width: 60rpx;
  padding: 0 8px;
  height: 40rpx;
  border-radius: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var.$rc-font-size-base;
}
</style>
