<template>
  <scroll-view
    class="rc-message-list"
    scroll-y
    :scrollTop="scrollTop"
    @scroll="onScroll"
    @scrolltolower="onScrollToLower"
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
      :id="String(item.messageUId || item.messageId)"
      :domId="String(item.messageUId || item.messageId)"
      :time="item.sentTime"
      @image-click="onImageClick" />
  </scroll-view>
</template>

<script setup lang="ts">
import {
  ref, onMounted, onUnmounted, nextTick, getCurrentInstance,
} from '../../../adapter-vue';
import MessageItem, { MessageItemType } from './message-item.vue';
import { events } from '@/RCUIKit/constant/events';
import {
 ErrorCode, addEventListener, Events, IMessagesEvent, removeEventListener,
 MessageType,
} from '@rongcloud/imlib-next';
import { autorun } from 'mobx';
import { deepClone } from '@/RCUIKit/utils';
import { IKitConversation, IKitMessage } from '@rongcloud/imkit-store';
import { ConversationType } from '@rongcloud/imlib-next';

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
const containerHeight = ref(0);
const isAtBottom = ref(true);
let measureTimer: number | null = null;
let sendTimer: number | null = null;
let intersectionObserver: any = null;
const visibleIdSet = new Set<string>();

// #ifdef MP-WEIXIN || MP-TOUTIAO
// 组件实例（仅在 setup 初始化阶段获取一次，避免在异步回调中为 null）
const instanceRef = getCurrentInstance && getCurrentInstance();
const componentProxy = instanceRef && (instanceRef as any).proxy;
const componentScope = componentProxy && (componentProxy as any).$scope
  ? (componentProxy as any).$scope
  : componentProxy;
// #endif

/**
 * 计算当前可视区域内的消息并发送 V5 回执（仅对接收向且未回执消息）
 */
const measureVisibleAndSendV5 = () => {
  try {
    if (!uni.$RongKitStore.enableReadV5) return;
    const con = uni.$RongKitStore.conversationStore.openedConversation as any;
    if (!con || con.conversationType === ConversationType.SYSTEM) return;
    if (!Array.isArray(messageList.value) || messageList.value.length === 0) return;

    const query = uni.createSelectorQuery();
    // #ifdef MP-WEIXIN
    if (componentScope) {
      query.in(componentScope);
    }
    // #endif

    let containerRect: any = null;
    let classSelector = '.rc-item-wrapper';
    // #ifdef MP-WEIXIN
    classSelector = '.rc-message-list >>> .rc-item-wrapper';
    // #endif
    query
      .select('.rc-message-list')
      .boundingClientRect((rect: any) => { containerRect = rect; })
      .selectAll(classSelector)
      .boundingClientRect((nodes: any) => {
        if (!containerRect) {
          console.warn('processRectNodes containerRect is null');
          return;
        }
        processRectNodes(nodes, containerRect, con);
      })
      .exec();
  } catch (e) {
    console.warn('visible message measure error====', e);
   }
};

// 处理节点矩形数据并发送 V5 回执
function processRectNodes(nodes: any, containerRect: any, con: any) {
  const nodeList = nodes || [];
  const rects: any[] = Array.isArray(nodeList) ? nodeList : [nodeList];
  if (!Array.isArray(rects) || rects.length === 0) return;
  const visibleIds: string[] = [];
  const { top, bottom } = containerRect;
  rects.forEach((r, idx) => {
    if (!r) return;
    const overlap = Math.min(r.bottom, bottom) - Math.max(r.top, top);
    const isVisible = overlap > 0 && overlap >= (r.height || 0) * 0.5; // 50% 可视阈值
    if (!isVisible) return;
    const msg = messageList.value[idx] as any;
    if (msg && msg.messageUId) visibleIds.push(String(msg.messageUId));
  });
  if (visibleIds.length > 0) {
    uni.$RongKitStore.messageStore.sendV5Receipts({ conversationType: con.conversationType, targetId: con.targetId, channelId: con.channelId } as any, visibleIds);
  }
}

/**
 * 使用 IntersectionObserver 监听可视元素（WX/TT 通用）
 */
