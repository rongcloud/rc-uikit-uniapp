<template>
  <scroll-view
    class="rc-conversation-list"
    scroll-y
    @scrolltolower="loadMore"
  >
    <!-- 会话列表 -->
    <conversation-item
      v-for="item in uiConversations"
      :key="item.key"
      :data="item"
      :openedPopup="openedPopupItem"
      @item-click="handleItemClick"
      @popup-change="handlePopupChange"
    />

    <!-- 空状态 -->
    <view v-if="uiConversations.length === 0 && !hasMoreConversations" class="rc-empty">
      <view class="rc-empty-icon">
        <rcicon type="empty" :size="96" />
      </view>
      <view class="rc-empty-text">
        暂无消息
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import {
 ref, computed, onMounted, onUnmounted,
} from 'vue';
import { IKitConversation } from '@rongcloud/imkit-store';
import ConversationItem from './conversation-item.vue';
import rcicon from '@/RCUIKit/components/rc-icon.vue';
import { deepClone, parseConversationName, generateDefaultAvatar } from '@/RCUIKit/utils';
import { autorun } from 'mobx';
import { calculateContentHeight } from '@/RCUIKit/utils';
import { FIRST_SCREEN_COUNT } from '@/RCUIKit/constant';

const { conversationStore } = uni.$RongKitStore;
// UI 展示会话列表
const uiConversations = ref<IKitConversation[]>([]);
// 是否还有更多会话
const hasMoreConversations = ref(false);

// 生成 UI 展示会话列表
const generateUIConversations = (newUiConversations: IKitConversation[]) => {
  uiConversations.value = newUiConversations.map((conversation: IKitConversation) => {
    // 深拷贝 conversation 对象
    const conversationCopy = deepClone(conversation);
    conversationCopy.name = parseConversationName(conversationCopy) || '';
    conversationCopy.portraitUri = conversationCopy.portraitUri ? conversationCopy.portraitUri : generateDefaultAvatar(conversationCopy.conversationType);
    return conversationCopy;
  });
};

/**
 * 监听 conversationStore.conversations 变化
 * 1. 如果 UI 展示会话列表为空，则展示首屏 10 条数据
 * 2. 如果 UI 展示会话列表不为空，更新获取 UI 展示列表长度
 */
const conversationsWatch = autorun(() => {
  const conversationOriginals = deepClone(conversationStore.conversations);
  const listLength = (uiConversations.value.length === 0 || uiConversations.value.length < FIRST_SCREEN_COUNT) ? FIRST_SCREEN_COUNT : uiConversations.value.length;
  const newUiConversations = conversationOriginals.slice(0, listLength);
  generateUIConversations(newUiConversations);
  hasMoreConversations.value = conversationOriginals.length > listLength;
});

// 打开的长按弹窗 conversation key
const openedPopupItem = ref('');

// 计算列表高度 仅在 web 平台生效
const listHeight = computed(() => calculateContentHeight());

onShow(() => {
  conversationStore.openConversation(null);
});

onMounted(() => {
  // 获取会话列表
  autorun(() => {
    const res = conversationStore.getConversations();
    if (res) {
      const { list, hasMore } = res;
      hasMoreConversations.value = hasMore;

      if (!list || list.length === 0) {
        uiConversations.value = [];
      }
      // 不处理首屏处理结果，通过 autorun 处理
    }
  });
});

onUnmounted(() => {
  conversationsWatch();
});

/**
 * 处理会话列表点击事件
 */
const handleItemClick = (item: IKitConversation) => {
  if (openedPopupItem.value !== '') {
    openedPopupItem.value = '';
    return;
  }
  if (uni.$RongKitStore.conversationStore.openedConversation) {
    return;
  }
  // 设置当前会话
  uni.$RongKitStore.conversationStore.openConversation(item);
  if (item.unreadCount > 0) {
    uni.$RongKitStore.conversationStore.clearUnreadCount(item.key);
  }
  // 页面跳转到聊天页面
  uni.navigateTo({
    url: '/RCUIKit/pages/chat/index',
  });
};

// 处理长按弹窗状态变更
const handlePopupChange = (show: boolean, key: string) => {
  if (show) {
    openedPopupItem.value = key;
    return;
  }
  openedPopupItem.value = '';
};

// 下拉加载更多
const loadMore = () => {
  autorun(() => {
    if (hasMoreConversations.value) {
      const lastConversationIndex = uiConversations.value.length - 1;
      const lastConversation = uiConversations.value[lastConversationIndex];
      const res = conversationStore.getConversations(lastConversation);
      if (res) {
        const { list, hasMore } = res;
        const newUiConversations = [...uiConversations.value, ...list];
        generateUIConversations(newUiConversations);
        hasMoreConversations.value = hasMore;
      }
    }
  });
};
</script>

<style lang="scss" scoped>
@use '../../styles/_variables.scss' as var;

.rc-conversation-list {
  // #ifdef H5
  height: v-bind(listHeight);
  // #endif

  // #ifndef H5
  height: 100%;
  // #endif
  .rc-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 100%;
    color: var.$rc-color-font-accent;
    font-size: var.$rc-font-size-base;
  }

  .rc-context-menu {
    position: fixed;
    z-index: 9999;
    background: var.$rc-color-bg-auxiliary-1;
    border-radius: 10px;
    box-shadow: 0 10px 16px #00000033;
    min-width: 320rpx;
    overflow: hidden;

    /* 多平台适配 */
    /* #ifdef MP-WEIXIN */
    position: absolute;
    transform: translateZ(0);
    z-index: 999;
    /* #endif */

    .rc-menu-item {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      padding: 7px 17px;
      font-size: var.$rc-font-size-base;
      color: var.$rc-color-font-primary;
      margin: 10px;

      .rc-menu-icon {
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        margin-right: 10px;

        /* 深度处理图标组件 */
        ::v-deep .rcicon {
          vertical-align: middle;
          width: 20px;  // 明确尺寸
          height: 20px; // 保持与容器一致
        }
      }

      .rc-menu-text {
        flex: 1;
        align-items: center;
        font-size: var.$rc-font-size-base;
        text-align: right;
        line-height: normal; // 重置行高
      }
    }
  }
}
</style>
