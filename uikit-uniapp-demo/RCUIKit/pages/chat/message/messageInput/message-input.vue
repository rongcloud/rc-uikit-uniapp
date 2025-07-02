<template>
  <view class="rc-input-container">
    <!-- 引用消息 -->
    <view v-show="referenceMessage"  @touchmove.stop.prevent="emptyFn">
      <view class="rc-reference">
        <view class="rc-reference-content">
          回复 {{ referenceMessageInfo }}
        </view>
        <RCIcon class="rc-reference-close" @click="resetReferenceMessage" clickable type="close":size="'20px'"/>
      </view>
    </view>

    <!-- 输入栏 -->
    <view class="rc-input-wrap"  @touchmove.stop.prevent="emptyFn">
      <!-- #ifndef WEB -->
      <RCIcon class="rc-input-sound"
         v-if="!inputStatus.isShowSoundBox"
        @click="showVoiceRecorder"
        type="soundBtn"
        clickable
        :size="'28px'"
        />
      <RCIcon class="rc-input-keyboard"
        v-show="inputStatus.isShowSoundBox"
        @click="switchInput(['isShowInputBox'])"
        type="keyboard"
        clickable
        :circle="false"
        :size="'28px'"/>
      <!-- #endif -->
      <!-- #ifdef WEB -->
      <RCIcon class="rc-input-keyboard"
        @click="switchInput(['isShowInputBox'])"
        type="keyboard"
        clickable
        :circle="false"
        :size="'28px'"/>
      <!-- #endif -->

      <view class="rc-input-text" v-show="inputStatus.isShowInputBox">
        <textarea
          class="rc-input-text-input"
          auto-height
          confirm-hold
          v-model="text"
          :maxlength="-1"
          @confirm="sendMessage"
          @input="inputHandler"
          :adjust-position="false"
          :cursor-spacing="20"
          always-embed
          :show-confirm-bar="false"
          :cursor="inputCursor"
          :focus="inputFocus"
          @blur="onBlurHandler"
          @focus="onFocusHandler"
          :disable-default-padding="true"
          @keyboardheightchange="onKeyboardHeightChangeHandler"
          confirm-type="send"></textarea>

        <view class="rc-input-text-shade"
          v-show="inputStatus.isShowFaceBox || inputStatus.isShowExtraBox"
          @click="clickInputShadeHandler"
          ></view>
      </view>

      <VoiceRecorder v-if="inputStatus.isShowSoundBox" style="flex: 1;"/>

      <view class="rc-input-right">
        <RCIcon class="rc-input-face"
          type="face"
          @click="showFaceBox"
          :size="'28px'" clickable/>

        <RCIcon class="rc-input-extra"
          type="extra"
          :size="'28px'"
          @click="switchExtraBox"
          clickable/>

      </view>
    </view>

    <!-- 表情面板 -->
    <view class="rc-input-face-box" :style="{height: inputStatus.isShowFaceBox ? '234px' : '0px', visibility: inputStatus.isShowFaceBox ? 'visible' : 'hidden'}">
      <MessageInputFace @clickFace="onClickFaceHandler"/>
      <view class="rc-input-face-option" :style="{bottom: bottomInsetsHeight + 10 + 'px'}" v-if="inputStatus.isShowFaceBox">
        <view class="rc-input-face-option-item inverce" @click="onClickDeleteBtn">
          <RCIcon type="deleteText" v-show="inputCursor > 0" :size="'28px'"/>
          <RCIcon type="deleteText2" v-show="inputCursor === 0" :size="'28px'"/>
        </view>
        <view class="rc-input-face-option-item" :class="{inverce: text.length === 0}" @click="onClickSendBtn">
          发送
        </view>
      </view>
    </view>

    <!-- 扩展栏 -->
    <view class="rc-input-extra-box" :style="{height: inputStatus.isShowExtraBox ? '234px' : '0px', visibility: inputStatus.isShowExtraBox ? 'visible' : 'hidden'}">
      <InputToolbar/>
    </view>

    <!-- @消息选择用户面板 -->
    <UniPopup ref="mentionPanel" v-if="isGroup">
      <MentionMemberList :groupId="openedConId"
        @onClose="onSelectPannelCloseHandler"
        @onSelect="onSelectMember"
      />
    </UniPopup>

    <!-- 键盘弹起时用于占位顶起输入框 -->
    <view class="rc-placeholder" :style="{height: paddingBottom + 'px'}" @touchmove.stop.prevent="emptyFn"></view>
  </view>