const setupIntersectionObserver = () => {
  try {
    // 重新创建前先断开旧的
    if (intersectionObserver && intersectionObserver.disconnect) {
      try { intersectionObserver.disconnect(); } catch (e) {
        console.warn('intersection observer disconnect error====', e);
       }
    }
    intersectionObserver = uni.createIntersectionObserver(
      componentProxy,
      { observeAll: true, thresholds: [0.5] } as any,
    );
    intersectionObserver
      .relativeTo('.rc-message-list')
      .observe('.rc-item-wrapper', (res: any) => {
        try {
          const ratio = res?.intersectionRatio || 0;
          const id = res?.id; // 消息 uid
          if (!id) return;
          if (ratio >= 0.5) {
            visibleIdSet.add(String(id));
          } else {
            visibleIdSet.delete(String(id));
          }
          // 节流发送
          if (sendTimer) clearTimeout(sendTimer as any);
          sendTimer = setTimeout(() => {
            const con = uni.$RongKitStore.conversationStore.openedConversation;
            if (!con || con.conversationType === ConversationType.SYSTEM) return;
            const list = messageList.value || [];
            const idSet = new Set(Array.from(visibleIdSet));
            const uids = list
              .filter((m: any) => m && !!m.messageUId && idSet.has(String(m.messageUId)))
              .map((m: any) => String(m.messageUId));
            if (uids.length > 0) {
              uni.$RongKitStore.messageStore.sendV5Receipts({ conversationType: con.conversationType, targetId: con.targetId, channelId: con.channelId }, uids);
            }
          }, 120) as any;
        } catch (e) {
          console.warn('intersection observer observe error====', e);
         }
      });
  } catch (e) {
    console.warn('intersection observer setup error====', e);
   }
};

onMounted(async () => {
  initStyle();
  // 记录容器高度
  setTimeout(() => {
    const query = uni.createSelectorQuery();
    // #ifdef MP-WEIXIN
    if (componentScope) {
      query.in(componentScope);
    }
    // #endif
    query
      .select('.rc-message-list')
      .boundingClientRect((rect: any) => {
        if (rect && rect.height) containerHeight.value = rect.height;
      })
      .exec();
  }, 50);

  // #ifdef MP-TOUTIAO
  // 初始化可视监听（WX/TT 通用）
  setupIntersectionObserver();
  // #endif

  if (messageList.value.length === 0) {
    // 触发一次加载消息
    refreshTriggered.value = true;
  } else {
	// #ifdef MP-TOUTIAO
	setTimeout(() => {
    scrollToBottom();
	}, 500);
	// #endif
	// #ifndef MP-TOUTIAO
	setTimeout(() => {
    scrollToBottom();
	}, 10);
	// #endif
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
const formatMessage = (messages: IKitMessage[]): MessageItemType[] => {
	const messageIdList: number[] = [];
	return messages.map((message, index) => {
		const { messageId, messageUId } = message;
		let key = messageUId;
		if (messageId && !messageIdList.includes(messageId)) {
			key = messageId.toString();
			messageIdList.push(messageId);
		}
		if (index === 0) {
      return { ...(message as any), isShowTime: true, key } as MessageItemType;
		}
		const { sentTime } = message;
		const lastSentTime = messages[index - 1].sentTime;
		const timeDifference = sentTime - lastSentTime;
		if (timeDifference > 3 * 60 * 1000) {
      return { ...(message as any), isShowTime: true, key } as MessageItemType;
		}
		return { ...(message as any), isShowTime: false, key } as MessageItemType;
   });
};

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
  // 列表变化后尝试计算一次可视消息（微延时等待渲染）
  // #ifndef MP-TOUTIAO
  setTimeout(() => { measureVisibleAndSendV5(); }, 50);
  // #endif

  // #ifdef MP-TOUTIAO
  // 抖音端：初始化/刷新可视监听，并做一次兜底测量，避免首次未触发
  setupIntersectionObserver();
  setTimeout(() => { measureVisibleAndSendV5(); }, 120);
  // #endif
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

const onScroll = (e: any) => {
  const h = containerHeight.value || 0;
  const top = e?.detail?.scrollTop || 0;
  const sh = e?.detail?.scrollHeight || 0;
  const threshold = 20;
  isAtBottom.value = sh - (top + h) <= threshold;
  // 暴露给子组件查询
  (uni as any).$RCIsAtBottom = isAtBottom.value;
  // 计算可视消息并发送 V5 回执（节流）
  if (measureTimer) clearTimeout(measureTimer as any);
  measureTimer = setTimeout(() => { measureVisibleAndSendV5(); }, 120) as any;
};

const onScrollToLower = () => {
  isAtBottom.value = true;
  (uni as any).$RCIsAtBottom = true;
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
    10,
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
  // #ifdef MP-TOUTIAO
  setTimeout(() => {
  // #endif
    if (lastMsg) {
      const index = messageList.value.findIndex((item) => item.key === lastMsg.key);
      if (index - 1 >= 0) {
        scrollIntoView.value = messageList.value[index - 1].messageUId;
      } else {
        scrollIntoView.value = lastMsg.key;
      }
    } else {
      scrollToBottom();
    }
  // #ifdef MP-TOUTIAO
  }, 500);
  // #endif
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
	// #ifdef MP-TOUTIAO
	setTimeout(() => {
		uni.$emit(events.SCROLL_TO_BOTTOM);
	}, 500);
	// #endif
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
  // #ifdef MP-TOUTIAO
  try {
    if (intersectionObserver && intersectionObserver.disconnect) {
      intersectionObserver.disconnect();
    }
    visibleIdSet.clear();
  } catch (e) { /* noop */ }
  // #endif
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
