<template>
  <div class="empty-wrapper">
    <image
      class="empty-img"
      src="https://yx-web-nosdn.netease.im/common/e0f58096f06c18cdd101f2614e6afb09/empty.png"
    />
    <div class="empty-text">{{ text }}</div>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, withDefaults } from '../utils/transformVue';

withDefaults(
  defineProps<{
    text?: string
  }>(),
  {
    text: '',
  },
);
</script>
<style lang="scss" scoped>
.empty-wrapper {
  margin: 75px 10px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;

  .empty-img {
    display: block;
    width: 125px;
    height: 100px;
  }

  .empty-text {
    display: block;
    color: #a6adb6;
    margin: 10px;
  }
}
</style>
