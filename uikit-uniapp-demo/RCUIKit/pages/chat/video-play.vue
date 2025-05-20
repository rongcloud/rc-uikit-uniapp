<template>
  <!-- 播放器 -->
  <view class="fullscreen-video">
    <!-- 导航栏 -->
    <!-- #ifdef H5 || MP-WEIXIN -->
    <nav-bar class="video-close-icon" :border="false" :leftWidth="100">
      <template v-slot:left>
        <view class="video-close-icon" @click="handleClose">
          <RCIcon type="close" :size="60" />
        </view>
      </template>
    </nav-bar>
    <!-- #endif -->

    <!-- 视频播放器 -->
    <video
      id="messageVideo"
      :src="videoUrl"
      controls
      :duration="duration"
      class="video-player"
      @error="handleVideoError"
      show-fullscreen-btn="false"
    ></video>
  </view>
</template>

<script setup lang="ts">
/**
 * 视频消息组件
 */
import { ref, onMounted, onUnmounted } from 'vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import NavBar from '@/RCUIKit/components/nav-bar.vue';
import { onLoad } from '@dcloudio/uni-app';

const videoContext = ref<UniApp.VideoContext | null>(null);
const videoUrl = ref<string>('');
const duration = ref<number>(0);
// 处理视频错误
const handleVideoError = (e: any) => {
  console.error('视频播放错误:', e);
  uni.showToast({ title: '视频播放失败', icon: 'none' });
};
// 处理关闭
const handleClose = () => {
  videoContext.value?.pause();
  uni.navigateBack();
};

onLoad(async (option: any) => {
  const { conversationKey, messageKey } = option;
  const messageList = uni.$RongKitStore.messageStore.getMessages(conversationKey);
  const videoMessages = messageList.filter((msg: any) => (msg.messageUId === messageKey || msg.messageId.toString() === messageKey));

  // 获取视频时长，取整
  duration.value = Math.floor(videoMessages[0].content.duration);
  // 构建视频列表
  videoUrl.value = videoMessages[0].content.sightUrl || videoMessages[0].localTmpPath;
});

onMounted(() => {
  videoContext.value = uni.createVideoContext('messageVideo', this);
   // 获取视频时长，取整
   videoContext.value?.play();
});

onUnmounted(() => {
  videoContext.value?.pause();
});
</script>

<style lang="scss">
	/*每个页面公共css */
  @use '../../styles/common.scss';
</style>
<style lang="scss" scoped>
@use '../../styles/_variables.scss' as var;
/* 通用全屏样式 */
.fullscreen-video {
  position: fixed;
  width: 100vw;
  /* #ifdef H5 */
  height: 100%;
  /* #endif */

  /* #ifndef H5 */
  height: 100vh;
  /* #endif */
  background: #000;
  z-index: 9999;

  /* H5和APP共用样式 */
  // #ifdef H5 || APP-PLUS
  top: 0;
  left: 0;
  position: fixed;
  z-index: 9999; /* 需要更高的层级 */
  // #endif

  /* 小程序专用样式 */
  // #ifdef MP-WEIXIN
  position: absolute;
  // #endif
}

/* 关闭按钮适配 */
.video-close-icon {
  position: fixed;
  z-index: 10000; /* 需要比视频层级更高 */
  margin: 16px;
}

.video-player {
  width: 100%;
  height: 100%;
}
</style>
