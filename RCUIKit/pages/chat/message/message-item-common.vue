<template>
<view class="rc-common-wrapper" :class="{reverse: message.messageDirection === 1}">
  <view class="rc-common-avatar">
    <avatar :size="84" :defaultSrc="portrait"/>
  </view>

  <view class="rc-common-info">
    <view class="rc-common-info-name" v-if="message.conversationType === 3 && message.messageDirection === 2">
     {{ message.user.groupNickname || message.user.nickname || message.senderUserId }}
    </view>
    <view class="rc-common-info-content">
      <long-press-popup :options="options" @select="handleSelect" @showStatusChange="(data: boolean) => { emit('selectStatusChange', data) }">
        <slot/>
      </long-press-popup>
    </view>
  </view>

  <!-- 消息发送状态 -->
  <view class="rc-common-send-status" v-if="message.messageDirection === 1">
    <RCIcon v-if="message.sentStatus === SentStatus.SENDING" type="sending" :spin="true" :size="32"/>
    <RCIcon v-else-if="message.sentStatus === SentStatus.FAILED" type="sendError":size="32" @click="resendMessage" clickable/>
  </view>

</view>
</template>

<script setup lang="ts">
/**
 * 常规消息容器组件
 */
import {
 defineProps, PropType, computed, defineEmits,
} from 'vue';
import Avatar from '@/RCUIKit/components/avatar.vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import { MessageItemType } from './message-item.vue';
import { ConversationType, ErrorCode, SentStatus } from '@rongcloud/imlib-next';

import { DEFAULT_USER_PORTRAIT_SVG, DEFAULT_SYSTEM_PORTRAIT_SVG } from '@/RCUIKit/assets';
import { events } from '@/RCUIKit/constant/events';
import LongPressPopup, { IOptionType } from '@/RCUIKit/components/long-press-popup.vue';
import { AudioManager } from './manager/audio-manager';

const props = defineProps({
  /**
   * 消息
   */
  message: {
    type: Object as PropType<MessageItemType>,
    required: true,
  },
  /**
   * 自定义重发事件
   */
  customResend: {
    type: Boolean,
    default: false,
  },
  /**
   * 自定义弹框选项
   */
  customLongPressOptions: {
    type: Array as PropType<IOptionType[]>,
    default: () => [],
  },
});

const emit = defineEmits({
  /**
   * 选择弹框选项
   */
  selectPopupItem: (type: string) => true,
  /**
   * 选择状态改变
   */
  selectStatusChange: (data: boolean) => true,
  /**
   * 重发消息
   */
  resend: () => true,
});

const portrait = computed(() => {
  switch (props.message.conversationType) {
    case ConversationType.SYSTEM:
      return props.message.user.portraitUri || DEFAULT_SYSTEM_PORTRAIT_SVG;
    default:
      return props.message.user.portraitUri || DEFAULT_USER_PORTRAIT_SVG;
  }
});

const options = computed(() => {
  const list = [
    ...props.customLongPressOptions,
  ];
  if (![SentStatus.FAILED, SentStatus.SENDING].includes(props.message.sentStatus!)) {
    list.push({
      label: '转发',
      type: 'forward',
    });
  }
  if (props.message.messageDirection === 1 && ![SentStatus.FAILED, SentStatus.SENDING].includes(props.message.sentStatus!)) {
    list.push({
      label: '撤回',
      type: 'recall',
    });
  }
  if (props.message.conversationType !== ConversationType.SYSTEM && ![SentStatus.FAILED, SentStatus.SENDING].includes(props.message.sentStatus!)) {
    list.push(
      {
        label: '回复',
        type: 'reply',
      },
    );
  }
  return list;
});

/**
 * 引用消息
 */
const referenceMessage = () => {
  uni.$emit(events.REFERENCE_MESSAGE, props.message);
};

/**
 * 重发消息
 */
const resendMessage = async () => {
  if (props.customResend) {
    emit('resend');
    return;
  }
  const { code } = await uni.$RongKitStore.messageStore.sendMessage(uni.$RongKitStore.conversationStore.openedConversation!.key, {
    messageType: props.message.messageType,
    content: props.message.content,
    isPersited: props.message.isPersited,
    isCounted: props.message.isCounted,
  }, {
    isMentioned: props.message.isMentioned,
    messageId: props.message.messageId,
  });
  if (code !== ErrorCode.SUCCESS) {
    uni.showToast({
      title: `error: ${code}`,
    });
  }
};

/**
 * 撤回消息
 */
const recallMessage = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要撤回这条消息吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({
          title: '撤回中...',
        });
        await uni.$RongKitStore.messageStore.recallMessage(props.message);
        uni.hideLoading();
        uni.$emit(events.SCROLL_TO_BOTTOM);
        uni.$emit(events.RECALL_MESSAGE, props.message);
      }
    },
  });
};

/**
 * 转发消息
 */
const forwardMessage = () => {
  uni.$RongKitStore.messageStore.setSelectedMessages([props.message]);
  uni.navigateTo({
    url: '/RCUIKit/pages/chat/forward-message',
  });
};

/**
 * 选择事件处理
 */
const handleSelect = (type: string) => {
  // 操作消息前停止音频播放
  AudioManager.getInstance().stopAudio();
  switch (type) {
    case 'recall':
      recallMessage();
      break;
    case 'forward':
      forwardMessage();
      break;
    case 'reply':
      referenceMessage();
      break;
    default:
      emit('selectPopupItem', type);
      break;
  }
};
</script>

<style lang="scss" scoped>
@use '../../../styles/_variables.scss' as var;
.rc-common-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  align-items: start;
}
.reverse {
  flex-direction: row-reverse;
  .rc-common-info-name {
    text-align: right;
  }
}

.rc-common-info {
  padding: 0 8px;
  max-width: calc(100vw - 100px);
  &-name {
    font-size: var.$rc-font-size-small;
    color: var.$rc-color-font-primary;
    line-height: 28rpx;
    padding-bottom: 6px;
    overflow: hidden;
    max-width: 60vw;
		/* #ifndef APP-NVUE */
		white-space: nowrap;
		text-overflow: ellipsis;
		/* #endif */
		/* #ifdef APP-NVUE */
		lines: 1;
		text-overflow: ellipsis;
		/* #endif */
  }
}

.rc-common-send-status {
  padding-top: 10px;
}

</style>
