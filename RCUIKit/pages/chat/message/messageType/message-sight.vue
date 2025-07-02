<template>
  <message-item-common :message="message" @resend="resendMediaMessage(props.message.messageId || 0);" customResend>
    <message-bubble :reverse="message.messageDirection === 1">
      <view class="rc-sight">
        <view class="video-message-container">
          <!-- 缩略图展示 -->
          <view class="video-thumbnail" :style="style" @click="handlePlay" v-if="!isPlaying">
            <image :src="base64" class="thumbnail-image" :style="style" mode="scaleToFill" @load="onLoad"/>
            <view class="play-icon">
              <RCIcon type="play" :size="88" />
            </view>
          </view>
        </view>
      </view>
    </message-bubble>
  </message-item-common>
</template>

<script setup lang="ts">
/**
* 视频消息组件
*/
import { ref } from '../../../../adapter-vue';
import MessageItemCommon from '../message-item-common.vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import { defineProps, PropType } from '../../../../adapter-vue';
import { MessageItemType } from '../message-item.vue';
import { resendMediaMessage } from '@/RCUIKit/utils/upload';
import { calcImageSize } from '@/RCUIKit/utils';
import MessageBubble from '../message-bubble.vue';
import { AudioManager } from '../manager/audio-manager';

const props = defineProps({
  message: {
    type: Object as PropType<MessageItemType>,
    required: true,
  },
});

const style = ref('');
const isPlaying = ref(false);
const base64 = `data:image/jpeg;base64,${props.message.content.content}`;

// 图片加载完成，计算图片宽高，宽高超过 IMAGE_THUMBNAIL_MAX_SHOW_SIZE 时，按 IMAGE_THUMBNAIL_MAX_SHOW_SIZE 计算
const onLoad = (e: any) => {
  const { width, height } = e.detail;
  const { showWidth, showHeight } = calcImageSize(width, height);
  style.value = `width: ${showWidth}px; height: ${showHeight}px;`;
};

// 处理播放
const handlePlay = () => {
  const { openedConversation } = uni.$RongKitStore.conversationStore;
  const converstaionKey = openedConversation?.key;
  // 如果当前有音频在播放，则停止播放
  AudioManager.getInstance().stopAudio();
  uni.navigateTo({
    url: `/RCUIKit/pages/chat/video-play?messageKey=${props.message.key}&conversationKey=${converstaionKey}`,
  });
};
</script>

<style lang="scss" scoped>
@use '../../../../styles/_variables.scss' as var;

.video-message-container {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
  }
}
.video-thumbnail {
  height: 180px;
}

.play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

</style>