</template>

<script setup lang="ts">
import {
 ref, onUnmounted, onMounted, computed,
} from '../../../../adapter-vue';
import { events } from '@/RCUIKit/constant/events';
import { debounce, parseMessage2Text, throttle } from '@/RCUIKit/utils';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import InputToolbar from './message-input-toolbar.vue';
import MentionMemberList from '../mention-member-list.vue';
import UniPopup from '@/RCUIKit/components/uni-components/uni-popup/components/uni-popup/uni-popup.vue';
import { IGroupMemberProfile, IKitConversation, IKitMessage } from '@rongcloud/imkit-store';
import {
BaseMessage,
 ConversationType, ErrorCode, IMessagesEvent, MentionedInfoBody, MentionedType, MessageType,
 addEventListener, Events, removeEventListener,
} from '@rongcloud/imlib-next';
import MessageInputFace from './message-input-face.vue';
import VoiceRecorder from './message-input-voice-recorder.vue';
import { LogTag } from '@/RCUIKit/enum/logTag';
import { logger } from '@/RCUIKit/utils/logger';
import { autorun } from 'mobx';

const openedConversation = ref<IKitConversation | null>(null);
const isGroup = ref<boolean>(false);
const openedConId = ref<string>('');

const openedConversationDisposer = autorun(() => {
  if (uni.$RongKitStore.conversationStore.openedConversation) {
    openedConversation.value = uni.$RongKitStore.conversationStore.openedConversation;
    isGroup.value = openedConversation.value.conversationType === ConversationType.GROUP;
    openedConId.value = openedConversation.value.targetId;
  }
});

/**
 * 底部安全区高度
 */
const bottomInsetsHeight = uni.getWindowInfo().safeAreaInsets.bottom;

/**
 * 解决两个问题：
 * - 1. 输入框内容有多行，光标不在最后一行时，键盘会把输入框盖住
 * - 2. 输入框没有获得焦点时，底部留出安全区高度
 */
const paddingBottom = ref(bottomInsetsHeight);

onMounted(() => {
  uni.$on(events.REFERENCE_MESSAGE, onReferenceMessageHandler);
  uni.$on(events.RESET_MESSAGE_INPUT, resetMessageInputStatus);
  uni.$on(events.RECALL_MESSAGE, onRecallMessage);
  addEventListener(Events.MESSAGES, onReceiveMessage);
  initDraft();
});

/**
 * 输入的文本
 */
const text = ref('');

/**
 * 输入光标位置
 */
const inputCursor = ref(0);

/**
 * 输入框获取焦点
 */
const inputFocus = ref(false);

/**
 * 输入变更前的文本
 */
let lastInputText = '';

const inputStatus = ref({
  /**
   * 是否显示输入框
   */
  isShowInputBox: true,
  /**
   * 是否显示录音按钮
   */
  isShowSoundBox: false,
  /**
   * 是否显示扩展栏
   */
  isShowFaceBox: false,
  /**
   * 是否显示表情面板
   */
  isShowExtraBox: false,
});

/**
 * 空方法
 */
const emptyFn = () => {};

/**
 * 切换输入框状态
 * @param key
 */
