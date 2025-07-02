<template>
  <message-item-common :message="message" @resend="resendMediaMessage(props.message.messageId || 0);" customResend>
    <message-bubble :reverse="message.messageDirection === 1">
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
</template>

<script setup lang="ts">
/**
* 高清语音消息组件
*/
import MessageItemCommon from '../message-item-common.vue';
import {
 defineProps, PropType, computed, ref, onUnmounted,
} from '../../../../adapter-vue';
import { MessageItemType } from '../message-item.vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import { MessageDirection } from '@rongcloud/imlib-next';
import { AudioManager } from '../manager/audio-manager';
import { resendMediaMessage } from '@/RCUIKit/utils/upload';
import MessageBubble from '../message-bubble.vue';

const props = defineProps({
  message: {
    type: Object as PropType<MessageItemType>,
    required: true,
  },
});

const isMeSend = ref(props.message.messageDirection === MessageDirection.SEND);
const audioManager = AudioManager.getInstance();
const isPlaying = computed(() => audioManager.getIsPlaying().value && audioManager.isCurrentAudio(props.message.messageUId));

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
    // animation: playing 1s infinite;
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
</style>
