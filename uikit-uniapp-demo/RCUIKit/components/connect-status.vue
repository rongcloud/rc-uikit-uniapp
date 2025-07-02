<template>
  <view class="rc-connect-status" v-if="isConnected">
    <view class="rc-connect-status-item">
      <view class="rc-con-item-middle-name-icon"><RCIcon type="warning" :size="40" /></view>
      <view class="rc-connect-status-item-text">当前网络不可用，请检查你的网络设置</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { RCConnectionStatus } from '@rongcloud/imlib-next';
import { ref } from '../adapter-vue';
import { reaction } from 'mobx';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';

const isConnected = ref(false);

reaction(
  () => uni.$RongKitStore.connectStatus.get(),
  (status: RCConnectionStatus) => {
    isConnected.value = status !== RCConnectionStatus.CONNECTED;
  },
);
</script>

<style lang="scss" scoped>
@use '../styles/_variables.scss' as var;
.rc-connect-status {
  top: 0;
  left: 0;
  width: 100%;
  background-color: rgba(var.$rc-color-functional-error, 0.2);
  font-size: var.$rc-font-size-small;
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 9px 28px;
  &-item {
    display: flex;
    align-items: center;
    &-text {
      margin-left: 4px;
      height: 40rpx;
      line-height: 40rpx;
    }
  }
}
</style>