const switchInput = (key: (keyof typeof inputStatus.value)[]) => {
  inputStatus.value = {
    isShowInputBox: false,
    isShowSoundBox: false,
    isShowFaceBox: false,
    isShowExtraBox: false,
  };
  key.forEach((k) => {
    inputStatus.value[k] = true;
  });

  setTimeout(() => {
    uni.$emit(events.INPUT_STATUS_CHANGE);
  }, 50);
};

const showFaceBox = () => {
  // 延迟 100ms, 防止由键盘切换到表情面板时，表情面板有弹起抖动
  setTimeout(() => {
    switchInput(['isShowFaceBox', 'isShowInputBox']);
  }, 100);
};

const showVoiceRecorder = () => {
  // 延迟 200ms, 防止同位置的两个按钮（录音icon和键盘icon）的点击事件同时被触发
  setTimeout(() => {
    switchInput(['isShowSoundBox']);
  }, 200);
};

const switchExtraBox = () => {
  setTimeout(() => {
    if (inputStatus.value.isShowExtraBox) {
      switchInput(['isShowInputBox']);
    } else {
      switchInput(['isShowExtraBox', 'isShowInputBox']);
    }
  }, 100);
};

/**
 * 点击输入框蒙版，延迟弹起键盘，避免表情面板切换到键盘时有弹起抖动
 */
const clickInputShadeHandler = () => {
  switchInput(['isShowInputBox']);
  const timer = setTimeout(() => {
    inputFocus.value = true;
  }, 300);
};

/**
 * 输入框获取焦点
 */
const onFocusHandler = (e: any) => {
  switchInput(['isShowInputBox']);
  // #ifdef WEB
  paddingBottom.value = 0;
  setTimeout(() => {
    document.querySelector('.rc-input-text-input')?.scrollIntoView();
  }, 100);
  // paddingBottom.value = e.detail.height ? `${e.detail.height}px` : bottomInsetsHeight;
  // #endif
  // #ifdef MP-WEIXIN
  // paddingBottom.value = e.detail.height ? `${e.detail.height}px` : bottomInsetsHeight;
  // #endif
  updateFocusValue(true);
};

/**
 * 输入框失去焦点
 * - 注意：此事件响应可能比较慢，依赖于此事件的动作需要加个延迟
 */
const onBlurHandler = (e: any) => {
  inputCursor.value = e.detail.cursor;
  updateFocusValue(false);
  // #ifdef WEB
  paddingBottom.value = bottomInsetsHeight;
  // #endif
};

/**
 * 更新输入框获取焦点状态，防抖
 */
const updateFocusValue = debounce((val: boolean) => {
  inputFocus.value = val;
}, 50);

/**
 * 键盘高度变化, Web不支持
 */
const onKeyboardHeightChangeHandler = (e: any) => {
  let { height } = e.detail;
  // #ifdef MP-WEIXIN
    if (height) {
      // 当从表情面板切换到输入文字时，键盘高度变更事件快于获取焦点事件，会导致输入框有个向上弹起的现象，所以要主动把表情面板关掉
      switchInput(['isShowInputBox']);
      setTimeout(() => {
        paddingBottom.value = height;
      }, 10);
    } else {
      paddingBottom.value = bottomInsetsHeight;
    }
  // #endif
  // #ifdef APP-PLUS
  if (uni.getSystemInfoSync().platform === 'ios') {
    if (height > 0 && height > paddingBottom.value) {
      height -= 30;
    }
  }
  paddingBottom.value = height > 0 ? height : bottomInsetsHeight;
  // #endif
};

// #region 发送消息模块
/**
 * 发送文本消息
 */
