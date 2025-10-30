<template>
  <!-- 适配 vue2 使用 view 包裹-->
  <view>
    <message-item-common
      v-show="isShow"
      :message="message"
      :customLongPressOptions="bubbleMenuOptions"
      @selectPopupItem="onSelectPopupItem"
      @resend="resendMediaMessage(props.message.messageId || 0);"
      customResend>
      <message-bubble :reverse="message.messageDirection === 1" @myMounted="isShow = true">
        <view :class="isMeSend ? 'rc-audio-out' : 'rc-audio-in'"
          :style="{ width: audioContainerWidth + 'px' }"
          @tap.stop.prevent="onPlayAudio"
        >
          <view class="rc-audio-dur">{{ message.content.duration}}″</view>
          <view :class="['rc-audio-icon-wrapper', isPlaying ? 'rc-audio-playing' : '']">
            <RCIcon v-if="isMeSend" type="voiceOut" />
            <RCIcon v-else type="voiceIn" />
          </view>
        </view>
      </message-bubble>
    </message-item-common>
    <!-- STT 展示区（位于气泡下方） -->
    <view :class="['rc-stt', isMeSend ? 'rc-stt-reverse' : '']" v-if="showSTTArea">
      <!-- 转换中 -->
      <view v-if="isConverting" :class="[isMeSend ? '' : 'rc-stt-loading-reverse']">
        <view class="rc-stt-text" :class="{'rc-stt-text-popup':showSTTPopup}">
          <view class="rc-stt-loading">
            <view class="rc-stt-loading-dot"></view>
            <view class="rc-stt-loading-dot"></view>
            <view class="rc-stt-loading-dot"></view>
          </view>
        </view>
      </view>
      <!-- 失败态 -->
      <view v-else-if="hasError" :class="[isMeSend ? '' : 'rc-stt-loading-reverse']">
        <view class="rc-stt-text rc-stt-text-error" :class="{'rc-stt-text-popup':showSTTPopup}">
          <RCIcon type="warning2" />
          <view class="rc-stt-text-error-text">语音转换失败</view>
        </view>
      </view>
      <!-- 成功态：文本展示 -->
      <long-press-popup v-else :options="sttLongPressOptions" @select="onSTTTextMenu" @showStatusChange="handlePopupChange">
        <view class="rc-stt-text" :class="{'rc-stt-text-popup':showSTTPopup}">
          {{ sttText }}
        </view>
      </long-press-popup>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
* 高清语音消息组件
*/
import MessageItemCommon from '../message-item-common.vue';
import {
 PropType, computed, ref, onUnmounted,
} from '../../../../adapter-vue';
import { autorun } from 'mobx';
import { MessageItemType } from '../message-item.vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import { ErrorCode, MessageDirection, SentStatus } from '@rongcloud/imlib-next';
import { AudioManager } from '../manager/audio-manager';
import { resendMediaMessage } from '@/RCUIKit/utils/upload';
import MessageBubble from '../message-bubble.vue';
import { events } from '@/RCUIKit/constant/events';
import LongPressPopup from '@/RCUIKit/components/long-press-popup.vue';

declare const defineProps: <T>(props: T) => any;

const props = defineProps({
  message: {
    type: Object as PropType<MessageItemType>,
    required: true,
  },
});

const isMeSend = ref(props.message.messageDirection === MessageDirection.SEND);
const audioManager = AudioManager.getInstance();
const isPlaying = computed(() => audioManager.getIsPlaying().value && audioManager.isCurrentAudio(props.message.messageUId));

// ====== STT 相关状态 ======
const sttStore = () => uni.$RongKitStore.speechToTextStore;
const sttText = ref('');
const isConverting = ref(false);
const hasError = ref(false);
const isExpanded = ref(false);
const showSTTArea = computed(() => isExpanded.value && (isConverting.value || hasError.value || !!sttText.value));
const showSTTPopup = ref(false);

// STT 功能开关
const isSTTEnabled = ref(false);

const settings = uni.$RongIMLib.getAppSettings();

if (settings) {
  isSTTEnabled.value = !!settings.isSpeechToTextEnabled;
}

const disposeSTT = autorun(() => {
  const uid = props.message.messageUId;
  // 当 STT 结果为空字符串时，用一个空格占位以确保渲染
  sttText.value = sttStore().getSTTText(uid) || ' ';
  isConverting.value = sttStore().isConverting(uid);
  hasError.value = sttStore().hasError(uid);
  console.log('disposeSTT', isExpanded.value, isConverting.value, hasError.value, sttText.value);
  // 展开状态下，STT 文本或状态变化会影响列表高度，保持底部
  if (isExpanded.value && (isConverting.value || hasError.value || !!sttText.value) && (uni as any).$RCIsAtBottom) {
    setTimeout(() => uni.$emit(events.SCROLL_TO_BOTTOM), 0);
    setTimeout(() => uni.$emit(events.SCROLL_TO_BOTTOM), 120);
  }
});

