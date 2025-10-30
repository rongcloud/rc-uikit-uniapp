<template>
  <view class="rrs">
    <!-- 自定义导航（抖音小程序不使用自定义导航） -->
    <!-- #ifndef MP-TOUTIAO -->
    <nav-bar :border="true" :leftWidth="300">
      <template v-slot:left>
        <view class="rrs-nav-left">
          <RCIcon type="left" clickable @click="goBack" />
          <view class="rrs-title">消息阅读状态</view>
        </view>
      </template>
    </nav-bar>
    <!-- #endif -->

    <!-- 顶部消息摘要（文本或图片占位），与参考图一致可后续替换更完整摘要 -->
    <view class="rrs-msg">
      <view class="rrs-msg-top">
        <text class="rrs-msg-title">{{ senderName }}</text>
        <text class="rrs-msg-time">{{ msgTime }}</text>
      </view>
      <image v-if="isImageMsg && msgThumb" class="rrs-msg-thumb" :src="msgThumb" mode="aspectFit" />
      <text v-else class="rrs-msg-brief">{{ msgBrief }}</text>
    </view>

    <view class="rrs-tabs">
      <view :class="['rrs-tab', active==='read' ? 'active' : '']" @click="active='read'">已读({{ readCount }})</view>
      <view :class="['rrs-tab', active==='unread' ? 'active' : '']" @click="active='unread'">未读({{ unreadCount }})</view>
    </view>

    <scroll-view scroll-y class="rrs-list" :lower-threshold="60" @scrolltolower="onReachListBottom">
      <view v-for="u in (active==='read' ? readUsers : unreadUsers)" :key="u.id" class="rrs-item">
        <image class="rrs-avatar" :src="u.portraitUri" mode="aspectFill" />
        <text class="rrs-name">{{ u.name || u.id }}</text>
        <text v-if="active==='read' && u.timestamp" class="rrs-time">{{ formatTime(u.timestamp, true) }}</text>
      </view>
      <view v-if="(active==='read' ? readUsers : unreadUsers).length===0" class="rrs-empty">
        <RCIcon type="readState" :size="'52px'" />
        <text class="rrs-empty-text">{{ active==='read' ? '无人已读' : '无人未读' }}</text>
      </view>
      <view v-else class="rrs-loading" v-show="(active==='read' ? loadingRead : loadingUnread)">加载中...</view>
    </scroll-view>
  </view>
</template>

<script lang="ts" setup>
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';
import NavBar from '@/RCUIKit/components/nav-bar.vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import { formatTime, parseMessage2Text } from '@/RCUIKit/utils';
import { ErrorCode, getMessageReadReceiptInfoV5, MessageType } from '@rongcloud/imlib-next';

const messageUId = ref<string>('');
const msgBrief = ref<string>('');
const msgTime = ref<string>('');
const senderUserId = ref<string>('');
const senderName = ref<string>('');
const isImageMsg = ref<boolean>(false);
const msgThumb = ref<string>('');

const active = ref<'read' | 'unread'>('read');
const readCount = ref<number>(0);
const unreadCount = ref<number>(0);
const readUsers = ref<{ id: string; name: string; portraitUri?: string; timestamp?: number }[]>([]);
const unreadUsers = ref<{ id: string; name: string; portraitUri?: string; timestamp?: number }[]>([]);
const readPageToken = ref<string>('');
const unreadPageToken = ref<string>('');
const readTotal = ref<number>(0);
const unreadTotal = ref<number>(0);
const loadingRead = ref<boolean>(false);
const loadingUnread = ref<boolean>(false);
const base64Header = 'data:image/jpeg;base64,';
function goBack() {
  uni.navigateBack();
}

onLoad(async (query) => {
  messageUId.value = String(query?.messageUId || '');
  senderUserId.value = String(query?.senderUserId || '');
  await fetchReceipt();

  // 自动计算摘要与时间
  const opened = uni.$RongKitStore.conversationStore.openedConversation;
  const curMsg = opened ? uni.$RongKitStore.messageStore.getMessageByUid({ conversationType: opened.conversationType, targetId: opened.targetId, channelId: opened.channelId } as any, messageUId.value) as any : null;
  if (curMsg) {
    if (curMsg.readReceiptInfo) {
      readCount.value = Number(curMsg.readReceiptInfo?.readCount || 0);
      unreadCount.value = Number(curMsg.readReceiptInfo?.unreadCount || 0);
    } else {
      await getReadCount();
    }
    msgBrief.value = parseMessage2Text(curMsg.messageType, curMsg.content?.content || '');
    msgTime.value = formatTime(curMsg.sentTime, true);
    senderName.value = curMsg.user.nickname || senderUserId.value;
    // 计算是否为图片消息以及缩略图
    const type = curMsg.messageType;
    if (type === MessageType.IMAGE) {
      isImageMsg.value = true;
      msgThumb.value = base64Header + curMsg.content?.content || curMsg.localTmpPath || '';
    } else if (type === MessageType.GIF) {
      isImageMsg.value = true;
      msgThumb.value = curMsg.content?.remoteUrl || curMsg.localTmpPath || '';
    } else if (type === MessageType.SIGHT) {
      isImageMsg.value = true;
      msgThumb.value = base64Header + curMsg.content?.content || '';
    } else {
      isImageMsg.value = false;
      msgThumb.value = '';
    }
  }
});

