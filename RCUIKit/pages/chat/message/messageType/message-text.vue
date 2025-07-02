<template>
  <message-item-common
    :message="message"
    :customLongPressOptions="[{
      label: '复制',
      type: 'copy',
      },
    ]"
    @selectPopupItem="copyToClipboard"
    @selectStatusChange="selectStatusChange"
  >
    <message-bubble
      :reverse="message.messageDirection === 1"
      :isCenter="message.messageType === MessageType.TEXT && message.content.content.length < 6"
      :active="isActive"
    >
      <view class="rc-reference" v-if="message.messageType === MessageType.REFERENCE">
        <view class="rc-reference-content" :class="{inverse: message.messageDirection === 1 }">
          回复 {{ referenceName }}: {{ parseMessage2Text(message.content.objName, message.content.referMsg.content) }}
        </view>
      </view>
      <view class="rc-text">
        <view
          v-for="(item, index) in messageObjList"
          :key="index"
          class="rc-text-item"
        >
          <UniLink v-if="item.type === 'link'" :href="item.data" :text="item.data" fontSize="16" :showUnderLine="false">
            <text class="rc-text-item-link" :class="{inverse: message.messageDirection === 1 }">{{ item.data }}</text>
          </UniLink>
          <span class="rc-text-item-text" v-else>
            {{ item.data }}
          </span>
        </view>
      </view>
    </message-bubble>
  </message-item-common>
</template>

<script setup lang="ts">
/**
* 文本消息组件
*/
import MessageItemCommon from '../message-item-common.vue';
import {
 defineProps, PropType, computed, ref, onUnmounted,
} from '../../../../adapter-vue';
import MessageBubble from '../message-bubble.vue';
import { MessageItemType } from '../message-item.vue';
import UniLink from '@/RCUIKit/components/uni-components/uni-link/components/uni-link/uni-link.vue';
import { ConversationType, MessageType } from '@rongcloud/imlib-next';
import { autorun } from 'mobx';
import { parseMessage2Text } from '@/RCUIKit/utils';

interface IMessageObj {
  type: 'text' | 'mention' | 'link',
  data: string,
}
const props = defineProps({
  message: {
    type: Object as PropType<MessageItemType>,
    required: true,
  },
});

const messageObjList = computed(() => parseMessageContent(props.message.content.content));

const isActive = ref(false);

/**
 * 解析消息内容，将文本、链接和 提及分开
 */
const parseMessageContent = (content: string): IMessageObj[] => {
  const result: IMessageObj[] = [];
  // 定义正则表达式来匹配链接和 @提及
  const regex = /(https?:\/\/[^\s]+)|(@[^\s@]+)/g;
  let lastIndex = 0;

  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // 如果匹配之前有文本，将文本添加到结果数组中
      if (start > lastIndex) {
          result.push({ type: 'text', data: content.slice(lastIndex, start) });
      }

      if (match[1]) {
          // 匹配到的是链接
          result.push({ type: 'link', data: match[1] });
      } else if (match[2]) {
          // 匹配到的是 @提及
          result.push({ type: 'mention', data: match[2] });
      }

      lastIndex = end;
  }
  // 如果最后还有文本，将其添加到结果数组中
  if (lastIndex < content.length) {
      result.push({ type: 'text', data: content.slice(lastIndex) });
  }
  return result;
};

const referenceName = ref('');

const referenceNameDisposer = autorun(() => {
  if (props.message.conversationType === ConversationType.GROUP) {
    const groupMember = uni.$RongKitStore.appData.groupMembersCache.getGroupMember(props.message.targetId, props.message.content.referMsgUserId);
    referenceName.value = groupMember?.groupNickname || groupMember?.user.nickname || props.message.content.referMsgUserId;
  } else {
    const user = uni.$RongKitStore.appData.getUserInfo(props.message.content.referMsgUserId);
    referenceName.value = user?.name || props.message.content.referMsgUserId;
  }
});

const copyToClipboard = () => {
  uni.setClipboardData({
    data: props.message.content.content,
  });
};

const selectStatusChange = (data: boolean) => {
  isActive.value = data;
};

onUnmounted(() => {
  referenceNameDisposer();
});

</script>

<style lang="scss" scoped>
@use '../../../../styles/_variables.scss' as var;
.rc-reference {
  font-size: var.$rc-font-size-regular;
  line-height: 44rpx;
  padding: 8px 9px 0px;
  &-content {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-all;
    font-size: var.$rc-font-size-small;
    padding-left: 10px;
    line-height: 20px;
    border-left: 1px solid #C8C8C8;
    color: var.$rc-color-font-secondary;
  }
  &-content.inverse {
    color: var.$rc-color-font-inverse;
    border-left: 1px solid var.$rc-color-font-inverse;
  }
}
.rc-text {
  font-size: var.$rc-font-size-regular;
  line-height: 44rpx;
  padding: 8px 9px;
  word-break: break-all;
  &-item {
    display: inline;
    &-link {
      color: var.$rc-color-primary;
      text-decoration-color: var.$rc-color-primary;
      text-decoration: underline;
    }
    &-link.inverse {
      color: var.$rc-color-font-inverse;
      text-decoration-color: var.$rc-color-font-inverse;
    }
    &-text {
      white-space: pre-wrap;
    }
  }
}
</style>