const sendMessage = async () => {
  if (text.value.trim().length === 0) {
    uni.showToast({
      title: '消息不能为空',
    });
    return;
  }
  if (!openedConversation.value) return;

  const data = generateMessage();

  uni.$emit(events.SCROLL_TO_BOTTOM);
  // #ifndef VUE3
  setTimeout(() => {
    uni.$emit(events.SCROLL_TO_BOTTOM);
  }, 300);
  // #endif

  referenceMessage.value = null;
  text.value = '';
  lastInputText = '';
  inputCursor.value = 0;

  const { code } = await uni.$RongKitStore.messageStore.sendMessage(openedConversation.value.key, data.message, {
    isMentioned: data.isMentioned,
  });

  if (code !== ErrorCode.SUCCESS) {
    uni.showToast({
      title: `error: ${code}`,
    });
  }
};

/**
 * 构造消息
 */
const generateMessage = (): {message: BaseMessage, isMentioned: boolean} => {
  const mentionedInfo = generateMentionInfo();
  let message;
  const rMessage = referenceMessage.value;

  if (rMessage) {
    message = new uni.$RongIMLib.ReferenceMessage({
      content: text.value,
      mentionedInfo,
      referMsgUserId: rMessage.senderUserId,
      referMsg: rMessage.content,
      referMsgUid: rMessage.messageUId,
      objName: rMessage.messageType,
    });
  } else {
    message = new uni.$RongIMLib.TextMessage({
      content: text.value,
      mentionedInfo,
    });
  }
  return {
    message,
    isMentioned: mentionedInfo !== undefined,
  };
};
// #endregion

// #region 表情模块
/**
 * 点击表情
 * @param face 表情
 */
const onClickFaceHandler = (face: string) => {
  text.value = `${text.value.slice(0, inputCursor.value)}${face}${text.value.slice(inputCursor.value)}`;
  inputCursor.value += face.length;
};

/**
 * 点击删除按钮
 * 注意：一个 emoji 可能占两个字符甚至更多
 */
const onClickDeleteBtn = throttle(() => {
  if (inputCursor.value <= 0) return;
  // 计算“字符”下标
  const charIndex = Array.from(text.value.slice(0, inputCursor.value)).length;
  const chars = Array.from(text.value);
  // 删除光标前的一个字符
  chars.splice(charIndex - 1, 1);

  text.value = chars.join('');
  inputCursor.value = chars.slice(0, charIndex - 1).join('').length;
}, 200);

/**
 * 点击发送按钮
 */
const onClickSendBtn = throttle(() => {
  if (text.value.length === 0) return;
  sendMessage();
}, 1000);
// #endregion

// #region 提及成员模块

/**
 * at 面板组件
 */
const mentionPanel = ref<InstanceType<typeof UniPopup> | null>(null);
/**
 * 生成被提及的信息
 */
const generateMentionInfo = (): MentionedInfoBody | undefined => {
  if (mentionedList.length === 0) return;

  const mentionedInfo = { type: MentionedType.SINGAL };

  const ids = new Set<string>();
  mentionedList.forEach((item) => {
    if (item.id === '') {
      mentionedInfo.type = MentionedType.ALL;
      return;
    }
    ids.add(item.id);
  });

  return mentionedInfo.type === MentionedType.ALL
  ? mentionedInfo
  : {
      ...mentionedInfo,
      userIdList: [...ids],
    };
};

/**
 * 被提及的成员列表
 */
let mentionedList: {id: string, nickname: string}[] = [];

/**
 * 输入事件
 */
const inputHandler = (e: any) => {
  onInputKeyHandler(e);
  lastInputText = text.value;
};

/**
 * 对输入的 key 进行特殊处理
 */
