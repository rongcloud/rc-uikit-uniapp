<template>
  <message-item-common :message="message"  @resend="resendMediaMessage(props.message.messageId || 0);" customResend>
    <view :class="['rc-image', isLoading ? '' : 'rc-image-bg']" :style="style" >
      <view v-if="isGIF && isLoading" class="loading-container">
        <view class="loading-spinner"></view>
      </view>
      <image :src="imageUrl" :style="style" mode="scaleToFill" @load="onLoad" @click="onImageClick"/>
    </view>
  </message-item-common>
</template>

<script setup lang="ts">
/**
* 图片，GIf消息组件
*/
import MessageItemCommon from '@/RCUIKit/pages/chat/message/message-item-common.vue';
import {
 defineProps, PropType, computed, ref, onMounted,
} from '../../../../adapter-vue';
import { MessageItemType } from '@/RCUIKit/pages/chat/message/message-item.vue';
import { MessageType } from '@rongcloud/imlib-next';
import { resendMediaMessage } from '@/RCUIKit/utils/upload';
import { calcImageSize } from '@/RCUIKit/utils';
import { IMAGE_THUMBNAIL_MAX_SHOW_SIZE } from '@/RCUIKit/constant';
import { AudioManager } from '../manager/audio-manager';

const props = defineProps({
  message: {
    type: Object as PropType<MessageItemType>,
    required: true,
  },
});

const emit = defineEmits<{(e: 'image-click', uri: string): void
}>();

const style = ref(`width: 100px; height: ${IMAGE_THUMBNAIL_MAX_SHOW_SIZE}px;`);
const isLoading = ref(true);
const isGIF = props.message.messageType === MessageType.GIF;

onMounted(() => {
  if (isGIF) {
    const { width, height } = props.message.content;
    const { showWidth, showHeight } = calcImageSize(width, height);
    style.value = `width: ${showWidth}px; height: ${showHeight}px;`;
  }
});

// 优先使用缩略图，没有缩略图使用远端 uri
const imageUrl = computed(() => {
  if (isGIF) {
    return props.message.content.remoteUrl;
  }
  // 优先使用 base64 缩略图，没有 base64 缩略图使用远端 uri, base64 缩略图需要拼接头信息
  const base64 = `data:image/jpeg;base64,${props.message.content.content}`;
  return props.message.content.content ? base64 : props.message.content.imageUri;
});

// 图片加载完成，计算图片宽高，宽高超过 IMAGE_THUMBNAIL_MAX_SHOW_SIZE 时，按 IMAGE_THUMBNAIL_MAX_SHOW_SIZE 计算
const onLoad = (e: any) => {
  const { width, height } = e.detail;
  const { showWidth, showHeight } = calcImageSize(width, height);
  style.value = `width: ${showWidth}px; height: ${showHeight}px;`;
  isLoading.value = false;
};

const onImageClick = () => {
  let uri = props.message.content.imageUri;
  // 如果是 GIF 消息，使用 remoteUrl
  if (props.message.messageType === MessageType.GIF) {
    uri = props.message.content.remoteUrl;
  }
  uri = uri || props.message.localTmpPath;
  AudioManager.getInstance().stopAudio();
  emit('image-click', uri);
};
</script>

<style lang="scss" scoped>
@use '../../../../styles/_variables.scss' as var;
.rc-image-bg {
  image {
    background-color: var.$rc-color-bg-auxiliary-1;
  }
}
.rc-image{
  max-width: IMAGE_THUMBNAIL_MAX_SHOW_SIZEpx;
  max-height: IMAGE_THUMBNAIL_MAX_SHOW_SIZEpx;
  position: relative;
  image {
    // background-color: var.$rc-color-bg-auxiliary-1;
    border-radius: 20px;
  }

  .loading-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 20px;
  }

  .loading-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
