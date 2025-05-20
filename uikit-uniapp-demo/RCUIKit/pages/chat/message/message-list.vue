<template>
  <scroll-view
    class="rc-message-list"
    scroll-y
    :scrollTop="scrollTop"
    @refresherrefresh="loadMore"
    :refresher-enabled="hasMore"
    :refresher-background="bgColor"
    :refresher-triggered="refreshTriggered"
    @refresherrestore="onRestore"
    :scroll-into-view="scrollIntoView"
  >
    <message-item
      v-for="item in messageList"
      :key="item.key"
      :message="item"
      :id="item.messageUId || item.messageId"
      :time="item.sentTime"
      @image-click="onImageClick"
    />
  </scroll-view>
</template>

<script setup lang="ts">
import {
  ref, onMounted, onUnmounted, PropType,
  nextTick,
} from 'vue';
import MessageItem, { MessageItemType } from './message-item.vue';
import { events } from '@/RCUIKit/constant/events';
import {
 ErrorCode, addEventListener, Events, IMessagesEvent, removeEventListener,
 MessageType,
} from '@rongcloud/imlib-next';
import { autorun } from 'mobx';
import { deepClone } from '@/RCUIKit/utils';
import { IKitConversation, IKitMessage } from '@rongcloud/imkit-store';

const openedConversation = ref<IKitConversation | null>(null);
// 消息列表
const messageList = ref<MessageItemType[]>([]);
// 滚动条位置
const scrollTop = ref(0);
const bgColor = ref('');
// 是否触发刷新
const refreshTriggered = ref<string | boolean>(false);
// 是否正在加载
const isLoading = ref(false);
// 是否还有更多
const hasMore = ref(true);
// 滚动到的消息id
const scrollIntoView = ref('');
// 图片消息 uri 列表
const imageUriList = ref<string[]>([]);
onMounted(async () => {
  initStyle();
  if (messageList.value.length === 0) {
    // 触发一次加载消息
    refreshTriggered.value = true;
  } else {
    setTimeout(() => {
      scrollToBottom();
    }, 10);
  }
  uni.$on(events.SCROLL_TO_BOTTOM, scrollToBottom);
  uni.$on(events.INPUT_STATUS_CHANGE, scrollToBottom);

  addEventListener(Events.MESSAGES, onReceiveMessage);
});

/**
 * 初始化样式
 */
const initStyle = () => {
  // #ifdef WEB
  const color = getComputedStyle(document.getElementsByClassName('rc-message-list')[0])
    .getPropertyValue('background-color')
    .trim();
  bgColor.value = color;
  // #endif
};

/**
 * 格式化消息
 */
const formatMessage = (messages: IKitMessage[]): MessageItemType[] => messages.map((message, index) => {
    const { messageId = 0, messageUId } = message;
    const key = messageId?.toString() || messageUId || '';
    if (index === 0) {
      return { ...message, isShowTime: true, key };
    }
    const { sentTime } = message;
    const lastSentTime = messages[index - 1].sentTime;
    const timeDifference = sentTime - lastSentTime;
    if (timeDifference > 3 * 60 * 1000) {
      return { ...message, isShowTime: true, key };
    }
    return { ...message, isShowTime: false, key };
  });

/**
 * 消息列表状态监听
 */
const msgListDisposer = autorun(() => {
  if (!uni.$RongKitStore.conversationStore.openedConversation) return;

  openedConversation.value = uni.$RongKitStore.conversationStore.openedConversation;
  const list = deepClone<IKitMessage[]>(
    uni.$RongKitStore.messageStore.getMessages(openedConversation.value.key),
  );
  const formatList = formatMessage(list);
  const oldLength = messageList.value.length;
  messageList.value = formatList;
  if (oldLength > messageList.value.length) {
    // 如果消息列表长度减少，则说明有缓存中旧消息被清理，则设置 hasMore 为 true
    hasMore.value = true;
  }
});

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
  scrollTop.value = 999999999;
  setTimeout(() => {
    scrollTop.value += 1;
  }, 100);
};

