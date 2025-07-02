<template>
  <view class="rc-chat">
    <!-- 导航栏 -->
    <nav-bar :border="true" leftIcon="left" :leftWidth="80" :rightWidth="80"  @touchmove.stop.prevent="() => {}">
      <template v-slot:left>
        <view class="rc-chat-nav-left">
          <RCIcon type="left" clickable @click="backToConversation"/>
          <Badge :count="unreadCount"/>
        </view>
      </template>
      <template v-slot:default>
        <view class="navi-title">
          {{ nickname }}
        </view>
      </template>
    </nav-bar>

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
 ref, onUnmounted, onMounted, computed,
} from '../../adapter-vue';
import { IKitConversation, IKitMessage } from '@rongcloud/imkit-store';
import { MessageItemType } from './message/message-item.vue';
import { deepClone } from '@/RCUIKit/utils';
import { events } from '@/RCUIKit/constant/events';
import { ConversationType } from '@rongcloud/imlib-next';
import { onHide } from '@dcloudio/uni-app';
import { AudioManager } from './message/manager/audio-manager';

const nickname = ref('');
// 未读消息数
const unreadCount = ref(0);

const openedConversation = ref<IKitConversation | null>(null);

const backToConversation = () => {
  uni.$RongKitStore.conversationStore.openConversation(null);
  uni.navigateBack();
};

const nicknameDisposer = autorun(() => {
  openedConversation.value = uni.$RongKitStore.conversationStore.openedConversation;
  nickname.value = openedConversation.value?.nickName || openedConversation.value?.name || openedConversation.value?.targetId || '';
});
const isShowMessageInput = computed(() => openedConversation.value?.conversationType !== ConversationType.SYSTEM);

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
