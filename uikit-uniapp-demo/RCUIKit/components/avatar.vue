<template>
  <rcicon
    class="rc-avatar-icon"
    :src="finalSrc"
    :size="size"
    :clickable="clickable"
    :style="avatarStyle"
    @click="handleClick"
    :circle="true"
  />
</template>

<script setup lang="ts">
import { computed } from '../adapter-vue';
import rcicon from './rc-icon.vue';
import { DEFAULT_GROUP_PORTRAIT_SVG } from '../assets/index';

const props = defineProps({
  // 头像地址（非必传）
  src: {
    type: String,
    default: null,
  },
  // 是否可点击
  clickable: {
    type: Boolean,
    default: false,
  },
  // 头像尺寸（支持数字或带单位字符串）
  size: {
    type: Number,
    default: 104,
  },
  // 圆角设置（默认50%圆形）
  borderRadius: {
    type: String,
    default: '50%',
  },
  // 默认头像地址
  defaultSrc: {
    type: String,
    default: DEFAULT_GROUP_PORTRAIT_SVG, // 需要实际存在的默认图片路径
  },
});

const emit = defineEmits<{(e: 'click'): void
}>();

// 计算最终显示的图片地址
const finalSrc = computed(() => {
  const src = props.src || props.defaultSrc;
  return src;
});

// 组合样式
const avatarStyle = computed(() => ({
  borderRadius: props.borderRadius,
  overflow: 'hidden',
}));

// 点击处理
const handleClick = () => {
  if (props.clickable) {
    emit('click');
  }
};
</script>

<style scoped>

</style>