const onInputKeyHandler = (e: any) => {
  if (!isGroup.value) {
    return;
  }
  const { cursor, value } = e.detail;

  // 检查是否为删除操作
  // 当输入 删除 时, 如果光标在  @ + 成员名称 + 空格 中, 则删除 @ + 成员名称 + 空格
  if (value.length < lastInputText.length) {
    if (mentionedList.length === 0) return;

    const beforeText = lastInputText.slice(0, cursor);

    // 向前查找最近的 @ 符号位置
    const lastAtIndex = beforeText.lastIndexOf('@');
    if (lastAtIndex < 0) return;

    // 获取从 @ 位置开始存在于 mendtionedList 中的 @成员
    const mentionIndexInList = mentionedList.findIndex((item) => lastInputText.startsWith(`@${item.nickname} `, lastAtIndex));

    if (mentionIndexInList < 0) return;

    // +2 是因为包含名称前边的 @ 和 后边的空格
    const mentionedInfoLength = mentionedList[mentionIndexInList].nickname.length + 2;
    // 如果光标不在 @成员 范围内，则返回。
    if (cursor >= lastAtIndex + mentionedInfoLength) return;

    text.value = lastInputText.slice(0, lastAtIndex) + lastInputText.slice(lastAtIndex + mentionedInfoLength);
    inputCursor.value = lastAtIndex;
    // 从 mentionedList 中删除 @成员
    mentionedList.splice(mentionIndexInList, 1);

    // 补偿逻辑，如果内容中没有 @ ，则清空 @列表
    if (!value.includes('@')) {
      mentionedList = [];
    }
    return;
  }

  // 检查是否输入了 @, 如果输入 @ 则打开面板，要注意以下事项
  // 1. 此事件回调参数 e 中只能拿到 e.detail.cursor 和 e.detail.value
  // 2. 输入 @ 后，打开选择成员面板，注意此时光标位置。
  // 3. 选择成员后，输入框中刚输入的 @ 将替换成 @ + 成员名称 + 空格
  if (value[cursor - 1] === '@') {
    inputFocus.value = false;
    mentionPanel.value?.open('bottom');
  }
};

/**
 * 选择成员
 * @param member
 */
const onSelectMember = (member: IGroupMemberProfile) => {
  const name = member.groupNickname || member.user.nickname;
  mentionedList.push({
    id: member.user.id,
    nickname: name,
  });
  text.value = `${text.value.slice(0, inputCursor.value - 1)}@${name} ${text.value.slice(inputCursor.value)}`;
  lastInputText = text.value;
  inputCursor.value += name.length + 1;
  onSelectPannelCloseHandler();
};

/**
 * 选择成员面板关闭
 */
const onSelectPannelCloseHandler = () => {
  mentionPanel.value?.close();
  setTimeout(() => {
    inputFocus.value = true;
  }, 300);
};

// #endregion

// #region 引用消息模块
/**
 * 被引用的消息
 */
const referenceMessage = ref<IKitMessage | null>(null);

/**
 * 被引用消息的展示信息
 */
const referenceMessageInfo = computed(() => {
  if (referenceMessage.value === null) return null;

  return `${referenceMessage.value.user.nickname}: 
  ${parseMessage2Text(referenceMessage.value.messageType, referenceMessage.value.content.content)}`;
});

const onReferenceMessageHandler = (msg: IKitMessage) => {
  referenceMessage.value = msg;
};

/**
 * 重置引用消息
 */
const resetReferenceMessage = () => {
  referenceMessage.value = null;
};
// #endregion

// #region 草稿模块
const initDraft = () => {
  if (!openedConversation.value) return;
  try {
    const draft = JSON.parse(openedConversation.value.draft || '{}');
    text.value = draft.content || '';
    mentionedList = draft.mentionedList || [];
  } catch (error) {
    logger.error(LogTag.K_DRAFT_E, 'initDraft', error);
  }
  inputCursor.value = text.value.length;
};

const updateDraft = () => {
  if (!openedConversation.value) return;
  uni.$RongKitStore.conversationStore.updateCacheConversation(
    openedConversation.value.key,
    {
      draft: text.value
        ? JSON.stringify({
            content: text.value,
            mentionedList,
          })
        : '',
    },
  );
};

// #endregion

