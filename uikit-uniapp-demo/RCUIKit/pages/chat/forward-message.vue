<template>
  <view class="rc-forward">
    <NavBar title="选择一个聊天" >
      <template v-slot:left>
        <RCIcon type="left" clickable @click="backToChat"/>
      </template>
      <template v-slot:default>
        <view class="navi-title">
          <text>选择一个聊天</text>
        </view>
      </template>
    </NavBar>

    <view class="rc-list">
      <scroll-view class="rc-list-scroll" scroll-y @scrolltolower="loadMore">
        <SelectMemberItem
          v-for="item in conversationList"
          :key="item.key"
          :data="{portraitUri: item.portraitUri, name: parseConversationName(item)! }"
          @onSelect="onConversationClick(item)"
        />
      </scroll-view>
    </view>

    <!-- 选择用户面板 -->
    <UniPopup ref="selectMemberPanel">
      <view class="rc-popup-container">
        <view class="rc-popup-head">发送给</view>
        <SelectMemberItem
          class="rc-popup-memeber"
          :data="{
            portraitUri: selectConversation?.portraitUri,
            name: selectConversation?.nickName || selectConversation?.name || selectConversation?.key || ''
          }"
        />
        <view class="rc-popup-message">
            {{ selectedMessages[0]?.user?.nickname }}: {{ parseMessage2Text(selectedMessages[0]!.messageType, selectedMessages[0]?.content.content) }}
        </view>
        <view class="rc-popup-footer">
          <view class="rc-popup-footer-button" @click="cancelForward">
            取消
          </view>
          <view class="rc-popup-footer-button rc-popup-footer-button-primary" @click="sendForward">
            发送
          </view>
        </view>
      </view>
    </UniPopup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import NavBar from '@/RCUIKit/components/nav-bar.vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import UniPopup from '@/RCUIKit/components/uni-components/uni-popup/components/uni-popup/uni-popup.vue';
import SelectMemberItem from '@/RCUIKit/pages/chat/message/select-member-item.vue';
import { IKitConversation, IKitMessage } from '@rongcloud/imkit-store';
import { ConversationType, ErrorCode } from '@rongcloud/imlib-next';
import { parseMessage2Text, parseConversationName } from '@/RCUIKit/utils';

const backToChat = () => {
  uni.navigateBack();
};

const conversationList = computed(() => _conList.slice(0, page.value * 15));

const _hasMore = ref(true);

const selectConversation = ref<IKitConversation>();

const selectedMessages = ref<IKitMessage[]>([]);

const _conList = uni.$RongKitStore.conversationStore.conversations.filter((item) => item.conversationType !== ConversationType.SYSTEM);

const page = ref(0);

/**
 * 面板组件
 */
const selectMemberPanel = ref<InstanceType<typeof UniPopup> | null>(null);

const loadMore = async () => {
  if (!_hasMore.value) {
    return;
  }
  page.value++;
  if (conversationList.value.length >= _conList.length) {
    _hasMore.value = false;
  }
};

const onConversationClick = (conversation: IKitConversation) => {
  selectConversation.value = conversation;
  // selectMemberPanel?.value?.open('bottom');
  sendForward();
};

const cancelForward = () => {
  selectMemberPanel?.value?.close();
};

const sendForward = async () => {
  uni.showLoading({
    title: '转发中...',
  });
  const { code } = await uni.$RongKitStore.messageStore.forwardMessage(selectConversation.value!.key, selectedMessages.value[0]);
  uni.hideLoading();
  if (code !== ErrorCode.SUCCESS) {
    uni.showToast({
      title: `error: ${code}`,
      icon: 'none',
    });
  }
  uni.showToast({
    title: '转发成功',
    icon: 'success',
  });
  selectMemberPanel?.value?.close();
  setTimeout(() => {
    uni.navigateBack();
  }, 1000);
};

onMounted(() => {
  selectedMessages.value = uni.$RongKitStore.messageStore.getSelectedMessages();
  loadMore();
});

</script>

<style lang="scss">
	/*每个页面公共css */
  @use '../../styles/common.scss';
</style>
<style lang="scss" scoped>
@use '../../styles/_variables.scss' as var;
.rc-forward {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.navi-title {
    display: flex;
    flex: 1;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: var.$rc-font-size-large;
  }

.rc-list {
  flex: 1;
  overflow: hidden;
  background-color: var.$rc-color-bg-regular;
  &-scroll {
    height: 100%;
  }
}

.rc-popup {
  &-container {
    background-color: var.$rc-color-bg-auxiliary-1;
    border-radius: 20px 20px 0 0;
    padding: 22px 16px;
  }
  &-head {
    font-size: var.$rc-font-size-regular;
    color: var.$rc-color-font-primary;
  }
  &-memeber {
    padding: 16px 0;
  }
  &-message {
    margin-bottom: 30px;
    padding: 10px 20px;
    background-color: var.$rc-color-bg-regular;
    border-radius: 6px;
    font-size: var.$rc-font-size-small;
    color: var.$rc-color-font-secondary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &-footer {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
    &-button {
      width: 122px;
      height: 37px;
      border-radius: 6px;
      background-color: var.$rc-color-bg-regular;
      color: var.$rc-color-font-secondary;
      margin-right: 23px;
      text-align: center;
      line-height: 37px;
    }
    &-button-primary {
      background-color: var.$rc-color-bg-auxiliary-2;
      color: var.$rc-color-font-inverse;
    }
  }

}

</style>
