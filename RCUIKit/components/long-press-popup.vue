<template>
  <view class="rc-long-press-popup">
    <view class="rc-long-press-popup-slot"
      @longpress="handleLongPress"
      @touchmove="handleTouchMove"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <slot/>
    </view>

    <!-- 遮罩层 -->
    <view
      v-if="showPopup"
      class="rc-long-press-popup-mask"
      @click="handleMaskClick"
      :style="maskStyle"
      @longpress.stop
      @touchmove.stop.prevent
    ></view>

    <!-- 弹框内容 -->
    <view
      v-if="showPopup"
      class="rc-long-press-popup-content"
      :style="popupStyle"
      @click.stop
    >
      <view
        v-for="(item, index) in options"
        :key="index"
        class="rc-long-press-popup-item"
        @click="handleSelect(item)"
      >
        <RCIcon :type="item.type" :size="'20px'" :circle="false"/>
        <text class="rc-long-press-popup-text">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
/**
 * 注意事项：
 * - 此组件只能使用选项式 API, 使用组合式 API 时在小程序平台无法取到元素的坐标
 */
import { PropType } from 'vue';
import RCIcon from './rc-icon.vue';
import { events } from '../constant/events';

export interface IOptionType {
  type: string;
  label: string;
}

const itemHeight = 45;
const padding = 8;
let touchStartY = 0;
let touchMoveY = 0;
let touchStartX = 0;
let touchMoveX = 0;
let longPressTimer: number | null = null;
const LONG_PRESS_DELAY = 500; // 长按触发延迟时间

/**
 * 是否正在处理长按事件
 * 避免多指长按时, 长按事件触发多次
 */
let isBusy = false;