const onReceiveMessage = (messages: IMessagesEvent) => {
  const message = messages.messages.find((item) => {
    const { conversationType, targetId, channelId } = item;
    // 判断是否是当前会话
    const isCurConversation = openedConversation.value?.conversationType === conversationType
      && openedConversation.value?.targetId === targetId
      && openedConversation.value?.channelId === channelId;
    if (!isCurConversation) return false;
    // 判断是否是撤回当前引用的消息
    return item.messageType === MessageType.RECALL_MESSAGE_TYPE && item.content.messageUId === referenceMessage.value?.messageUId;
  });
  if (message) {
    uni.showToast({
      title: '消息已被撤回',
      icon: 'none',
    });
    resetReferenceMessage();
  }
};

const onRecallMessage = (message: IKitMessage) => {
  if (message.messageUId === referenceMessage.value?.messageUId) {
    resetReferenceMessage();
  }
};

const resetMessageInputStatus = () => {
  inputStatus.value.isShowExtraBox = false;
  inputStatus.value.isShowFaceBox = false;
  inputFocus.value = false;
};

onUnmounted(() => {
  openedConversationDisposer();
  // 设置草稿,移除引用消息
  updateDraft();
  uni.$off(events.REFERENCE_MESSAGE, onReferenceMessageHandler);
  uni.$off(events.RESET_MESSAGE_INPUT, resetMessageInputStatus);
  uni.$off(events.RECALL_MESSAGE, onRecallMessage);
  removeEventListener(Events.MESSAGES, onReceiveMessage);
});
</script>

<style lang="scss" scoped>
@use '../../../../styles/_variables.scss' as var;
.rc-input-container {
  background: var.$rc-color-bg-auxiliary-1;
  z-index: 100;
  // padding-bottom: 500px;
}

.rc-reference {
  padding: 10px;
  display: flex;
  &-content {
    line-height: 20px;
    font-size: var.$rc-font-size-small;
    color: var.$rc-color-font-accent;
    border-left: 1px solid var.$rc-color-font-accent;
    padding-left: 12px;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
.rc-input-wrap {
  display: flex;
  padding: 9px 11px;
  align-items: flex-end;
  box-sizing: border-box;
  min-height: 56px;
  justify-content: space-between;
}
.rc-input {
  &-text {
    flex:1;
    background: var.$rc-color-bg-regular;
    border-radius: 6px;
    position: relative;
  }
  &-text-input {
    background: var.$rc-color-bg-regular;
    border-radius: 6px;
    border: 1px solid var.$rc-color-functional-border;
    color: var.$rc-color-font-primary;
    padding: 7px 10px;
    font-size: var.$rc-font-size-base;
    line-height: 22px;
    max-height: calc(22px * 5);
    min-height: 22px;
    overflow-y: auto;
    width: calc(100% - 20px);
  }
  &-text-shade {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100;
  }
  &-right {
    display: flex;
    width: 70px;
    margin-left: 12px;
    justify-content: space-between;
  }
  &-sound {
    padding: 0 0 5px;
    margin-right: 12px;
    height: 28px;
  }
  &-keyboard {
    padding: 0 0 5px;
    margin-right: 12px;
    height: 28px;
  }
  &-face {
    padding: 0 0 5px;
    height: 28px;
  }
  &-extra {
    padding: 0 0 5px;
    height: 28px;
  }
}

.rc-input-face-box {
  overflow: hidden;
}
.rc-input-extra-box {
  z-index: 100;
  position: relative;
  overflow: hidden;
}
.rc-input-face-option {
  position: absolute;
  display: flex;
  align-items: center;
  bottom: 10px;
  right: 10px;
  &-item {
    width: 68px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    margin-left: 16px;
    font-size: var.$rc-font-size-regular;
    color: var.$rc-color-bg-auxiliary-1;
    background-color: var.$rc-color-bg-auxiliary-2;
    &.inverce {
      background-color: var.$rc-color-bg-regular;
      color: var.$rc-color-font-secondary;
    }
  }
}
</style>
