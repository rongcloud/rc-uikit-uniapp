<template>
<view class="rc-bubble"
  :class="[
    className,
    reverse ? 'reverse' : '',
    isCenter ? 'center' : '',
    active ? 'active' : ''
  ]">
  <slot />
</view>
</template>

<script setup lang="ts">
/**
* 消息气泡组件
*/
import { defineProps, ref, computed } from '../../../adapter-vue';

const props = defineProps({
  /**
   * 是否反转
   */
  reverse: {
    type: Boolean,
    default: false,
  },
  /**
  * 消息气泡内容是否居中
   */
  isCenter: {
    type: Boolean,
    default: false,
  },
  /**
   * 是否激活
   */
  active: {
    type: Boolean,
    default: false,
  },
});

const className = ref(props.reverse ? 'rc-bubble-reverse-bg' : 'rc-bubble-bg');
</script>

<style lang="scss" scoped>
@use '../../../styles/_variables.scss' as var;

.rc-bubble {
  border-radius: 20px;
  min-width: 50px;
  min-height: 40px;
  display: inline-block;
  max-width: 100%;
}
.rc-bubble-bg {
  background-color: var.$rc-color-bg-auxiliary-1;
  &.active {
    background-color: var.$rc-color-bg-selected;
  }
}
.rc-bubble-reverse-bg {
  background-color: var.$rc-color-bg-auxiliary-2;
}
.reverse {
  color: var.$rc-color-font-inverse;
}
.center {
  text-align: center;
}
</style>