export default {
  name: 'RCUILongPressPopup',
  components: {
    RCIcon,
  },
  data() {
    return {
      showPopup: false,
      popupPosition: {
        x: 0,
        y: 0,
      },
      isLongPress: false,
      touchPosition: {
        x: 0,
        y: 0,
      },
      maskStyle: {
        top: '0px',
        bottom: '0px',
      },
    };
  },
  props: {
    /**
     * 弹框距离屏幕边界的最小距离
     */
    margin: {
      type: Number,
      default: 60,
    },
    options: {
      type: Array as PropType<IOptionType[]>,
      default: () => [],
    },
    /**
     * 弹框位置
     * - auto: 自动计算位置，位于长按元素的上方或下方
     * - touch: 跟随手指位置
     */
    position: {
      type: String as PropType<'auto' | 'touch'>,
      default: 'auto',
    },
    /**
     * 是否禁用长按功能
     */
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['select', 'showStatusChange'],
  computed: {
    popupStyle() {
      return {
        left: `${this.popupPosition.x}px`,
        top: `${this.popupPosition.y}px`,
      };
    },
  },
  mounted() {
    uni.$on(events.INPUT_STATUS_CHANGE, this.handleMaskClick);
  },
  unmounted() {
    uni.$off(events.INPUT_STATUS_CHANGE, this.handleMaskClick);
  },
  methods: {
    handleLongPress(event: any): void {
      if (this.disabled) return;
      if (this.options.length === 0) return;
      if (Math.abs(touchMoveY - touchStartY) < 10) {
        this.computePopupPosition(event);
      }
    },
    handleTouchStart(event: any): void {
      if (this.disabled) return;
      if (isBusy) return;
      isBusy = true;
      touchStartY = event.touches[0].clientY;
      touchMoveY = touchStartY;
      touchStartX = event.touches[0].clientX;
      touchMoveX = touchStartX;

      // 设置长按定时器
      longPressTimer = setTimeout(() => {
        this.handleLongPress(event);
      }, LONG_PRESS_DELAY);
    },
    handleTouchMove(event: any): void {
      if (this.disabled) return;
      touchMoveY = event.touches[0].clientY;
      touchMoveX = event.touches[0].clientX;
      // 如果移动距离超过阈值，取消长按
      if (Math.abs(touchMoveY - touchStartY) > 10 || Math.abs(touchMoveX - touchStartX) > 10) {
        this.clearLongPressTimer();
      }
    },
    handleTouchEnd(): void {
      this.clearLongPressTimer();
    },
    clearLongPressTimer(): void {
      isBusy = false;
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    },
    async computePopupPosition(event: any) {
      this.isLongPress = true;
        const { clientX, clientY } = event.touches[0];
        this.touchPosition = { x: clientX, y: clientY };

        // 获取系统信息
        const systemInfo = uni.getWindowInfo();
        const {
          windowWidth, windowHeight, screenHeight, windowBottom,
        } = systemInfo;
        const data = await new Promise<any>((resolve) => {
          uni.createSelectorQuery()
            .in(this)
            .select('.rc-long-press-popup')
            .boundingClientRect(resolve)
            .exec();
        });
        const {
          width, height, left, top, right, bottom,
        } = data;

        const popupWidth = 160;
        const popupHeight = itemHeight * this.options.length + padding * 2; // 弹框高度
        const bottomInsetsHeight = uni.getWindowInfo().safeAreaInsets.bottom + 56; // 底部安全区高度, 56 是输入框高度
        // #ifdef MP-WEIXIN
        this.maskStyle = { top: `${0 - top}px`, bottom: `${bottom - screenHeight + bottomInsetsHeight}px` };
        // #endif
        const topInsetsHeight = uni.getWindowInfo().safeAreaInsets.top; // 顶部导航栏高度

        // 由于小程序平台，在 scroll-view 中子元素使用 fixed 定位时是相对于 scroll-view 的，而不是屏幕，所以这里使用 absolute 定位
        if (this.position === 'touch') {
          let x = clientX - left;
          let y = clientY - top;

          // 弹框右侧超出屏幕宽度时调整定位
          if (left + x + popupWidth + this.margin > windowWidth) {
            x = windowWidth - left - popupWidth - this.margin;
          }
          // 弹框左侧超出屏幕宽度时调整定位
          if (left + x < this.margin) {
            x = this.margin - left;
          }
          // 弹框超出屏幕顶部时调整定位
          if (y + top < this.margin) {
            y = this.margin + topInsetsHeight - top;
          }
          // 弹框超出屏幕底部时调整定位
          if (top + y + popupHeight + this.margin > windowHeight) {
            y = -popupHeight + clientY - top;
          }
          this.popupPosition = { x, y };
        } else {
          let x = 0;
          let y = bottom - height;
          const spaceBelow = windowHeight - bottom;

          // 如果屏幕底部有足够的空间，则将弹框定位在长按元素的下方
          if (spaceBelow >= popupHeight + this.margin) {
            y = height;
          } else if (top >= popupHeight + this.margin) {
            // 如果屏幕顶部有足够的空间，则将弹框定位在长按元素的上方
            y = 0 - popupHeight;
          } else {
            // 如果屏幕顶部和底部都没有足够的空间，则将弹框定位在屏幕顶部
            y = this.margin + topInsetsHeight - top;
          }
          // 如果弹框右侧超出屏幕宽度时调整定位
          if (left + popupWidth + this.margin > windowWidth) {
            x = windowWidth - popupWidth - this.margin - left;
          }
          // 如果弹框左侧超出屏幕宽度时调整定位
          if (left + x < this.margin) {
            x = this.margin - left;
          }
          this.popupPosition = { x, y };
        }
        this.showPopup = true;
        this.$emit('showStatusChange', true);

        setTimeout(() => {
          this.isLongPress = false;
          }, 300);
    },
    handleMaskClick() {
      if (this.isLongPress) {
        return;
      }
      this.showPopup = false;
      isBusy = false;
      this.$emit('showStatusChange', false);
    },
    handleSelect(item: IOptionType) {
      if (this.isLongPress) {
        return;
      }
      this.$emit('select', item.type);
      this.showPopup = false;
      isBusy = false;
      this.$emit('showStatusChange', false);
    },
  },
};
</script>

<style lang="scss">

@use '../styles/_variables.scss' as var;
.rc-long-press-popup {
  position: relative;
  // display: inline-block;

  &-mask {
    // #ifdef MP-WEIXIN
    position: absolute;
    top: -500px;
    left: -500px;
    right: -500px;
    bottom: -500px;
    // #endif
    // #ifndef MP-WEIXIN
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    // #endif
    z-index: 90;
    background-color: transparent;
  }
  &-content {
    position: absolute;
    z-index: 99;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    padding: 8px 0;
    min-width: 160px;
    max-width: 200px;
  }

  &-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    justify-content: space-between;

    &:active {
      background-color: #f5f5f5;
    }
  }

  &-icon {
    width: 20px;
    height: 20px;
    margin-right: 12px;
  }

  &-text {
    font-size: var.$rc-font-size-base;
    color: #333;
  }
}
</style>
