<template>
  <view class="rc-voice-recorder">
    <!-- 录音按钮 -->
    <view
      class="rc-voice-recorder-button"
      @touchstart.prevent="startRecord"
      @touchend.prevent="stopRecord"
      @touchcancel.prevent="stopRecord"
      @touchmove.prevent="handleTouchMove"
    >
      <RCIcon type="recorder2" :size="'18px'" class="rc-voice-recorder-button-icon"/>
      <text class="rc-voice-recorder-button-text">按住说话</text>
    </view>

    <!-- 录音弹窗 -->
    <view class="rc-voice-recorder-modal" v-if="recordStatus === 'recording'">
      <!-- 蒙版层 -->
      <view
        class="rc-voice-recorder-mask"
      />

      <!-- 录音框 -->
      <view class="rc-voice-recorder-content" :class="{ 'rc-voice-recorder-content-cancel': isCancel }">
        <RCIcon type="close2"
          :size="'40px'"
          class="rc-voice-recorder-close"
        />
        <!-- 录音动画 -->
        <view class="rc-voice-recorder-animation">
          <RCIcon type="recorder"
            :size="'80px'"
            class="rc-voice-recorder-wave"
            :class="{ 'recording': recordStatus === 'recording' }"/>
        </view>
        <!-- 取消提示 -->
        <text class="rc-voice-recorder-cancel-text">{{ isCancel ? '松手取消发送' : '松开发送 | 上划取消' }}</text>
        <!-- 录音时长 -->
        <text class="rc-voice-recorder-time">{{ formatTime(durationTime) }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import { judgeIosPermission, requestAndroidPermission } from '@/RCUIKit/external/permission';
import { sendMediaMessage } from '@/RCUIKit/utils/upload';
import { ErrorCode, FileType } from '@rongcloud/imlib-next';
import { events } from '@/RCUIKit/constant/events';
import { logger } from '@/RCUIKit/utils/logger';
import { LogTag } from '@/RCUIKit/enum/logTag';
import { AudioManager } from '../manager/audio-manager';
import { throttle } from '@/RCUIKit/utils';

// 录音相关状态
// none: 初始状态
// checking: 检查权限状态
// noPermission: 没有权限状态
// beforeRecording: 准备录音状态
// recording: 录音状态
// beforeStopped: 停止录音前状态
// stopped: 停止录音状态
// error: 录音错误状态
const recordStatus = ref<'none' | 'checking' | 'noPermission' | 'beforeRecording' | 'recording' | 'beforeStopped' | 'stopped' | 'error'>('none');
const isCancel = ref(false);
const durationTime = ref(0);
const recorderManager = uni.getRecorderManager();
let timer: ReturnType<typeof setInterval>;
let startY = 0;

// 开始录音
const startRecord = throttle(async (e: any) => {
  if (!['stopped', 'error', 'none', 'noPermission'].includes(recordStatus.value)) return;

  AudioManager.getInstance().stopAudio();
  // isRecording.value = true;
  durationTime.value = 0;
  recordStatus.value = 'checking';
  logger.info(LogTag.K_RECORD_T, 'Ready to record');
  // #ifdef APP-PLUS
  if (uni.getSystemInfoSync().platform === 'ios') {
    if (!judgeIosPermission('record')) {
      recordStatus.value = 'noPermission';
      logger.error(LogTag.K_RECORD_E, 'No permission to record in ios');
    } else {
      recordStatus.value = 'beforeRecording';
    }
    startRecording(e);
  } else {
    recordStatus.value = 'beforeRecording';
    startRecording(e);
  }
  // #endif

  // #ifdef MP-WEIXIN
  // 微信小程序使用 authorize
  uni.authorize({
    scope: 'scope.record',
    success: () => {
      if (recordStatus.value === 'checking') {
        recordStatus.value = 'beforeRecording';
        startRecording(e);
      } else {
        logger.warn(LogTag.K_RECORD_R, 'Record button released, not recording');
      }
    },
    fail: () => {
      logger.error(LogTag.K_RECORD_E, 'No permission to record in wechat mini program');
      recordStatus.value = 'noPermission';
      uni.showToast({
        title: '请授权录音权限',
        icon: 'none',
      });
    },
  });
  // #endif
}, 1000); // 设置1秒的节流时间

// 开始录音实际操作
const startRecording = (e:any) => {
  isCancel.value = false;
  startY = e.touches[0].clientY;
  // 调用录音API
  recorderManager.start({
    duration: 60000, // 最长录音时间，单位ms
    sampleRate: 16000, // 采样率
    numberOfChannels: 1, // 录音通道数
    encodeBitRate: 96000, // 编码码率
    format: 'mp3', // 音频格式
  });
};

// 停止录音
const stopRecord = () => {
  logger.info(LogTag.K_RECORD_S, 'stopRecord option, recordStatus: ', recordStatus.value, durationTime.value);
  if (['error', 'stopped', 'noPermission', 'beforeStopped'].includes(recordStatus.value)) return;
  if (timer !== -1) {
    clearInterval(timer);
    timer = -1;
  }
  startY = 0;
  if (recordStatus.value === 'recording' || recordStatus.value === 'beforeRecording') {
    if (durationTime.value === 0) {
      // 如果录音时长为0，则延迟500ms后停止录音, 防止在安卓平台导致应用闪退问题
      setTimeout(() => {
        recorderManager.stop();
      }, 500);
    } else {
      recorderManager.stop();
    }
    recordStatus.value = 'beforeStopped';
  } else if (recordStatus.value === 'checking') {
    recordStatus.value = 'stopped';
  }
};

// 处理手指移动
const handleTouchMove = (e: any) => {
  if (!startY) return;

  const moveY = e.touches[0].clientY;
  const distance = startY - moveY;

  // 上滑超过50像素则标记为取消
  isCancel.value = distance > 250;
};

// 格式化时间
const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

recorderManager.onStart((res) => {
  logger.info(LogTag.K_RECORD_S, 'onStart, recordStatus: ', recordStatus.value);
  if (recordStatus.value !== 'beforeRecording') {
    return;
  }
  recordStatus.value = 'recording';
  // 开始计时
  if (timer !== -1) {
    clearInterval(timer);
    timer = -1;
  }
  timer = setInterval(() => {
    durationTime.value++;
    // 最长录音时间限制（60秒）
    if (durationTime.value >= 60) {
      stopRecord();
    }
  }, 1000);
});

// 录音结束事件处理
recorderManager.onStop(async (res) => {
  logger.info(LogTag.K_RECORD_S, 'onStop, recordStatus: ', recordStatus.value);
  if (recordStatus.value !== 'beforeStopped' && recordStatus.value !== 'recording') {
    return;
  }
  recordStatus.value = 'stopped';
  let { tempFilePath, fileSize } = res;

  let duration = durationTime.value;

  if (isCancel.value) {
    logger.warn(LogTag.K_RECORD_R, 'Record canceled, duration: ', duration);
    uni.showToast({
      title: '取消发送',
      icon: 'none',
    });
    isCancel.value = false;
  } else if (duration === 0) {
    logger.warn(LogTag.K_RECORD_R, 'Record duration is: ', duration);
  } else if (duration < 1) {
    logger.warn(LogTag.K_RECORD_R, 'Record duration too short, duration: ', duration);
    uni.showToast({
      title: '录音时间太短',
      icon: 'none',
    });
  } else {
    logger.info(LogTag.K_RECORD_R, 'Record success, duration: ', duration);
    // #ifdef APP-PLUS
    // 获取文件信息
    const fileInfo = await new Promise<{size: number}>((resolve, reject) => {
      plus.io.getFileInfo({
        filePath: uni.getSystemInfoSync().osName === 'android'
          ? `${plus.io.convertLocalFileSystemURL('_doc')}${tempFilePath.replace('_doc/', '')}`
          : tempFilePath,
        success: (fileInfo) => {
          resolve(fileInfo);
        },
        fail: (error) => {
          logger.error(LogTag.K_RECORD_E, 'getFileInfo fail', error.code, error.message);
          reject(error);
        },
      });
    });
    fileSize = fileInfo.size;
    // #endif

    const hqVoiceMessage = new uni.$RongIMLib.HQVoiceMessage({
      duration,
    });

    uni.$emit(events.SCROLL_TO_BOTTOM);
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
  startY = 0;
});

// 监听录音错误事件
recorderManager.onError((res) => {
  logger.error(LogTag.K_RECORD_E, 'recordStatus:', recordStatus.value, 'Recorder error: ', res.errMsg);
  if (recordStatus.value === 'error') {
    return;
  }
  uni.showToast({
    title: '录音失败',
    icon: 'none',
  });
  recordStatus.value = 'error';
  if (timer !== -1) {
    clearInterval(timer);
    timer = -1;
  }
  // #ifdef APP-PLUS
  if (uni.getSystemInfoSync().platform === 'ios') {
    if (!judgeIosPermission('record')) {
      uni.showToast({
        title: '请授权录音权限',
        icon: 'none',
      });
    }
  } else {
    requestAndroidPermission('android.permission.RECORD_AUDIO').then((hasPermission) => {
      if (hasPermission !== 1) {
        logger.error(LogTag.K_RECORD_E, 'No permission to record in android, hasPermission: ', hasPermission);
        uni.showToast({
          title: '请授权录音权限',
          icon: 'none',
        });
      }
    }).catch((err) => {
      logger.error(LogTag.K_RECORD_E, 'Request permission failed in android, err: ', err);
    });
  }
  // #endif
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
