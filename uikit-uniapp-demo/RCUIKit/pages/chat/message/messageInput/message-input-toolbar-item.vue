<template>
  <view class="rc-toolbar-item">
    <view class="rc-toolbar-item-button" @tap="handleClick">
      <RCIcon :type="iconSrc" :size="120" />
      <text v-if="text" class="rc-toolbar-item-button-text">{{ text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import RCIcon from '@/RCUIKit/components/rc-icon.vue';

  interface Props {
    icon : string;
    text ?: string;
  }

  const props = defineProps<Props>();
  const emit = defineEmits<{(e : 'click') : void;
  }>();

  const iconSrc = computed(() => `inputToolbar${props.icon}`);

  const handleClick = () => {
    emit('click');
  };
</script>

<style lang="scss" scoped>
  @use '../../../../styles/_variables.scss' as var;

  .rc-toolbar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      &-text {
        font-size: var.$rc-font-size-small;
        font-weight: 400;
        color: var.$rc-color-font-secondary;
        margin-top: 8px;
      }
    }

  }
</style>
