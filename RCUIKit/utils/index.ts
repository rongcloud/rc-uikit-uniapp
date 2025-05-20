import { IKitConversation } from '@rongcloud/imkit-store';
import { DEFAULT_GROUP_PORTRAIT_SVG, DEFAULT_USER_PORTRAIT_SVG, DEFAULT_SYSTEM_PORTRAIT_SVG } from '../assets/index';
import { MessageType } from '@rongcloud/imlib-next';
import { IMAGE_THUMBNAIL_MAX_SHOW_SIZE } from '../constant';

export {
  getFileName,
  getImageInfo,
  calculateImageSize,
  generateImageThumbnail,
  generateVideoThumbnail,
} from './media';

/**
 * 用于 mobx 监听数据的深拷贝
 */
export const deepClone = <T>(source: T, visited = new WeakMap()): T => {
  if (source === null || typeof source !== 'object') {
    return source;
  }

  if (visited.has(source)) {
    return visited.get(source);
  }
  let clone: any;

  if (source instanceof Date) {
    clone = new Date(source.getTime());
  } else if (source instanceof RegExp) {
    clone = new RegExp(source);
  } else if (source instanceof Map) {
    clone = new Map();
    visited.set(source, clone);
    source.forEach((value, key) => {
      clone.set(key, deepClone(value, visited));
    });
  } else if (source instanceof Set) {
    clone = new Set();
    visited.set(source, clone);
    source.forEach((value) => {
      clone.add(deepClone(value, visited));
    });
  } else if (Array.isArray(source)) {
    clone = [];
    visited.set(source, clone);
    for (let i = 0; i < source.length; i++) {
      clone[i] = deepClone(source[i], visited);
    }
  } else {
    clone = Object.create(Object.getPrototypeOf(source));
    visited.set(source, clone);
    for (const prop in source) {
      if (Object.prototype.hasOwnProperty.call(source, prop)) {
        clone[prop] = deepClone(source[prop], visited);
      }
    }
  }

  return clone;
};

/**
 * 格式化时间展示
 * 当天显示时间，昨天显示昨天，7天内显示星期，当年内显示月日，跨年显示完整日期
 * @param isShowTime 非今日时间是否显示时间
 */
export const formatTime = (timestamp: number, isShowTime: boolean = false) => {
  const ONE_DAY_MS = 1000 * 60 * 60 * 24;
  const date = new Date(Number(timestamp));
  const now = new Date();

  // 解构常用日期属性
  const [currentYear, currentDate] = [now.getFullYear(), now.getDate()];

  const targetYear = date.getFullYear();
  const targetMonth = date.getMonth() + 1;
  const targetDate = date.getDate();
  const targetDay = date.getDay();

  // 判断是否同一天
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();

  // 判断是否是昨天
  const isYesterday = (target: Date) => {
    const yesterday = new Date(now);
    yesterday.setDate(currentDate - 1);
    return isSameDay(yesterday, target);
  };

  // 具体时间
  const time = date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).slice(0, 5);

  // 格式化函数
  const formater = (data: string) => isShowTime ? `${data} ${time}` : data;

  // 当天时间
  if (isSameDay(now, date)) {
    return time;
  }

  // 昨天
  if (isYesterday(date)) return formater('昨天');

  // 计算差异天数
  const diffDays = Math.floor((now.getTime() - date.getTime()) / ONE_DAY_MS);

  // 一周内显示星期
  if (diffDays <= 7) {
    const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return formater(week[targetDay]);
  }

  // 当年显示月日
  if (currentYear === targetYear) {
    return formater(`${targetMonth}月${targetDate}日`);
  }

  // 跨年显示完整日期
  return formater(`${targetYear}年${targetMonth + 1}月${targetDate}日`);
};

/**
 * 解析会话名称
 * 顺序： 昵称 > 名称 > 默认名称[会话类型前缀_targetId_channelId]
 */
export const parseConversationName = (item: IKitConversation) => {
  const {
 conversationType, targetId, name, channelId,
} = item;
  if (name) {
    return name;
  }

  // 生成默认名称
  switch (conversationType) {
    case uni.$RongIMLib.ConversationType.PRIVATE:
      return `P_${targetId}_${channelId}`;
    case uni.$RongIMLib.ConversationType.GROUP:
      return `G_${targetId}_${channelId}`;
    case uni.$RongIMLib.ConversationType.SYSTEM:
      return `S_${targetId}_${channelId}`;
  }
};

