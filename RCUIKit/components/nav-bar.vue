<template>
	<view class="rc-navbar">
    <view  v-if="statusBar" :style="{ height: statusBarHeight }">
    </view>
		<view class="rc-navbar__content" :class="{'rc-navbar--border': border }" >
			<view :style="{ height:navbarHeight}"
				class="rc-navbar__header">
				<view @tap="$emit('clickLeft')" class="rc-navbar__header-btns rc-navbar__header-btns-left"
					:style="{width:leftIconWidth}">
					<slot name="left">
						<view class="rc-navbar__content_view" v-if="leftIcon.length > 0">
							<RCIcon :type="leftIcon" />
						</view>
						<view :class="{ 'rc-navbar-btn-icon-left': leftIcon.length > 0 }" class="rc-navbar-btn-text"
							v-if="leftText.length">
							<text :style="{fontSize: '12px' }">{{ leftText }}</text>
						</view>
					</slot>
				</view>
				<view class="rc-navbar__header-container " @tap="$emit('clickTitle')">
					<slot>
						<view class="rc-navbar__header-container-inner" v-if="title.length>0">
							<text class="rc-nav-bar-text rc-ellipsis-1">{{ title }}</text>
						</view>
					</slot>
				</view>
				<view @click="$emit('clickRight')" class="rc-navbar__header-btns rc-navbar__header-btns-right"
					:style="{width:rightIconWidth}">
					<slot name="right">
						<view v-if="rightIcon.length">
							<RCIcon :type="rightIcon" />
						</view>
						<view class="rc-navbar-btn-text" v-if="rightText.length && !rightIcon.length">
							<text class="rc-nav-bar-right-text">{{ rightText }}</text>
						</view>
					</slot>
				</view>
			</view>
		</view>
		<!-- #ifndef APP-NVUE -->
		<view class="rc-navbar__placeholder" v-if="fixed">
      <view  v-if="statusBar" :style="{ height: statusBarHeight }">
      </view>
			<view class="rc-navbar__placeholder-view" :style="{ height:navbarHeight}" />
		</view>
		<!-- #endif -->

	</view>
</template>

<script setup lang="ts">
/**
 * 导航栏组件
 */
  import {
    defineEmits, defineProps, computed, PropType,
  } from 'vue';
  import RCIcon from './rc-icon.vue';
  import { IconType } from '../assets/index';

  const emit = defineEmits(['clickLeft', 'clickRight', 'clickTitle']);
  const props = defineProps({
    /** 标题文字 */
    title: {
      type: String,
      default: '',
    },
    /** 左侧按钮文本 */
    leftText: {
      type: String,
      default: '',
    },
    /** 右侧按钮文本 */
    rightText: {
      type: String,
      default: '',
    },
    /** 左侧按钮图标 */
    leftIcon: {
      type: String as PropType<IconType>,
      default: '',
    },
    /** 右侧按钮图标 */
    rightIcon: {
      type: String as PropType<IconType>,
      default: '',
    },
    /** 是否包含状态栏 */
    statusBar: {
      type: Boolean,
      default: true,
    },
    /** 是否展示下边框 */
    border: {
      type: Boolean,
      default: true,
    },
    /** 导航栏高度 */
    height: {
      type: [Number, String],
      default: 50,
    },
    /** 左侧区域宽度 */
    leftWidth: {
      type: [Number, String],
      default: 60,
    },
    /** 右侧区域宽度 */
    rightWidth: {
      type: [Number, String],
      default: 60,
    },
    /** 是否固定在顶部 */
    fixed: {
      type: [Boolean, String],
      default: false,
    },
  });

	const getVal = (val: number | string) => typeof val === 'number' ? `${val}px` : val;

  let statusBarHeight = '0px';
  // #ifdef MP-WEIXIN
  statusBarHeight = `${uni.getWindowInfo().statusBarHeight}px`;
  // #endif
  // #ifndef MP-WEIXIN
  statusBarHeight = `${uni.getSystemInfoSync().statusBarHeight}px`;
  // #endif

	let { height } = props;

	// #ifdef MP-WEIXIN
	// 小程序端导航栏高度需要 44 否则会导致错位
  height = 44;
  // #endif

  const navbarHeight = computed(() => getVal(height));
  const leftIconWidth = computed(() => getVal(props.leftWidth));
  const rightIconWidth = computed(() => getVal(props.rightWidth));

</script>

<style lang="scss" scoped>
@use '../styles/_variables.scss' as var;
	// $nav-height: 44px;

	.rc-nvue-fixed {
		/* #ifdef APP-NVUE */
		position: sticky;
		/* #endif */
	}
	.rc-navbar {
		// box-sizing: border-box;
	}

	.rc-nav-bar-text {
		/* #ifdef APP-PLUS */
		font-size: 34rpx;
		/* #endif */
		/* #ifndef APP-PLUS */
		font-size: 14px;
		/* #endif */
	}

	.rc-nav-bar-right-text {
		font-size: 12px;
	}

	.rc-navbar__content {
		position: relative;
		// background-color: #fff;
		// box-sizing: border-box;
		background-color: transparent;
	}

	.rc-navbar__content_view {
		// box-sizing: border-box;
	}

	.rc-navbar-btn-text {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		line-height: 12px;
	}

	.rc-navbar__header {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		padding: 0 10px;
		flex-direction: row;
		// height: $nav-height;
		font-size: 12px;
	}

	.rc-navbar__header-btns {
		/* #ifndef APP-NVUE */
		overflow: hidden;
		display: flex;
		/* #endif */
		flex-wrap: nowrap;
		flex-direction: row;
		width: 120rpx;
		// padding: 0 6px;
		justify-content: center;
		align-items: center;
		/* #ifdef H5 */
		cursor: pointer;
		/* #endif */
	}

	.rc-navbar__header-btns-left {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		width: 120rpx;
		justify-content: flex-start;
		align-items: center;
	}

	.rc-navbar__header-btns-right {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		// width: 150rpx;
		// padding-right: 30rpx;
		justify-content: flex-end;
		align-items: center;
	}

	.rc-navbar__header-container {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex: 1;
		padding: 0 10px;
		overflow: hidden;
	}

	.rc-navbar__header-container-inner {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex: 1;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		overflow: hidden;
		// box-sizing: border-box;
	}

	.rc-navbar__placeholder-view {
		// height: $nav-height;
	}

	.rc-navbar--fixed {
		position: fixed;
		z-index: 99;
		/* #ifdef H5 */
		left: var(--window-left);
		right: var(--window-right);
		/* #endif */
		/* #ifndef H5 */
		left: 0;
		right: 0;
		/* #endif */

	}

	.rc-navbar--border {
		border-bottom-width: 1rpx;
		border-bottom-style: solid;
		border-bottom-color: var.$rc-color-functional-border;
	}

	.rc-ellipsis-1 {
		overflow: hidden;
		/* #ifndef APP-NVUE */
		white-space: nowrap;
		text-overflow: ellipsis;
		/* #endif */
		/* #ifdef APP-NVUE */
		lines: 1;
		text-overflow: ellipsis;
		/* #endif */
	}

</style>
