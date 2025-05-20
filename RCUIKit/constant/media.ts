// 图片缩略图处理相关常量配置
export const IMAGE_THUMBNAIL_CONFIG = {
  MAX_HEIGHT: 240, // 最大高度
  MAX_WIDTH: 240, // 最大宽度
  DEFAULT_QUALITY: 1, // 默认质量，如超出消息大小限制，则会自动降低质量
  DEFAULT_SCALE: 1, // 默认缩放比例
  MIN_QUALITY: 0.1, // 最小质量
  TIMEOUT: 10000, // 10秒超时
  SIZE_BUFFER: 10 * 1024, // 预留 10KB 空间
} as const;

// 视频拍摄最大时长 30s
 export const VIDEO_MAX_DURATION = 30;
