<template>
  <long-press-popup :options="options" @select="handleSelect" @showStatusChange="handlePopupChange" position="touch">
    <!-- 会话 item -->
    <view
      :class="['rc-con-item', data.isTop && 'rc-con-item-top', isOpenedPopup && 'rc-con-item-active']"
      @click="handleConversationItemClick">
      <!-- 左侧头像 -->
      <avatar :src="data.portraitUri" :size="104" class="rc-con-item-avatar" />

      <!-- 中间内容 -->
      <view class="rc-con-item-middle">
        <!-- 会话名称 -->
        <view class="rc-con-item-middle-name">
          <view class="rc-con-item-middle-name-text">{{ data.name }}</view>
          <view class="rc-con-item-middle-name-icon"><rcicon  v-if="data.notificationLevel > 0" type="notify" :size="32" /></view>
        </view>
        <!-- 消息内容 -->
        <view class="rc-con-item-middle-message">
          <rcicon v-if="data.draft.length > 0" class="rc-draft-icon" type="draft" :size="28" />
          <rcicon v-else-if="data.latestMessage && data.latestMessage.sentStatus === SentStatus.FAILED" class="rc-draft-icon" type="sendError" :size="28" />
          <rcicon v-else-if="data.latestMessage && data.latestMessage.sentStatus === SentStatus.SENDING" class="rc-draft-icon" type="sending" :spin="true" :size="28" />
          <view class="rc-con-item-middle-message-text">{{ latestMessage }}</view>
        </view>
      </view>

      <!-- 右侧时间和未读数 -->
      <view class="rc-con-item-bottom">
        <view class="rc-con-item-bottom-time" v-text="formatTime(data.updateTime)" ></view>
        <badge class="rc-con-item-bottom-badge" v-if="data.unreadCount > 0" :bgColor="unreadCountBgColor" :count="data.unreadCount" />
      </view>
    </view>
  </long-press-popup>
</template>

<script setup lang="ts">
import {
 PropType, ref, computed, defineProps, defineEmits,
} from 'vue';
import { IKitConversation } from '@rongcloud/imkit-store';
import badge from '@/RCUIKit/components/badge.vue';
import avatar from '@/RCUIKit/components/avatar.vue';
import rcicon from '@/RCUIKit/components/rc-icon.vue';
import { formatTime, parseMessage2Text } from '@/RCUIKit/utils/index';
import LongPressPopup from '@/RCUIKit/components/long-press-popup.vue';
import { MessageDirection, MessageType, SentStatus } from '@rongcloud/imlib-next';
import { reaction } from 'mobx';
import { onUnmounted } from 'vue';

const props = defineProps({
  // 会话数据
  data: {
    type: Object as PropType<IKitConversation>,
    required: true,
  },
  // 长按弹窗开启状态
  openedPopup: {
    type: String,
    default: '',
  },
});

onUnmounted(() => {
  if (disposeReaction) {
    disposeReaction();
  }
});

// 事件通知
const emit = defineEmits([
  'item-click', // 会话 item 点击事件
  'popup-change', // 长按弹窗状态变化事件
]);

// 长按菜单选项
const options = computed(() => [
  {
    type: props.data.isTop ? 'menuCancelTop' : 'menuTop',
    label: props.data.isTop ? '取消置顶' : '置顶',
  },
  {
    type: props.data.notificationLevel > 0 ? 'menuUnmuted' : 'menuMuted',
    label: props.data.notificationLevel > 0 ? '取消免打扰' : '免打扰',
  },
  {
    type: 'menuDel',
    label: '删除',
  },
]);

// 未读消息背景色
const unreadCountBgColor = computed(() => props.data.notificationLevel > 0 ? '#C1C1C1' : '#F74D43');

// 撤回消息会话列表展示内容
const recallMsgContent = ref('');

// 监听撤回消息特定用户的信息变化
let disposeReaction: (() => void) | null = null;

// 获取撤回消息的显示文本
const getRecallMessageText = (userName: string = '') => `${userName} 撤回了一条消息`;

// 处理撤回消息的用户信息
const handleRecallMessageUser = (userId: string) => {
  const user = uni.$RongKitStore.appData.getUserProfile(userId);
  if (user) {
    recallMsgContent.value = getRecallMessageText(user.name);
    return true;
  }

  // 清理之前的 reaction
  if (disposeReaction) {
    disposeReaction();
    disposeReaction = null;
  }

  disposeReaction = reaction(
    () => uni.$RongKitStore.appData.getUserInfo(userId),
    (userData) => {
      if (userData?.id === userId) {
        recallMsgContent.value = getRecallMessageText(userData.name);
      }
    },
    { fireImmediately: true },
  );
  return false;
};

