<template>
  <view class="rc-chat">
     <!-- #ifdef MP-TOUTIAO -->
     <!-- 头条小程序获取缩略图时，需要一个隐藏的canvas，用于获取图片的尺寸信息 -->
		<canvas id="rc-canvas-help" style="position: absolute; top: -10000px" type="2d"></canvas>
     <!-- #endif -->
    <!-- 导航栏 -->
	<!-- #ifndef MP-TOUTIAO -->
    <nav-bar :border="true" leftIcon="left" :leftWidth="80" :rightWidth="80"  @touchmove.stop.prevent="() => {}">
      <template v-slot:left>
        <view class="rc-chat-nav-left">
          <RCIcon type="left" clickable @click="backToConversation"/>
          <Badge :count="unreadCount"/>
        </view>
      </template>
      <template v-slot:default>
        <view class="navi-title">
          {{ titleText }}
        </view>
      </template>
    </nav-bar>
	<!-- #endif -->
    <!-- 消息列表区域 -->
    <view class="rc-chat-message-list" @touchstart="handleTouchMessageListStart">
      <MessageList/>
    </view>
    <!-- 底部输入框区域 -->
    <view class="bottom-nav">
      <MessageInput v-if="isShowMessageInput"/>
    </view>
  </view>
</template>

<script setup lang="ts">
import NavBar from '@/RCUIKit/components/nav-bar.vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import Badge from '@/RCUIKit/components/badge.vue';
import MessageList from './message/message-list.vue';
import MessageInput from './message/messageInput/message-input.vue';
import { autorun } from 'mobx';
import {
 ref, onUnmounted, computed,
} from '../../adapter-vue';
import { IKitConversation } from '@rongcloud/imkit-store';
import { events } from '@/RCUIKit/constant/events';
import { ConversationType, MessageType } from '@rongcloud/imlib-next';
import { onHide } from '@dcloudio/uni-app';
import { AudioManager } from './message/manager/audio-manager';
import { onReady } from '@dcloudio/uni-app';

const nickname = ref('');
const isTyping = ref(false);
// 未读消息数
const unreadCount = ref(0);

const openedConversation = ref<IKitConversation | null>(null);

const backToConversation = () => {
  uni.$RongKitStore.conversationStore.openConversation(null);
  uni.navigateBack();
};

onReady(() => {
	// #ifdef MP-TOUTIAO
	uni.setNavigationBarTitle({
    title: nickname.value,
	});
	// #endif
});
// navi title
let title = ref('');
const nicknameDisposer = autorun(() => {
  openedConversation.value = uni.$RongKitStore.conversationStore.openedConversation;
  nickname.value = openedConversation.value?.nickName || openedConversation.value?.name || openedConversation.value?.targetId || '';
  if (openedConversation.value) {
    const conv = {
      conversationType: openedConversation.value.conversationType,
      targetId: openedConversation.value.targetId,
      channelId: openedConversation.value.channelId,
    } as any;
    const typing = uni.$RongKitStore.typingStore.isTyping(conv);
    isTyping.value = typing.active;
    title.value = nickname.value;
    if (typing.active) {
      // 根据 typing 的 messageType 决定展示内容
      const hasText = typing.list.some((u: any) => u.messageType === MessageType.TEXT);
      title.value = hasText ? '对方正在输入中...' : '对方正在讲话...';
    }
  }

  // #ifdef MP-TOUTIAO
  uni.setNavigationBarTitle({
    title: title.value,
  });
  // #endif
});

// 监听 typingMap 的变化，实时刷新标题
const typingDisposer = autorun(() => {
  if (!openedConversation.value) return;
  const conv = {
    conversationType: openedConversation.value.conversationType,
    targetId: openedConversation.value.targetId,
    channelId: openedConversation.value.channelId,
  };
  const key = uni.$RongKitStore.typingStore.getTypingMapKey(conv);
  const sub = uni.$RongKitStore.typingStore.typingMap.get(key);
  const size = sub ? sub.size : 0;
  isTyping.value = size > 0;
});

const isShowMessageInput = computed(() => openedConversation.value?.conversationType !== ConversationType.SYSTEM);

const titleText = computed(() => {
  const naviTitle = isTyping.value ? title.value : nickname.value;
  // #ifdef MP-TOUTIAO
  uni.setNavigationBarTitle({
    title: naviTitle,
  });
  // #endif
  return naviTitle;
});

const handleTouchMessageListStart = () => {
  // 延迟 100ms 后触发事件，解决点击区域错位的问题
  setTimeout(() => {
    uni.$emit(events.RESET_MESSAGE_INPUT);
  }, 100);
};

/**
 * 未读消息数状态监听
 */
const unreadCountDisposer = autorun(() => {
  unreadCount.value = uni.$RongKitStore.conversationStore.getTotalUnreadCount();
});

onUnmounted(() => {
  nicknameDisposer();
  typingDisposer();
  unreadCountDisposer();
});

onHide(() => {
  AudioManager.getInstance().stopAudio();
});
</script>

<style lang="scss">
	/*每个页面公共css */
  @use '../../styles/common.scss';
</style>
<style lang="scss" scoped>
@use '../../styles/_variables.scss' as var;

.rc-chat {
  display: flex;
  flex-direction: column;
  /* #ifdef H5 */
  height: 100%;
  /* #endif */

  /* #ifndef H5 */
  height: 100vh;
  /* #endif */
  &-nav-left {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  &-message-list {
    flex: 1;
    overflow: hidden;
  }
}
.navi-title {
    flex: 1;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: var.$rc-font-size-large;
    text-align: center;
    line-height: 50px;
		/* #ifndef APP-NVUE */
		white-space: nowrap;
		text-overflow: ellipsis;
		/* #endif */
		/* #ifdef APP-NVUE */
		lines: 1;
		text-overflow: ellipsis;
		/* #endif */
}
.rc-popup-container {
  position: absolute;
  top: 100px;
  left: 100px;
  width: 10%;
  height: 10%;
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