const isMessageInSendingOrFailed = computed(() => [SentStatus.SENDING, SentStatus.FAILED].includes(props.message.sentStatus!));

const bubbleMenuOptions = computed(() => {
  const list: any[] = [];
  // 仅当功能开关开启，且消息非发送中/发送失败时展示
  if (!isSTTEnabled.value || isMessageInSendingOrFailed.value) return list;

  if (!isExpanded.value) {
    list.push({ label: '转文字', type: 'stt' });
  } else {
    list.push({ label: '取消转文字', type: 'sttCancel' });
  }
  return list;
});

const handlePopupChange = (show: boolean) => {
  showSTTPopup.value = show;
};

const onSelectPopupItem = async (type: string) => {
  if (type === 'stt') {
    if (!isSTTEnabled.value || isMessageInSendingOrFailed.value) return;
    isExpanded.value = true;
    // 命中缓存时立即展示
    // 当缓存的 STT 结果为空字符串时，用一个空格占位以确保渲染
    sttText.value = sttStore().getSTTText(props.message.messageUId) || ' ';
    // 展开区域会增加内容高度，iOS/H5 不会自动保持底部，这里手动触底
    if ((uni as any).$RCIsAtBottom) {
      // 让布局先刷新再滚动，分两次触发提升稳定性
      setTimeout(() => uni.$emit(events.SCROLL_TO_BOTTOM), 0);
      setTimeout(() => uni.$emit(events.SCROLL_TO_BOTTOM), 120);
    }
    const result = await triggerSTT();
    if (!result) {
      isExpanded.value = false;
      return;
    }
    // 触发转换后再次尝试保持底部（避免异步状态切换导致未触底）
    if ((uni as any).$RCIsAtBottom) {
      setTimeout(() => uni.$emit(events.SCROLL_TO_BOTTOM), 50);
    }
  } else if (type === 'sttCancel') {
    if (!isSTTEnabled.value || isMessageInSendingOrFailed.value) return;
    // 折叠转换结果不清缓存
    isExpanded.value = false;
  }
};

const triggerSTT = async () => {
  if (uni.$RongKitStore.connectStatus.get() !== uni.$RongIMLib.RCConnectionStatus.CONNECTED) {
    uni.showToast({ title: '当前网络不可用，无法转文字，请检查网络设置后再试', icon: 'none' });
    return false;
  }
  if (isConverting.value) return;
  const code = await sttStore().requestForMessage({ ...props.message } as any);
  if (code === ErrorCode.SPEECH_TO_TEXT_MESSAGE_CONTENT_UNSUPPORTED) {
    uni.showToast({ title: '此语音消息格式不支持转文字功能', icon: 'none' });
    return false;
  }
  // 仅当当前在底部时才保持滚动到底部
  if ((uni as any).$RCIsAtBottom) {
    setTimeout(() => uni.$emit(events.SCROLL_TO_BOTTOM), 50);
  }
  return true;
};

const onCopySTT = () => {
  if (!sttText.value) return;
  uni.setClipboardData({ data: sttText.value });
};

// 转换文本长按菜单
const sttLongPressOptions = [
  { label: '复制', type: 'copy' },
  { label: '取消转文字', type: 'sttCancel' },
];

const onSTTTextMenu = (type: string) => {
  if (type === 'copy') {
    onCopySTT();
  }
  if (type === 'sttCancel') {
    isExpanded.value = false;
  }
};

// 解决头条小程序平台多层组件嵌套时，组件生命周期乱序导致子组件渲染延迟问题，表现为渲染卡顿
const isShow = ref(true);
// #ifdef MP-TOUTIAO
isShow.value = false;
// #endif

// 音频消息宽度
const audioContainerWidth = computed(() => {
  const { duration } = props.message.content;
  const minWidth = 50;
  const maxWidth = 240;
  const maxDuration = 60;
  const width = minWidth + ((maxWidth - minWidth) / maxDuration) * (duration - 1);
  return Math.min(Math.max(minWidth, width), maxWidth);
});