async function fetchReceipt() {
  try {
    // 根据 targetId + messageUId 从内存中定位消息并推导会话信息
    const opened = uni.$RongKitStore.conversationStore.openedConversation;
    if (!opened) return;
    const con = { conversationType: opened.conversationType, targetId: opened.targetId, channelId: opened.channelId } as any;
    if (!messageUId.value) return;
    // 通过 kit store 统一获取一次性结果
    // await ensureGroupMembersCached(opened.targetId);
    const { read, unread } = await uni.$RongKitStore.messageStore.getReadReceiptUsersV5(con, messageUId.value, { pageCount: 100 });
    readUsers.value = read.list || [];
    unreadUsers.value = unread.list || [];
    readPageToken.value = read.pageToken || '';
    unreadPageToken.value = unread.pageToken || '';
    readTotal.value = read.total || 0;
    unreadTotal.value = unread.total || 0;
    console.log('readUsers', readUsers.value);
    console.log('unreadUsers', unreadUsers.value);
  } catch (e) {
    uni.showToast({ title: '获取回执失败', icon: 'none' });
  }
}

async function getReadCount() {
  const opened = uni.$RongKitStore.conversationStore.openedConversation;
  if (!opened) return 0;
  const con = { conversationType: opened.conversationType, targetId: opened.targetId, channelId: opened.channelId } as any;
  const { code, data } = await getMessageReadReceiptInfoV5(con, [messageUId.value]);
  if (code !== ErrorCode.SUCCESS) return;

  readCount.value = data?.[0]?.readCount || 0;
  unreadCount.value = data?.[0]?.unreadCount || 0;
}

async function loadMore(type: 0 | 1) {
  try {
    const opened = uni.$RongKitStore.conversationStore.openedConversation;
    if (!opened || !messageUId.value) return;
    const con = { conversationType: opened.conversationType, targetId: opened.targetId, channelId: opened.channelId } as any;

    const isRead = type === 0;
    const loadingRef = isRead ? loadingRead : loadingUnread;
    const tokenRef = isRead ? readPageToken : unreadPageToken;
    const listRef = isRead ? readUsers : unreadUsers;
    const totalRef = isRead ? readTotal : unreadTotal;

    if (loadingRef.value || !tokenRef.value) return;
    loadingRef.value = true;
    const res = await uni.$RongKitStore.messageStore.getReadReceiptUsersV5(
      con,
      messageUId.value,
      isRead
        ? { type: 0, pageTokenRead: tokenRef.value, pageCount: 100 }
        : { type: 1, pageTokenUnread: tokenRef.value, pageCount: 100 },
    );
    const payload = isRead ? res.read : res.unread;
    const list = payload?.list || [];
    listRef.value = listRef.value.concat(list);
    tokenRef.value = payload?.pageToken || '';
    totalRef.value = typeof payload?.total === 'number' ? (payload as any).total : totalRef.value;
    loadingRef.value = false;
  } catch (e) {
    loadingRead.value = false;
    loadingUnread.value = false;
  }
}

async function onReachListBottom() {
  const type = active.value === 'read' ? 0 : 1;
  await loadMore(type);
}

// async function ensureGroupMembersCached(groupId: string) {
//   const cache = uni.$RongKitStore.appData.groupMembersCache.getGroupMembers(groupId);
//   if (!cache || cache.length === 0) {
//     await (uni.$RongKitStore.appData.groupMembersCache as any).initGroupMembers?.(groupId);
//   }
// }
</script>

<style lang="scss" scoped>
@use '../../styles/_variables.scss' as var;
.rrs {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var.$rc-color-bg-regular;
}
.rrs-nav-left {
  display: flex;
  align-items: center;
}
.rrs-title {
  font-size: var.$rc-font-size-large;
  font-weight: 500;
}
.rrs-msg {
  margin: 8rpx 24rpx;
  padding: 24rpx;
  background: var.$rc-color-bg-auxiliary-1;
  border-radius: 16rpx;
}
.rrs-msg-top {
  display: flex;
  align-items: center;
}
.rrs-msg-title {
  color: var.$rc-color-font-primary;
  font-size: 24rpx;
  margin-bottom: 8rpx;
  flex: 1;
}
.rrs-msg-brief {
  display: -webkit-box;
  font-size: 28rpx;
  margin-bottom: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  white-space: normal;
  -webkit-box-orient: vertical;
  line-clamp: 2; // standard property for compatibility
  -webkit-line-clamp: 2; // clamp to two lines
}
.rrs-msg-thumb {
  width: 60px;
  height: 60px;
  border-radius: 6px;
}
.rrs-msg-time {
  color: var.$rc-color-font-secondary;
  font-size: 24rpx;
}
.rrs-tabs {
  display: flex;
  border-bottom: 1rpx solid var.$rc-color-font-secondary;
}
.rrs-tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
}
.rrs-tab.active {
  color: var.$rc-color-bg-auxiliary-2;
  border-bottom: 4rpx solid var.$rc-color-bg-auxiliary-2;
}
.rrs-list {
  flex: 1;

}
.rrs-loading {
  text-align: center;
  color: var.$rc-color-font-secondary;
  padding: 16rpx 0;
}
.rrs-item {
  display: flex;
  align-items: center;
  padding: 18rpx 22rpx;
  border-bottom: 1rpx solid var.$rc-color-functional-border;
}
.rrs-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  margin-right: 16rpx;
  background: #eee;
  flex: 0 0 72rpx; // fixed avatar width in flex layout
}
.rrs-name {
  font-size: 28rpx;
  flex: 1;
  min-width: 0; // allow flex item to shrink for ellipsis
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.rrs-time {
  font-size: 24rpx;
  color: var.$rc-color-font-secondary;
  flex: 0 0 160rpx; // fixed width for time
  text-align: right;
  margin-left: 12rpx;
}
.rrs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var.$rc-color-font-secondary;
  min-height: 100%; // fill scroll area so content can be vertically centered
}
.rrs-empty-text {
  margin-top: 12rpx;
  font-size: 26rpx;
}
</style>