/**
 * 生成默认头像
 * 按照会话类型引入不同的默认头像
 */
export const generateDefaultAvatar = (conversationType: number) => {
  switch (conversationType) {
    case uni.$RongIMLib.ConversationType.PRIVATE:
      return DEFAULT_USER_PORTRAIT_SVG;
    case uni.$RongIMLib.ConversationType.GROUP:
      return DEFAULT_GROUP_PORTRAIT_SVG;
    case uni.$RongIMLib.ConversationType.SYSTEM:
      return DEFAULT_SYSTEM_PORTRAIT_SVG;
    default:
      return '';
  }
};

/**
 * 计算图片大小
 */
export const calcImageSize = (width: number, height: number) => {
  let showWidth = 0;
  let showHeight = 0;
  const ratio = height / width;
  // 根据宽高比例，如果较大者超过 IMAGE_THUMBNAIL_MAX_SHOW_SIZE，则较小者按比例缩放，不大于 IMAGE_THUMBNAIL_MAX_SHOW_SIZE 按照原始大小展示
  if (width > IMAGE_THUMBNAIL_MAX_SHOW_SIZE || height > IMAGE_THUMBNAIL_MAX_SHOW_SIZE) {
    if (width > height) {
      showWidth = IMAGE_THUMBNAIL_MAX_SHOW_SIZE;
      showHeight = IMAGE_THUMBNAIL_MAX_SHOW_SIZE * ratio;
    } else {
      showHeight = IMAGE_THUMBNAIL_MAX_SHOW_SIZE;
      showWidth = IMAGE_THUMBNAIL_MAX_SHOW_SIZE / ratio;
    }
  } else {
    showWidth = width;
    showHeight = height;
  }
  return {
    showWidth,
    showHeight,
  };
};

const systemInfo = uni.getSystemInfoSync();

const platform = systemInfo.uniPlatform;

export const isH5 = () => platform === 'web';

export const isApp = () => platform === 'app';

export const isWeixin = () => platform === 'mp-weixin';

export const isAndroidApp = () => systemInfo.osName === 'android' && isApp();

export const uniRuntimeVersion = () => systemInfo.uniRuntimeVersion;

export const parseMessage2Text = (messageType: string, content: string = ''): string => {
  switch (messageType) {
    case MessageType.TEXT:
    case MessageType.REFERENCE:
      return content.trim();
    case MessageType.IMAGE:
    case MessageType.GIF:
      return '[图片]';
    case MessageType.FILE:
      return '[文件]';
    case MessageType.VOICE:
    case MessageType.HQ_VOICE:
      return '[语音]';
    case MessageType.LOCATION:
      return '[位置]';
    case MessageType.SIGHT:
      return '[小视频]';
    case MessageType.COMBINE:
      return content;
    default:
      return '[未知消息]';
  }
};

// 计算内容区域高度
export function calculateContentHeight(): string {
  const systemInfo = uni.getSystemInfoSync();
  const {
    windowHeight, windowBottom, windowTop,
  } = systemInfo;

  return `${windowHeight - windowBottom - windowTop}px`;
}

// 格式化文件大小
export const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size}B`;
  } if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)}KB`;
  } if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  }
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)}GB`;
};

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
  let lastTime = 0;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
};

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
  let timer: number = -1;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * 版本号比较
 * @param v1 版本号1
 * @param v2 版本号2
 * @returns 0: 相等, -1: v1 小于 v2, 1: v1 大于 v2
 */
export const versionCompare = (v1: string, v2: string) => {
  const split1 = v1.split('.');
  const split2 = v2.split('.');
  const maxLength = Math.max(split1.length, split2.length);
  for (let i = 0; i < maxLength; i++) {
    const num1 = parseInt(split1[i] || '0', 10);
    const num2 = parseInt(split2[i] || '0', 10);
    if (num1 < num2) {
      return -1;
    }
    if (num1 > num2) {
      return 1;
    }
  }
  return 0;
};
