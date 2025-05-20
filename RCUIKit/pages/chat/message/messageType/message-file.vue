<template>
  <message-item-common :message="message"  @resend="resendMediaMessage(props.message.messageId!);" customResend>
    <message-bubble :reverse="message.messageDirection === 1">
      <view class="rc-file" @click="handleFileClick">
        <view class="rc-file-icon">
          <RCIcon :type="message.messageDirection === 1 ? 'fileIn' : 'fileOut'" :size="72" />
          <view class="rc-file-status" v-if="downloadStatus !== ''">
            <RCIcon :type="downloadStatus" :size="34" :style="downloadStatusColor"/>
          </view>
        </view>
        <view class="rc-file-info">
          <text class="rc-file-name">{{ message.content.name }}</text>
          <text class="rc-file-size">{{ formatFileSize(message.content.size) }}</text>
        </view>
      </view>
    </message-bubble>
  </message-item-common>
</template>

<script setup lang="ts">
/**
* 文件消息组件
*/
import {
 computed, defineProps, PropType, ref,
} from 'vue';
import MessageItemCommon from '@/RCUIKit/pages/chat/message/message-item-common.vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import MessageBubble from '@/RCUIKit/pages/chat/message/message-bubble.vue';
import { MessageItemType } from '@/RCUIKit/pages/chat/message/message-item.vue';
import { formatFileSize } from '@/RCUIKit/utils';
import { resendMediaMessage } from '@/RCUIKit/utils/upload';
import { AudioManager } from '../manager/audio-manager';

interface FileContent {
  name: string;
  size: number;
  type: string;
  fileUrl: string;
}

const props = defineProps({
  message: {
    type: Object as PropType<MessageItemType & { content: FileContent }>,
    required: true,
  },
});

// 文件下载状态 (仅APP端使用)
const downloadStatus = ref('');
// 缓存的文件路径
const cachedFilePath = ref('');
// 下载任务实例
const downloadTask = ref<UniApp.DownloadTask | null>(null);

const downloadStatusColor = computed(() => {
  const bgColor = props.message.messageDirection === 1 ? '#FFFFFF' : '#C6CBD7';
  return { 'background-color': bgColor };
});

// 支持预览的文件类型
const PREVIEWABLE_FILE_TYPES = ['doc', 'xls', 'ppt', 'pdf', 'docx', 'xlsx', 'pptx'];

// 获取文件扩展名
const getFileExtension = (fileName: string): string => fileName.split('.').pop()?.toLowerCase() || '';

// 处理文件点击
const handleFileClick = async () => {
  // 如果当前有音频在播放，则停止播放
  AudioManager.getInstance().stopAudio();
  // #ifdef H5
  // H5环境下直接下载
  window.open(props.message.content.fileUrl);
  // #endif

  // #ifndef H5
  // 如果正在下载，则取消下载
  if (downloadStatus.value === 'downloadLoading' && downloadTask.value) {
    downloadTask.value.abort();
    downloadStatus.value = '';
    return;
  }

  const fileExtension = getFileExtension(props.message.content.name);
  const isPreviewable = PREVIEWABLE_FILE_TYPES.includes(fileExtension);

  if (isPreviewable) {
    // 支持预览的文件类型，开始下载
    downloadFile();
  } else {
    // 不支持预览的文件类型，提示用户
    uni.showModal({
      title: '提示',
      content: '文件类型不支持预览，请使用浏览器下载后查看。',
      success: (res) => {
        if (res.confirm) {
          uni.setClipboardData({
            data: props.message.content.fileUrl,
            success: () => {
              uni.showToast({
                title: '链接已复制到剪贴板',
                icon: 'none',
              });
            },
          });
        }
      },
    });
  }
  // #endif
};

// #ifndef H5
// 下载文件
const downloadFile = () => {
  downloadStatus.value = 'downloadLoading';

  downloadTask.value = uni.downloadFile({
    url: props.message.content.fileUrl,
    success: (res) => {
      if (res.statusCode === 200) {
        cachedFilePath.value = res.tempFilePath;
        downloadStatus.value = '';
        openFile(res.tempFilePath);
      } else {
        downloadStatus.value = '';
      }
      downloadTask.value = null;
    },
    fail: (error) => {
      downloadStatus.value = '';
      downloadTask.value = null;
    },
  });

  downloadTask.value.onProgressUpdate((res) => {
    if (res.progress === 100) {
      downloadStatus.value = '';
      downloadTask.value = null;
    }
  });
};

// 打开文件预览
const openFile = (filePath: string) => {
  uni.openDocument({
    filePath,
    success: () => {},
    fail: (error) => {
      // 复制链接到剪贴板
      uni.setClipboardData({
        data: props.message.content.fileUrl,
        success: () => {
          uni.showModal({
            title: '提示',
            content: '文件打开失败，请使用浏览器下载后查看。',
          });
        },
      });
    },
  });
};
// #endif

const showToast = (title: string) => {
  uni.showToast({
    title,
    icon: 'none',
  });
};
</script>

<style lang="scss" scoped>
@use '../../../../styles/_variables.scss' as var;

.rc-file {
  display: flex;
  align-items: center;
  padding: 12px;
  max-width: 240px;

  &-icon {
    margin-right: 12px;
    position: relative;
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &-info {
    flex: 1;
    overflow: hidden;
  }

  &-name {
    display: block;
    font-size: var.$rc-font-size-regular;
    line-height: 20px;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &-size {
    display: block;
    font-size: var.$rc-font-size-small;
    line-height: 16px;
  }

  &-status {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