const onPlayAudio = async () => {
  if (props.message.localTmpPath) {
    await audioManager.playAudio(props.message.messageUId, props.message.localTmpPath);
    return;
  }

	if (uni.$RongKitStore.connectStatus.get() !== uni.$RongIMLib.RCConnectionStatus.CONNECTED) {
		uni.showToast({
      title: '当前网络不可用',
      icon: 'none',
		});
		return;
	}

  if (!props.message.content.remoteUrl) {
    uni.showToast({
      title: '音频文件不存在',
      icon: 'none',
    });
    return;
  }
  await audioManager.playAudio(props.message.messageUId, props.message.content.remoteUrl);
};

// 停止音频
const onStopAudio = () => {
  if (audioManager.isCurrentAudio(props.message.messageUId)) {
    audioManager.stopAudio();
  }
};
// 组件卸载时停止播放
onUnmounted(() => {
  onStopAudio();
  disposeSTT();
});

</script>

<style lang="scss" scoped>
@use '../../../../styles/_variables.scss' as var;
.rc-audio-in,
.rc-audio-out {
  width: 50px;
  display: flex;
  cursor: pointer;
  justify-content: flex-end;
  align-items: center;
  padding: 10px;

  .rc-audio-dur {
    font-size: var.$rc-font-size-regular;
  }

  .rc-audio-icon-wrapper {
    height: 24px;
    display: flex;
    align-items: center;
  }
  .rc-audio-playing {
    animation: playing 1s infinite;
  }
}

.rc-audio-out {
  .rc-audio-icon-wrapper {
    margin-left: 6px;
  }
}

.rc-audio-in {
  flex-direction: row-reverse;
  .rc-audio-icon-wrapper {
    margin-right: 6px;
  }
}

.rc-stt {
  max-width: calc(100vw - 100px);
  margin-left: 84rpx;
  padding: 0px 8px;
  margin-right: 2.625rem;
  display: flex;
  cursor: pointer;
  align-items: center;
}
.rc-stt-reverse {
  margin-right: 84rpx;
  justify-content: flex-end;
}
.rc-stt-text-error {
  display: flex;
  align-items: center;
}
.rc-stt-text-error-text {
  margin: 0 8px;
  color: #A0A5AB;
}
.rc-stt-text {
  white-space: pre-wrap;
  word-break: break-word;
  color: var.$rc-color-font-primary;
  background-color: var.$rc-color-bg-auxiliary-1;
  padding: 8px 9px;
  border-radius: 20px;
  font-size: var.$rc-font-size-regular;
}
.rc-stt-text-popup {
  background-color: #EAEAEA;
}
@keyframes playing {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
.rc-stt-loading-reverse {
  display: flex;
  cursor: pointer;
  justify-content: flex-start;
  align-items: center;
}
.rc-stt-loading,
.rc-stt-loading .rc-stt-loading-dot {
  position: relative;
  box-sizing: border-box;
}

.rc-stt-loading {
  display: block;
  font-size: 0;
  color: #000;
}

.rc-stt-loading.la-dark {
  color: #333;
}

.rc-stt-loading .rc-stt-loading-dot {
  display: inline-block;
  float: none;
  background-color: currentColor;
  border: 0 solid currentColor;
}

.rc-stt-loading {
  width: 54px;
  padding: 6px 0;
}

.rc-stt-loading .rc-stt-loading-dot:nth-child(1) {
  animation-delay: -200ms;
}

.rc-stt-loading .rc-stt-loading-dot:nth-child(2) {
  animation-delay: -100ms;
}

.rc-stt-loading .rc-stt-loading-dot:nth-child(3) {
  animation-delay: 0ms;
}

.rc-stt-loading .rc-stt-loading-dot {
  width: 6px;
  height: 6px;
  margin: 4px;
  border-radius: 100%;
  animation: ball-pulse 1s ease infinite;
}

.rc-stt-loading.la-sm {
  width: 26px;
  height: 8px;
}

.rc-stt-loading.la-sm .rc-stt-loading-dot {
  width: 4px;
  height: 4px;
  margin: 2px;
}

.rc-stt-loading.la-2x {
  width: 108px;
  height: 36px;
}

.rc-stt-loading.la-2x .rc-stt-loading-dot {
  width: 20px;
  height: 20px;
  margin: 8px;
}

.rc-stt-loading.la-3x {
  width: 162px;
  height: 54px;
}

.rc-stt-loading.la-3x .rc-stt-loading-dot {
  width: 30px;
  height: 30px;
  margin: 12px;
}

@keyframes ball-pulse {
  0%,
  60%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  30% {
    opacity: 0.1;
    transform: scale(0.01);
  }
}

</style>