/**
 * 加载更多
 */
const loadMore = async () => {
  // 热更新后会导致 openedConversation 为空
  if (!uni.$RongKitStore.conversationStore.openedConversation) return;

  if (isLoading.value) {
    return;
  }
  isLoading.value = true;
  refreshTriggered.value = true;

  const lastMsg = messageList.value[0];

  const { code, data } = await uni.$RongKitStore.messageStore.getHistoryMsgList(
    uni.$RongKitStore.conversationStore.openedConversation.key,
    lastMsg ? lastMsg.sentTime : 0, // 如果列表中没有消息，则从当前时间开始查询
    lastMsg?.messageUId, // 如果列表中没有消息，则传 undefined, 表示初次查询列表
  );

  isLoading.value = false;
  refreshTriggered.value = false;

  if (code !== ErrorCode.SUCCESS || !data) {
    if (code === ErrorCode.NOT_IN_GROUP) {
      uni.showToast({
        title: '未加入群组',
        icon: 'none',
      });
      return;
    }
    uni.showToast({
      title: `error:${code}`,
      icon: 'none',
    });
    return;
  }
  nextTick(() => {
    hasMore.value = data.hasMore;
  });

  // 加载更多后要调整滚动条位置
  // 如果加载之前消息列表不为空，则滑动到原始消息位置，否则滑动到底部
  if (lastMsg) {
    const index = messageList.value.findIndex((item) => item.key === lastMsg.key);
    if (index - 1 >= 0) {
      scrollIntoView.value = messageList.value[index - 1].key;
    } else {
      scrollIntoView.value = lastMsg.key;
    }
  } else {
    scrollToBottom();
  }
};

/**
 * 收消息回调
 */
const onReceiveMessage = (messages: IMessagesEvent) => {
  const con = uni.$RongKitStore.conversationStore.openedConversation;
  if (!con) return;
  const message = messages.messages.find((item) => {
    const { conversationType, targetId, channelId } = item;
    const isCurConversation = con.conversationType === conversationType && con.targetId === targetId && con.channelId === channelId;
    if (!isCurConversation) return false;
    return item.isPersited;
  });
  if (!message) return;
  // 收到消息后，清除未读消息数
  uni.$RongKitStore.conversationStore.clearUnreadCount(con.key);
  // 如果包含当前会话的存储消息，需滑动到底部
  if (messageList.value.length <= 60) {
    scrollToBottom();
  }
};

const onRestore = () => {
  refreshTriggered.value = 'restore';
};

onUnmounted(() => {
  removeEventListener(Events.MESSAGES, onReceiveMessage);
  uni.$off(events.INPUT_STATUS_CHANGE, scrollToBottom);
  uni.$off(events.SCROLL_TO_BOTTOM, scrollToBottom);
  msgListDisposer();
});

// 图片点击事件
const onImageClick = (uri: string) => {
  imageUriList.value = [];
  // 获取所有图片消息 uri
  messageList.value.forEach((item) => {
    const isImage = item.messageType === MessageType.IMAGE;
    const isGif = item.messageType === MessageType.GIF;
    if (isImage || isGif) {
      let itemUri = isImage ? item.content.imageUri : item.content.remoteUrl;
      itemUri = itemUri || item.localTmpPath;
      const isExist = !imageUriList.value.includes(itemUri);
      if (isExist) {
        imageUriList.value.push(itemUri);
      }
    }
  });
  // 预览图片索引，如果 uri 不存在，则添加到列表首位
  let uriIndex = imageUriList.value.indexOf(uri);
  if (uriIndex === -1) {
    imageUriList.value.unshift(uri);
    uriIndex = 0;
  }
  uni.previewImage({
    urls: imageUriList.value,
    current: uriIndex,
  });
};
</script>

<style lang="scss" scoped>
@use '../../../styles/_variables.scss' as var;
.rc-message-list {
  background-color: var.$rc-color-bg-regular;
  height: 100%;
}
</style>
