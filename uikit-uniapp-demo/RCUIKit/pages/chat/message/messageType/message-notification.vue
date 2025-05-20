<template>
  <view class="rc-notify-wraper">
    <view class="rc-notify">
      <slot>
        提示消息提示消息
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 小灰条消息组件
 */
</script>

<style lang="scss" scoped>
@use '../../../../styles/_variables.scss' as var;
.rc-notify-wraper {
  text-align: center;
}
.rc-notify {
  padding: 5px 10px;
  line-height: 22px;
  background-color: var.$rc-color-bg-accent;
  color: var.$rc-color-font-secondary;
  font-size: var.$rc-font-size-small;
  border-radius: 6px;
  display: inline;
}
</style>
