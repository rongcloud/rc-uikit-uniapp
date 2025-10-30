<template>
  <MessageInputVoiceRecorderBase
  :isRecording="isRecording"
  :durationTime="durationTime"
  @start-record="startRecordHandler"
  @stop-record="stopRecordHandler" />
</template>

<script lang="ts" setup>
import {
 ref, onMounted, onUnmounted, nextTick,
} from '../../../../adapter-vue';
import { sendMediaMessage } from '@/RCUIKit/utils/upload';
import { ErrorCode, FileType, MessageType } from '@rongcloud/imlib-next';
import { sendTypingForOpenedConversation } from '@/RCUIKit/utils/index';
import { events } from '@/RCUIKit/constant/events';
import { logger } from '@/RCUIKit/utils/logger';
import { LogTag } from '@/RCUIKit/enum/logTag';
import { AudioManager } from '../manager/audio-manager';
import { getAuthSetting, showOpenSettingModal, throttle } from '@/RCUIKit/utils';
import MessageInputVoiceRecorderBase from './message-input-voice-recorder-base.vue';
import {
 recorderManager, setOnStartHandler, setOnStopHandler, setOnErrorHandler, offStartHandler, offStopHandler, offErrorHandler,
} from '@/RCUIKit/utils/recorderHelper';

// 录音相关响应式状态
const isRecording = ref(false);
const durationTime = ref(0);

// 内部状态变量
let isCancel = false;
let timer: ReturnType<typeof setInterval> | number = -1;
let isGetAuthOption = false; // 是否是尝试获取权限的操作
let isPressing = false; // 是否是按下状态
let hasAuth = false; // 是否已授权

// 开始录音处理函数
const startRecordHandler = async (): Promise<void> => {
  isPressing = true;
  isGetAuthOption = false;
  if (!hasAuth) {
    const auth = await getAuthSetting('record');

    if (auth === false) {
      // 未授权，提示用户去设置
      showOpenSettingModal('麦克风');
      return;
    }
    // auth === undefined 代表无法获取授权状态，需后续在onStartHandler中处理
    isGetAuthOption = auth === undefined;
    hasAuth = auth === true;
  }
  durationTime.value = 0;

  // 停止当前音频播放，准备录音
  AudioManager.getInstance().stopAudio();
  logger.info(LogTag.K_RECORD_T, `Ready to record, hasAuth:${hasAuth}, isGetAuthOption:${isGetAuthOption}`);

  // 启动录音
  recorderManager.start({
    duration: 60000, // 最长录音时间，单位ms
    sampleRate: 16000, // 采样率
    numberOfChannels: 1, // 录音通道数
  });
};

// 停止录音处理函数
const stopRecordHandler = (_isCancel: boolean): void => {
  isPressing = false;
  isCancel = _isCancel;
  logger.info(LogTag.K_RECORD_S, 'stopRecord option, isCancel: ', isCancel, ', isRecording:', isRecording.value, durationTime.value);
  if (!isRecording.value) return;

  if (durationTime.value === 0) {
      // 如果录音时长为0，则延迟500ms后停止录音, 防止在安卓平台导致应用闪退问题
      setTimeout(() => {
        recorderManager.stop();
      }, 500);
  } else {
    recorderManager.stop();
  }
};
const onStartHandler = () => {
  logger.info(LogTag.K_RECORD_S, `onStart, isGetAuthOption:${isGetAuthOption}, isPressing:${isPressing}`);
  if (isGetAuthOption || !isPressing) {
    recorderManager.stop();
    hasAuth = true;
    return;
  }
  isRecording.value = true;

  // 发送语音 typing（仅单聊）
  sendTypingForOpenedConversation(MessageType.HQ_VOICE);

  // 开始计时
  if (timer !== -1) {
    clearInterval(timer as number);
    timer = -1;
  }
  timer = setInterval(() => {
    durationTime.value++;
    }, 1000);
};

