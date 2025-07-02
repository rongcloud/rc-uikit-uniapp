<template>
  <view class="rc-conversations">
      <!-- 导航栏 -->
      <nav-bar :border="true" :leftWidth="100">
      <template v-slot:left>
        <view class="rc-conversations-nav-text">
          会话
        </view>
      </template>
    </nav-bar>
    <connect-status />
    <view class="rc-conversations-list">
      <conversation-list />
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import ConnectStatus from '@/RCUIKit/components/connect-status.vue';
import ConversationList from '@/RCUIKit/pages/conversation/conversation-list.vue';
import NavBar from '@/RCUIKit/components/nav-bar.vue';

const { conversationStore } = uni.$RongKitStore;
onShow(() => {
  conversationStore.openConversation(null);
});

</script>

<style lang="scss">
	/*每个页面公共css */
  @use '../../styles/common.scss';
</style>
<style lang="scss" scoped>
@use '../../styles/_variables.scss' as var;

.rc-conversations {
  display: flex;
  flex-direction: column;
  /* #ifdef APP-PLUS */
  height: 100%;
  /* #endif */

  /* #ifdef MP-WEIXIN */
  height: 100vh;
  /* #endif */

  &-nav-text {
    font-size: var.$rc-font-size-large;
    font-weight: 500;
    padding: 12px 16px;
  }
  &-list {
    flex: 1;
    overflow: hidden;
  }
}
</style>
