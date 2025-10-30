<template>
  <view v-if="showIndicator" class="rc-read-receipt">
    <!-- 单聊：未读/已读 图标 -->
    <view v-if="isPrivate" class="rc-read-private">
      <RCIcon v-if="!isPeerRead" type="unread" :size="30" />
      <RCIcon v-else type="read" :size="30" />
    </view>
    <!-- 群聊：简化饼图（已读比例） -->
    <view v-else class="rc-read-group" @click.stop="openGroupReceiptPanel">
      <RCIcon v-if="readCount === 0" type="unread" :size="30" />
      <view v-else-if="!isAllRead" class="rc-pie">
        <view class="rc-pie-fill" :style="getPieStyle()" />
      </view>
      <view v-else class="rc-pie-all-read">
        <RCIcon type="read" :size="30" />
      </view>
    </view>
  </view>
  <view v-else />

</template>

<script setup lang="ts">
import {
 computed, defineProps, PropType, ref,
} from '../../../adapter-vue';
import { ConversationType, MessageDirection, SentStatus } from '@rongcloud/imlib-next';
import type { IKitMessage } from '@rongcloud/imkit-store';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';

const props = defineProps({
  message: {
    type: Object as PropType<IKitMessage>,
    required: true,
  },
  enable: {
    type: Boolean,
    default: false,
  },
});

const isSender = computed<boolean>(() => (props.message as any).messageDirection === MessageDirection.SEND);
const isPrivate = computed<boolean>(() => (props.message as any).conversationType === ConversationType.PRIVATE);
const hasReceipt = computed<boolean>(() => (props.message as any)?.needReceipt === true);

// 单聊：已读判断
const isPeerRead = computed(() => {
  // 仅展示给发送方
  if (!isSender.value) return true; // 接收方不展示状态
  const { readReceiptInfo } = props.message as any;
  return readReceiptInfo?.readCount > 0;
});

// 群聊：从 readReceiptInfo 获取已读数量
const readCount = computed(() => {
  const rr: any = (props.message as any).readReceiptInfo;
  if (!rr) return 0;
  if (typeof rr.readCount === 'number') return rr.readCount;
  return 0;
});

// 群聊：从 readReceiptInfo 获取总人数
const unreadCount = computed(() => {
  const rr: any = (props.message as any).readReceiptInfo;
  if (!rr) return 0;
  return rr.unreadCount;
});

const showIndicator = computed(() => {
  if (!props.enable) return false;
  if (!hasReceipt.value) return false; // 无 needReceipt 或为 false 不展示
  if (!isSender.value) return false; // 仅发送方展示
  if ((props.message as any).conversationType === ConversationType.SYSTEM) return false;
  // 发送中/失败时不展示阅读状态
  if ((props.message as any).sentStatus === SentStatus.SENDING || (props.message as any).sentStatus === SentStatus.FAILED) return false;
  return true;
});

const ratio = computed(() => readCount.value / (readCount.value + unreadCount.value));

const isAllRead = computed(() => readCount.value > 0 && readCount.value === (readCount.value + unreadCount.value));

function getPieStyle() {
  const deg = Math.round(360 * ratio.value);
  return { backgroundImage: `conic-gradient(#51E174 0 ${deg}deg, transparent ${deg}deg 360deg)` } as any;
}

async function openGroupReceiptPanel() {
  if (!props.enable || isPrivate.value || !isSender.value) return;
  // 仅群聊展示
  if ((props.message as any).conversationType !== ConversationType.GROUP) return;
  // 跳转到“消息阅读状态”页
  const msg = props.message as any;
  uni.navigateTo({
    url: `/RCUIKit/pages/chat/read-receipt-status?messageUId=${encodeURIComponent(msg.messageUId || '')}`,
  });
}
</script>

<style scoped lang="scss">
.rc-read-receipt {
  min-width: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 8rpx;
}
.rc-read-private {
  display: flex;
  align-items: center;
  justify-content: center;
}
.rc-icon-circle {
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  border: 2rpx solid #999;
}
.rc-icon-check {
  font-size: 22rpx;
  color: #07C160;
}
.rc-read-group {
  display: flex;
  align-items: center;
}
.rc-pie {
  position: relative;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: transparent;
  border: 2rpx solid #51E174;
  overflow: hidden;
}
.rc-pie-fill {
  position: absolute;
  inset: 1px; // 1px 间距
  border-radius: 50%;
}

/* 回执面板样式 */
.rc-rr-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.35);
  z-index: 9999;
}
.rc-rr-panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top-left-radius: 16rpx;
  border-top-right-radius: 16rpx;
  max-height: 65vh;
  display: flex;
  flex-direction: column;
}
.rc-rr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #eee;
}
.rc-rr-title { font-size: 28rpx; font-weight: 600; }
.rc-rr-close { font-size: 36rpx; padding: 0 10rpx; }
.rc-rr-tabs {
  display: flex;
  padding: 0 12rpx;
}
.rc-rr-tab {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  color: #666;
}
.rc-rr-tab.active { color: #07C160; border-bottom: 4rpx solid #07C160; }
.rc-rr-list { flex: 1; padding: 8rpx 16rpx; }
.rc-rr-item {
  display: flex;
  align-items: center;
  padding: 12rpx 6rpx;
}
.rc-rr-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; margin-right: 16rpx; background: #eee; }
.rc-rr-name { font-size: 26rpx; color: #333; }
.rc-rr-empty { text-align: center; color: #999; padding: 30rpx 0; }
</style>