const onStopHandler = async (res: any) => {
  logger.info(LogTag.K_RECORD_S, `onStop, isGetAuthOption:${isGetAuthOption}`, JSON.stringify(res));
  if (isGetAuthOption) return;

  if (timer !== -1) {
    clearInterval(timer as number);
    timer = -1;
  }
  if (res.duration >= 59000) {
    durationTime.value = 60;
  }

  const { tempFilePath, fileSize } = res;
  const duration = durationTime.value;
  isRecording.value = false;

  if (isCancel) {
    logger.warn(LogTag.K_RECORD_R, 'Record canceled, duration: ', duration);
    uni.showToast({
      title: '取消发送',
      icon: 'none',
    });
    isCancel = false;
  } else if (duration < 1) {
    logger.warn(LogTag.K_RECORD_R, 'Record duration too short, duration: ', duration);
    uni.showToast({
      title: '录音时间太短',
      icon: 'none',
    });
  } else {
    logger.info(LogTag.K_RECORD_R, 'Record success, duration: ', duration);

    const hqVoiceMessage = new uni.$RongIMLib.HQVoiceMessage({
      duration,
      sampleRate: 16000,
      numberOfChannels: 1,
    });

    setTimeout(() => {
      uni.$emit(events.SCROLL_TO_BOTTOM);
    }, 100);

    const { code } = await sendMediaMessage({
      message: hqVoiceMessage,
      conversationKey: uni.$RongKitStore.conversationStore.openedConversation!.key,
      info: {
        path: tempFilePath,
        duration,
        fileType: FileType.AUDIO,
        fileSize,
      },
    });
    if (code !== ErrorCode.SUCCESS) {
      uni.showToast({
        title: `error: ${code}`,
        icon: 'none',
      });
    }
  }

  // 重置状态
  durationTime.value = 0;
};

const onErrorHandler = (res: any) => {
  logger.error(LogTag.K_RECORD_E, 'Recorder error: ', res.errMsg, '，code:', JSON.stringify(res));
  if (isRecording.value) {
    uni.showToast({
      title: '录音失败',
      icon: 'none',
    });
  }
  hasAuth = false;
  isRecording.value = false;
  if (timer !== -1) {
    clearInterval(timer as number);
    timer = -1;
  }
};

// 绑定录音事件
onMounted(() => {
	setOnStartHandler(onStartHandler);
	setOnStopHandler(onStopHandler);
	setOnErrorHandler(onErrorHandler);
});
onUnmounted(() => {
	offStartHandler();
	offStopHandler();
	offErrorHandler();
});

</script>

<style lang="scss" scoped>
@use '../../../../styles/_variables.scss' as var;

.rc-voice-recorder {
    flex: 1;
  &-button {
    background: var.$rc-color-bg-auxiliary-2;
    border-radius: 6px;
    border: 1px solid var.$rc-color-functional-border;
    color: var.$rc-color-font-inverse;
    padding: 7px 10px;
    font-size: var.$rc-font-size-small;
    line-height: 22px;
    text-align: center;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
    &-icon {
      height: 18px;
      margin-right: 5px;
    }
  }

  &-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
  }

  &-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
  }

  &-content {
    position: absolute;
    left: calc((100vw - 1000px) / 2);
    top: 60vh;
    height: 1000px;
    width: 1000px;
    background: var.$rc-color-bg-auxiliary-2;
    border-top-left-radius: 500px;
    border-top-right-radius: 500px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    transition: all 0.3s;

    &-cancel {
      background: #ff4d4f;
      .rc-voice-recorder-cancel-text,
      .rc-voice-recorder-time {
        color: #fff;
      }
    }
  }

  &-cancel-text {
    font-size: var.$rc-font-size-regular;
    color: var.$rc-color-font-inverse;
    margin-bottom: 20px;
  }

  &-close {
    margin-top: -55px;
  }

  &-animation {
    margin: 20px 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &-wave {
    width: 100%;
    height: 100%;

    &.recording {
      animation: wave 1s infinite ease-in-out;
    }
  }

  &-time {
    font-size: 28px;
    color: var.$rc-color-font-inverse;
  }
}

@keyframes wave {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
}
</style>
