<template>
<view class="rc-face-box">
  <view class="rc-face-list">
    <view class="rc-face-item" v-for="(face, index) in defaultFaces" :key="index" @click.stop.prevent="onClickFace(face)">
      {{ face }}
    </view>
  </view>
</view>
</template>

<script setup lang="ts">
/**
* 表情组件
*/
import { defineEmits } from '../../../../adapter-vue';

const emit = defineEmits(['clickFace']);

const defaultFaces = [
  // u+1f601 - u+1f64f
  '\u{1f601}', '\u{1f602}', '\u{1f603}', '\u{1f604}', '\u{1f605}', '\u{1f606}', '\u{1f607}', '\u{1f608}',
  '\u{1f609}', '\u{1f60a}', '\u{1f60b}', '\u{1f60c}', '\u{1f60d}', '\u{1f60e}', '\u{1f60f}', '\u{1f610}',
  '\u{1f611}', '\u{1f612}', '\u{1f613}', '\u{1f614}', '\u{1f615}', '\u{1f616}', '\u{1f617}', '\u{1f618}',
  '\u{1f619}', '\u{1f61a}', '\u{1f61b}', '\u{1f61c}', '\u{1f61d}', '\u{1f61e}', '\u{1f61f}', '\u{1f620}',
  '\u{1f621}', '\u{1f622}', '\u{1f623}', '\u{1f624}', '\u{1f625}', '\u{1f626}', '\u{1f627}', '\u{1f628}',
  '\u{1f629}', '\u{1f62a}', '\u{1f62b}', '\u{1f62c}', '\u{1f62d}', '\u{1f62e}', '\u{1f62f}', '\u{1f630}',
  '\u{1f631}', '\u{1f632}', '\u{1f633}', '\u{1f634}', '\u{1f635}', '\u{1f636}', '\u{1f637}', '\u{1f638}',
  '\u{1f639}', '\u{1f63a}', '\u{1f63b}', '\u{1f63c}', '\u{1f63d}', '\u{1f63e}', '\u{1f63f}', '\u{1f640}',
  '\u{1f641}', '\u{1f642}', '\u{1f643}', '\u{1f644}', '\u{1f645}', '\u{1f646}', '\u{1f647}', '\u{1f648}',
  '\u{1f649}', '\u{1f64a}', '\u{1f64b}', '\u{1f64c}', '\u{1f64d}', '\u{1f64e}', '\u{1f64f}',
  // u+1f910 - u+1f92f
  '\u{1f910}', '\u{1f911}', '\u{1f912}', '\u{1f913}', '\u{1f914}', '\u{1f915}', '\u{1f916}', '\u{1f917}',
  '\u{1f918}', '\u{1f919}', '\u{1f91a}', '\u{1f91b}', '\u{1f91c}', '\u{1f91d}', '\u{1f91e}', '\u{1f91f}',
  '\u{1f920}', '\u{1f921}', '\u{1f922}', '\u{1f923}', '\u{1f924}', '\u{1f925}', '\u{1f926}', '\u{1f927}',
  '\u{1f928}', '\u{1f929}', '\u{1f92a}', '\u{1f92b}', '\u{1f92c}', '\u{1f92d}', '\u{1f92e}', '\u{1f92f}',
];

const onClickFace = (face: string) => {
  emit('clickFace', face);
};

</script>

<style lang="scss" scoped>
@use '../../../../styles/_variables.scss' as var;
.rc-face {
  &-box {
    height: 234px;
    padding: 0px 10px 10px;
    box-sizing: border-box;
  }
  &-list {
    display: flex;
    flex-wrap: wrap;
    height: 100%;
    justify-content: space-between;
    overflow: scroll;
  }
  &-list::after {
    content: '';
    flex: auto;
  }
  &-item {
    width: 20px;
    height: 20px;
    font-size: 20px;
    line-height: 20px;
    padding: 8px;
  }
}
</style>