// 会话最后一条消息展示
const latestMessage = computed(() => {
  // 处理草稿
  if (props.data.draft) {
    try {
      const draft = JSON.parse(props.data.draft).content;
      return draft.trim();
    } catch (error) {
      return '';
    }
  }

  // 处理没有消息的情况
  if (!props.data.latestMessage) {
    return '';
  }

  // === 如需处理自定义消息会最后一条消息展示需要在此处增加逻辑 ===
  // 处理实例：
  // const customText = customLatestMessage(props.data.latestMessage);
	// if(customText) {
	// 	return customText;
	// }
  // === end ===

  // 内置消息最后一条消息逻辑展示
  const {
 messageType, messageDirection, senderUserId, content,
} = props.data.latestMessage;

  // 处理撤回消息
  if (messageType === MessageType.RECALL_MESSAGE_TYPE) {
    if (messageDirection !== MessageDirection.RECEIVE) {
      return getRecallMessageText('你');
    }

    handleRecallMessageUser(senderUserId);
    return recallMsgContent.value;
  }

  return parseMessage2Text(messageType, content.content);
});

// 自定义消息最后一条消息展示示例：
// const customLatestMessage = (message: IKitMessage) => {
// 	if(message.messageType === 's:person') { // 需要替换为用户自定义消息类型
// 		return '我是：'+ message.content.name; // 需要展示的自定义消息内容
// 	}
// }

// 长按弹窗开启状态
const isOpenedPopup = computed(() => props.openedPopup === props.data.key);

// 全局是否有长按弹窗开启，全局长按事件禁用左滑
const isOpenedPopupGlobal = computed(() => props.openedPopup !== '');

// 会话 item 点击事件
const handleConversationItemClick = () => {
  if (isOpenedPopup.value) {
    return;
  }
  emit('item-click', props.data);
};

// 长按菜单状态类型
const statusType = {
  menuCancelTop: false,
  menuTop: true,
  menuUnmuted: 0,
  menuMuted: 1,
  menuDel: 0,
};

// 长按菜单点击事件
const handleSelect = (option: keyof typeof statusType) => {
  conversationalOperation(option, statusType[option]);
};

// 长按弹窗状态变化处理
const handlePopupChange = (show: boolean) => {
  emit('popup-change', show, props.data.key);
};

// 会话操作
const conversationalOperation = (operation: string, status: any) => {
  const conversationOption = {
    conversationType: props.data.conversationType,
    targetId: props.data.targetId,
    channelId: props.data.channelId,
  };
  switch (operation) {
    case 'menuCancelTop':
    case 'menuTop':
      uni.$RongIMLib.setConversationToTop(conversationOption, status);
      break;
    case 'menuDel':
      uni.$RongIMLib.removeConversation(conversationOption);
      break;
    case 'menuUnmuted':
    case 'menuMuted':
      uni.$RongIMLib.setConversationNotificationLevel(conversationOption, status);
      break;
  }
};
</script>

<style lang="scss" scoped>
@use '../../styles/_variables.scss' as var;
.rc-slot-icon {
  display: flex;
  justify-content: space-between;
  align-items: center;
  &-base {
    width: 152rpx;
    height: 152rpx;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  &-top {
    background-color: var.$rc-color-bg-auxiliary-2;
  }
  &-del {
    background-color: var.$rc-color-functional-hint;
  }
}

.rc-con-item {
  display: flex;
  align-items: stretch;
  background-color: var.$rc-color-bg-auxiliary-1;
  &-active {
    background-color: var.$rc-color-bg-selected !important;
  }
  &-top {
    background-color: var.$rc-color-bg-top;
  }
  &-avatar {
    margin: 12px var.$rc-conversation-margin-base;
    align-self: center;
    height: auto;
  }

  &-middle {
    flex: 1;
    padding: var.$rc-conversation-margin-base 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;

    &-name {
      font-size: var.$rc-font-size-regular;
      color: var.$rc-color-font-primary;
      font-weight: 400;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      gap: 4px; // 添加间距
      vertical-align: middle; // 确保整体垂直对齐
      box-sizing: border-box;
      display: flex;
      align-items: center;

      // 修复小程序环境下的对齐问题
      /* #ifdef MP-WEIXIN */
      // height: 22px; // 明确容器高度
      ::v-deep .rc-notification-icon {
        position: relative;
        top: 1px; // 微调图标位置
      }
      /* #endif */

      &-icon {
        align-items: center;
        justify-content: center;
        width: 32rpx;
        height: 32rpx;

        /* 深度处理图标组件 */
        ::v-deep .rcicon {
          vertical-align: middle;
          width: 32rpx;  // 明确尺寸
          height: 32rpx; // 保持与容器一致
        }
      }

      &-text {
        align-items: center;
        line-height: normal; // 重置行高
        max-width: 80%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    &-message {
      font-size: var.$rc-font-size-base;
      color: var.$rc-color-font-secondary;
      max-width: 800rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: auto;
      line-height: var.$rc-font-size-base * 1.5;
      align-self: flex-start;
      width: 100%;
      display: flex;
      align-items: center;
      &-text {
        align-items: center;
        line-height: normal;
        max-width: 90%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        white-space: pre;
      }
    }
  }
  &-bottom {
    margin-left: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    margin-right: var.$rc-conversation-margin-base;

    &-time {
      font-size: var.$rc-font-size-small;
      color: var.$rc-color-font-accent;
      margin-top: var.$rc-conversation-margin-base;
    }

    &-badge {
      margin-bottom: var.$rc-conversation-margin-base;
    }
  }
}
.rc-draft-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 4rpx;
}
</style>
