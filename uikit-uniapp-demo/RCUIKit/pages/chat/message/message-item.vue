<template>
  <view class="rc-item-wrapper">
    <!-- 时间组件 -->
    <view class="rc-item-timer" v-if="message.isShowTime">
      {{ formatTime(message.sentTime, true) }}
    </view>

    <!-- {{ message.sentTime }} -->

    <!-- 提示消息组件 -->
    <!-- <message-notification></message-notification> -->

    <!-- 文本消息组件 -->
    <message-text
      v-if="message.messageType === MessageType.TEXT || message.messageType === MessageType.REFERENCE"
      :message="message"
    />

    <!-- 图片消息组件 -->
    <message-image
      v-else-if="message.messageType === MessageType.IMAGE || message.messageType === MessageType.GIF"
      :message="message"
      @image-click="onImageClick"
    />

    <!-- 语音消息组件 -->
    <message-audio
      v-else-if="message.messageType === MessageType.HQ_VOICE"
      :message="message"
    />

    <!-- 视频消息组件 -->
    <message-sight
      v-else-if="message.messageType === MessageType.SIGHT"
      :message="message"
    />

    <!-- 文件消息组件 -->
    <message-file
      v-else-if="message.messageType === MessageType.FILE"
      :message="message"
    />

    <!-- 撤回消息组件 -->
    <message-notification v-else-if="message.messageType === MessageType.RECALL_MESSAGE_TYPE">
      {{ message.messageDirection === MessageDirection.RECEIVE ? message.user.nickname : '你' }} 撤回了一条消息
    </message-notification>

    <!-- === 自定义消息组件， 如有多个自定义消息组件，请依次往下添加，需要注意使用 v-else-if 进行判断 === -->
    <!-- <message-custom v-else-if="message.messageType === 's:person'" :message="message" /> -->
    <!-- === end === -->

    <!-- 小灰条消息组件 -->
    <message-notification v-else>暂不支持该消息类型</message-notification>
  </view>

</template>

<script setup lang="ts">
import MessageNotification from './messageType/message-notification.vue';
import MessageText from './messageType/message-text.vue';
import MessageImage from './messageType/message-image.vue';
import MessageSight from './messageType/message-sight.vue';
import MessageAudio from './messageType/message-audio.vue';
import MessageFile from './messageType/message-file.vue';

// 自定义消息组件，如有多个自定义消息组件，请依次往下添加
// 需要注意：此处的路径为示例路径，文件本身不存在，需要根据实际情况进行调整
// import MessageCustom from '@/XXX/custom-message.vue';

import { PropType, defineProps } from 'vue';
import { MessageType, MessageDirection } from '@rongcloud/imlib-next';
import { formatTime } from '@/RCUIKit/utils';
import { IKitMessage } from '@rongcloud/imkit-store';

export interface MessageItemType extends IKitMessage {
  isShowTime: boolean,
  key: string,
}

const props = defineProps({
  message: {
    type: Object as PropType<MessageItemType>,
    required: true,
  },
});

const emit = defineEmits<{(e: 'image-click', uri: string): void
}>();

const onImageClick = (uri: string) => {
  emit('image-click', uri);
};

</script>

<style lang="scss" scoped>
@use '../../../styles/_variables.scss' as var;
.rc-item-wrapper {
  padding: 10px 8px;
}
.rc-item {
  &-timer {
    font-size: var.$rc-font-size-small;
    color: var.$rc-color-font-secondary;
    text-align: center;
    padding: 10px 0;
  }
}
</style>
