<template>
  <view class="select-con-item" @click="onSelect">
    <Avatar :size="80" :src="data.portraitUri || DEFAULT_USER_PORTRAIT_SVG" />

    <view class="select-con-item-content">
        {{ data.name }}
    </view>

  </view>
</template>

<script setup lang="ts">
import { PropType } from 'vue';
import Avatar from '@/RCUIKit/components/avatar.vue';
import { DEFAULT_USER_PORTRAIT_SVG } from '@/RCUIKit/assets';

const props = defineProps({
  data: {
    type: Object as PropType<{ portraitUri?: string, name: string}>,
    required: true,
  },
});

const emit = defineEmits(['onSelect']);

const onSelect = () => {
  emit('onSelect', props.data);
};
</script>

<style lang="scss" scoped>
@use '../../../styles/_variables.scss' as var;

.select-con-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: start;
  overflow: hidden;
  background-color: var.$rc-color-bg-auxiliary-1;
  padding: 11px 24px;
  &-content {
    font-size: var.$rc-font-size-regular;
    color: var.$rc-color-font-primary;
    padding-left: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
