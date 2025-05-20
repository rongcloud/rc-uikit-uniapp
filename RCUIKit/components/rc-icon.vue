<template>
  <view
    class="rc-icon-container"
    :class="{ 'rc-icon-clickable': clickable, 'rc-spin': spin }"
    :style="{ width: iconSize, height: iconSize, ...customStyle }"
    @click="handleClick"
  >
    <image
      :class="{ 'rc-circle': circle }"
      :src="iconSrc"
      :style="{ width: iconSize, height: iconSize}"
      :mode="mode"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue';
import { iconType } from '../assets';
import type { IconType } from '../assets';

const props = defineProps({
  /** 图标地址，与 type 二选一 */
  src: {
    type: String,
  },
  /**
   * 图标类型， 与 src 二选一。
   * 例如：传入 'left'，将会在 assets/icon 目录下寻找 left.svg 图标, 如果是暗黑主题，则会寻找 left-dark.svg 图标。
   *
   * 注意：
   * 1. 请确保图标文件存在，并在 assets/index 文件中声明。
   */
  type: {
    type: String,
  },
  /** 图标尺寸 */
  size: {
    type: [String, Number],
    default: '48rpx',
  },
  /** 是否可点击 */
  clickable: {
    type: Boolean,
    default: false,
  },
  /** 图片裁剪模式 */
  mode: {
    type: String,
    default: 'scaleToFill',
  },
  /** 旋转 */
  spin: {
    type: Boolean,
    default: false,
  },
  /** 是否显示为圆形 */
  circle: {
    type: Boolean,
    default: false,
  },
  /** 自定义样式 */
  customStyle: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits<{(e: 'click'): void
}>();

const iconSize = computed(() => {
  const { size } = props;
  return typeof size === 'number' ? `${size}rpx` : size;
});

const iconSrc = computed(() => {
  if (props.type) {
    const { type } = props;
    // TODO: 暗黑主题
    return iconType[type as keyof typeof iconType];
  }
  return props.src;
});

const handleClick = () => {
  if (props.clickable) {
    emit('click');
  }
};
</script>

<style scoped lang="scss">
.rc-icon-container {
  overflow: hidden;
  padding: 1px;
}

.rc-icon-clickable {
  cursor: pointer;
  transition: opacity 0.2s;

  // 使用父选择器处理伪类状态
  &:active {
    opacity: 0.7;
  }

  // 嵌套媒体查询
  @media (hover: none) {
    &:active {
      opacity: 0.7;
    }
  }
}
.rc-circle {
  border-radius: 50%;
}

.rc-spin {
  animation: rotateAnimation 2s linear infinite;
}
@keyframes rotateAnimation {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
