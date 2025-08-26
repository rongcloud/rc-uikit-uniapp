<template>
  <view class="rc-voice-recorder">
    <!-- 录音按钮 -->
    <view
      class="rc-voice-recorder-button"
      @touchstart.prevent="startRecord"
      @touchend.prevent="stopRecord"
      @touchcancel.prevent="stopRecord"
      @touchmove.prevent="handleTouchMove"
    >
      <RCIcon type="recorder2" :size="'18px'" class="rc-voice-recorder-button-icon"/>
      <text class="rc-voice-recorder-button-text">按住说话</text>
    </view>

    <!-- 录音弹窗 -->
    <view class="rc-voice-recorder-modal" v-if="isRecording">
      <!-- 蒙版层 -->
      <view
        class="rc-voice-recorder-mask"
      />

      <!-- 录音框 -->
      <view class="rc-voice-recorder-content" :class="{ 'rc-voice-recorder-content-cancel': isCancel }">
        <RCIcon type="close2"
          :size="'40px'"
          class="rc-voice-recorder-close"
        />
        <!-- 录音动画 -->
        <view class="rc-voice-recorder-animation">
          <RCIcon type="recorder"
            :size="'80px'"
            class="rc-voice-recorder-wave"
            :class="{ 'recording': isRecording }"/>
        </view>
        <!-- 取消提示 -->
        <text class="rc-voice-recorder-cancel-text">{{ isCancel ? '松手取消发送' : '松开发送 | 上划取消' }}</text>
        <!-- 录音时长 -->
        <text class="rc-voice-recorder-time">{{ formatTime(durationTime) }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref, defineProps, PropType } from '../../../../adapter-vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import { throttle } from '@/RCUIKit/utils';

const props = defineProps({
  isRecording: {
    type: Boolean,
    required: true,
  },
  durationTime: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits<{(e: 'start-record'): void,
  (e: 'stop-record', isCancel: boolean): void,
}>();

const isCancel = ref(false);

let startY = 0;

// 开始录音
const startRecord = throttle(async (e: any) => {
  isCancel.value = false;
  startY = e.touches[0].clientY;
  emit('start-record');
}, 1000); // 设置1秒的节流时间

// 停止录音
const stopRecord = () => {
  emit('stop-record', isCancel.value);
};

// 处理手指移动
const handleTouchMove = (e: any) => {
  if (!startY) return;

  const moveY = e.touches[0].clientY;
  const distance = startY - moveY;

  // 上滑超过50像素则标记为取消
  isCancel.value = distance > 250;
};

// 格式化时间
const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

</script>

<style lang="scss" scoped>
@use '../../../../styles/_variables.scss' as var;

.rc-voice-recorder {
    flex: 1;
  &-button {
    background: var.$rc-color-bg-auxiliary-2;
    border-radius: 6px;
    border: 1px solid var.$rc-color-functional-border;
    color: var.$rc-color-font-inverse;
    padding: 7px 10px;
    font-size: var.$rc-font-size-small;
    line-height: 22px;
    text-align: center;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
    &-icon {
      height: 18px;
      margin-right: 5px;
    }
  }

  &-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
  }

  &-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
  }

  &-content {
    position: absolute;
    left: calc((100vw - 1000px) / 2);
    top: 60vh;
    height: 1000px;
    width: 1000px;
    background: var.$rc-color-bg-auxiliary-2;
    border-top-left-radius: 500px;
    border-top-right-radius: 500px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    transition: all 0.3s;

    &-cancel {
      background: #ff4d4f;
      .rc-voice-recorder-cancel-text,
      .rc-voice-recorder-time {
        color: #fff;
      }
    }
  }

  &-cancel-text {
    font-size: var.$rc-font-size-regular;
    color: var.$rc-color-font-inverse;
    margin-bottom: 20px;
  }

  &-close {
    margin-top: -55px;
  }

  &-animation {
    margin: 20px 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &-wave {
    width: 100%;
    height: 100%;

    &.recording {
      animation: wave 1s infinite ease-in-out;
    }
  }

  &-time {
    font-size: 28px;
    color: var.$rc-color-font-inverse;
  }
}

@keyframes wave {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
}
</style>
