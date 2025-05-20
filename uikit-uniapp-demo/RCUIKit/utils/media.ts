import { ErrorCode, MessageType } from '@rongcloud/imlib-next';
import { IAsyncRes, MAX_MESSAGE_CONTENT_BYTES } from '@rongcloud/engine';
import { IKitThumbnailConfig, IKitImageInfo } from '@rongcloud/imkit-store';
import { IMAGE_THUMBNAIL_CONFIG } from '../constant/media';
import { isH5, isApp, isWeixin } from './index';

type ResolveFunc = (value: IAsyncRes<IKitImageInfo>) => void;

export interface IKitGetImageInfo extends IKitImageInfo {
  width: number;
  height: number;
  type: string;
}

/**
 * 获取文件名
 * @param path 文件路径
 * @returns 文件名
 */
export const getFileName = (path: string): string => {
  // http://tmp/n76Occekm2bN6d2fbb9c333d1ec97cbe9a7c640cd245.jpg
  // file:///var/mobile/Containers/Data/Application/5E062749-DB76-4D2A-991A-8F05DF99AB9F/Documents/Pandora/apps/HBuilder/doc/uni_media/1742784280829.jpg
  // 获取文件名，包含扩展名
  const fileName = path.split('/').pop();
  return fileName || '';
};

/**
 * 等比例计算图片最终大小
 * @param originalWidth 原始宽度
 * @param originalHeight 原始高度
 * @param maxWidth 最大宽度限制
 * @param maxHeight 最大高度限制
 * @returns {{ width: number; height: number }} 计算后的宽高
 */
export const calculateImageSize = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } => {
  // 处理负值和 0 值情况
  const width = Math.max(0, originalWidth);
  const height = Math.max(0, originalHeight);

  // 如果宽度或高度为 0，直接返回 0 尺寸
  if (width === 0 || height === 0) {
    return { width: 0, height: 0 };
  }

  // 原始宽高比
  const aspectRatio = width / height;

  let targetWidth = width;
  let targetHeight = height;

  // 如果宽度超过最大宽度
  if (targetWidth > maxWidth) {
    targetWidth = maxWidth;
    targetHeight = targetWidth / aspectRatio;
  }

  // 如果高度超过最大高度
  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
    targetWidth = targetHeight * aspectRatio;
  }

  // 确保结果为整数
  return {
    width: Math.floor(targetWidth),
    height: Math.floor(targetHeight),
  };
};

/**
 * 根据文件或路径生成缩略图
 * @param file 图片文件
 * @param filePath 图片路径
 * @param config 缩略图配置选项
 * @returns 包含缩略图数据的Promise
 */
export const generateImageThumbnail = (file?: File, filePath?: string, config?: IKitThumbnailConfig) : Promise<IAsyncRes<IKitImageInfo>> => {
  if (isH5() && file) {
    return getImageThumbnailWithFile(file!, config);
  } if (filePath) {
    return generateImageThumbnailWithPath(filePath, config);
  }
  return Promise.resolve({
    code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
    msg: 'Invalid image file or path',
  });
};

/**
 * 根据视频文件或路径生成缩略图
 * @param videoFile 视频文件
 * @param path 视频路径
 * @param config 缩略图配置选项
 * @returns 包含缩略图数据的Promise
 */
export const generateVideoThumbnail = (videoFile?: File, path?: string, config?: IKitThumbnailConfig): Promise<IAsyncRes<IKitImageInfo>> => {
  if (isH5() && videoFile) {
    return generateVideoThumbnailWithFile(videoFile, config);
  }
  if (!isH5() && path) {
    return generateImageThumbnailWithPath(path, config);
  }
  return Promise.resolve({
    code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
    msg: 'Invalid video file or path',
  });
};

/**
 * 获取图片信息, 宽、高、类型、缩略图（未压缩）(app 环境下不生成缩略图)
 * @param fileOrPath 图片文件或路径
 * @returns Promise<IAsyncRes<IKitGetImageInfo>> 图片信息
 */
export async function getImageInfo(file?: File, filePath?: string): Promise<IAsyncRes<IKitGetImageInfo>> {
  if (isH5() && file) {
    try {
      const dimensions = await getImageDimensionsWithFile(file);
      const base64Res = await readImageBase64H5(file);
      let thumbnail = '';
      if (base64Res.code === ErrorCode.SUCCESS) {
        thumbnail = base64Res.data?.thumbnail || '';
      }
      return {
        code: ErrorCode.SUCCESS,
        data: {
          thumbnail,
          width: dimensions.width,
          height: dimensions.height,
          type: file?.type || '',
        },
      };
    } catch (error) {
      return {
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: '处理图片失败',
      };
    }
  }

  if (filePath) {
    const uniGetImageInfo = new Promise<UniNamespace.GetImageInfoSuccessData | undefined>((resolve) => {
      uni.getImageInfo({
        src: filePath,
        success: (res) => {
          resolve(res);
        },
        fail: () => {
          resolve(undefined);
        },
      });
    });

    const imageInfo = await uniGetImageInfo;
    if (!imageInfo || !imageInfo.width || !imageInfo.height || !imageInfo.type) {
      return {
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: '获取图片信息失败',
      };
    }

    let thumbnail = '';
    // gif 图片不生成缩略图
    if (imageInfo.type !== 'image/gif' && imageInfo.type !== 'gif') {
      if (isWeixin()) {
        const base64Res = await readImageBase64Weixin(filePath);
        if (base64Res.code === ErrorCode.SUCCESS) {
          thumbnail = base64Res.data?.thumbnail || '';
        }
      } else if (isApp()) {
        const file = await getFile(filePath);
        if (file) {
          const base64Res = await readImageBase64Native(file);
          if (base64Res.code === ErrorCode.SUCCESS) {
            thumbnail = base64Res.data?.thumbnail || '';
          }
        } else {
          return {
            code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
            msg: 'Invalid image file or path',
          };
        }
      }
    }

    return {
      code: ErrorCode.SUCCESS,
      data: {
        thumbnail,
        width: imageInfo.width,
        height: imageInfo.height,
        type: imageInfo.type,
      },
    };
  }

  return {
    code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
    msg: 'Invalid image file or path',
  };
}

const getFile = (path : string): Promise<File | undefined> => new Promise((resolve) => {
  plus.io.resolveLocalFileSystemURL(path, (entry) => {
    if (entry.isFile) {
      (entry as any).file((file: File) => {
        resolve(file);
      });
    } else {
      resolve(undefined);
    }
  }, (err) => {
    resolve(undefined);
  });
});

/**
 * 获取文件的信息，包括大小和文件对象(非 h5 环境)
 * @param tempFilePath 临时文件路径
 * @returns 文件信息，包括大小和可能的文件对象
 */
async function getFileInfo(tempFilePath: string): Promise<IAsyncRes<{size: number, file?: any}>> {
  try {
    if (isWeixin()) {
      const fileManager = uni.getFileSystemManager();
      if (!fileManager) {
        return {
          code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
          msg: '获取文件信息失败',
        };
      }

      const fileInfo = await new Promise<UniNamespace.GetFileInfoSuccess>((resolve, reject) => {
        fileManager.getFileInfo({ filePath: tempFilePath, success: resolve, fail: reject });
      });

      const { size } = fileInfo;
      if (size === 0) {
        return {
          code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
          msg: 'Invalid image compressed file',
        };
      }
      return {
        code: ErrorCode.SUCCESS,
        data: { size },
      };
    }
    // app 平台
    const file = await getFile(tempFilePath);
    if (!file) {
      return {
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: 'Invalid file path',
      };
    }

    const { size } = file as any;
    if (size === 0) {
      return {
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: 'Invalid file path',
      };
    }

    return {
      code: ErrorCode.SUCCESS,
      data: {
        size,
        file,
      },
    };
  } catch (error) {
    return {
      code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
      msg: '获取文件信息失败',
    };
  }
}

/**
 * 读取图片Base64数据 - 微信环境
 * @param filePath 文件路径
 * @returns 图片的Base64数据
 */
const readImageBase64Weixin = (filePath: string): Promise<IAsyncRes<IKitImageInfo>> => new Promise<IAsyncRes<IKitImageInfo>>((resolve) => {
    const fileManager = uni.getFileSystemManager();
    if (!fileManager) {
      resolve({
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: '读取图片数据失败',
      });
      return;
    }

    fileManager.readFile({
      filePath,
      encoding: 'base64',
      success: (res) => {
        resolve({
          code: ErrorCode.SUCCESS,
          data: {
            thumbnail: res.data as string,
          },
        });
      },
      fail: () => {
        resolve({
          code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
          msg: '读取图片数据失败',
        });
      },
    });
  });

/**
 * 读取图片Base64数据 - iOS、android 环境
 * @param file 文件对象
 * @returns 图片的Base64数据
 */
const readImageBase64Native = (file: any): Promise<IAsyncRes<IKitImageInfo>> => new Promise<IAsyncRes<IKitImageInfo>>((resolve) => {
  const reader = new plus.io.FileReader();

    // 设置超时处理
    const timeoutId = setTimeout(() => {
      resolve({
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: '读取图片数据超时',
      });
    }, IMAGE_THUMBNAIL_CONFIG.TIMEOUT);

    const cleanup = () => {
      clearTimeout(timeoutId);
    };

    reader.onloadend = () => {
      cleanup();

      if (!reader.result) {
        resolve({
          code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
          msg: '读取图片数据失败',
        });
        return;
      }

      try {
        // 删除 base64 中的 data:image/jpeg;base64, 前缀
        const reg = /data:image\/[^;]+;base64,/;
        const base64 = reader.result.replace(reg, '');

        resolve({
          code: ErrorCode.SUCCESS,
          data: {
            thumbnail: base64,
          },
        });
      } catch (error) {
        resolve({
          code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
          msg: '处理图片数据失败',
        });
      }
    };

    reader.onerror = (error) => {
      console.error('reader.onerror', error);
      cleanup();
      resolve({
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: '读取图片数据出错',
      });
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      cleanup();
      resolve({
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: '读取图片数据异常',
      });
    }
  });

/**
 * 在 H5 环境中读取图片文件并转换为 Base64 格式
 * @param file 图片文件对象
 * @returns Promise<IAsyncRes<IKitImageInfo>> 包含 Base64 格式的图片数据
 */
export const readImageBase64H5 = async (file: File): Promise<IAsyncRes<IKitImageInfo>> => {
  // 验证文件类型
  if (!file || !/^image\/(jpeg|png|gif|bmp|webp)$/i.test(file.type)) {
    return {
      code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
      msg: '无效的图片文件类型',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    // 设置超时处理
    const timeoutId = setTimeout(() => {
      resolve({
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: '读取图片超时',
      });
    }, IMAGE_THUMBNAIL_CONFIG.TIMEOUT);

    const cleanup = () => {
      clearTimeout(timeoutId);
    };

    reader.onload = () => {
      cleanup();

      if (!reader.result) {
        resolve({
          code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
          msg: '读取图片数据失败',
        });
        return;
      }

      try {
        // 删除 base64 中的 data:image/jpeg;base64, 前缀
        const base64 = reader.result.toString().replace(/^data:image\/[^;]+;base64,/, '');

        resolve({
          code: ErrorCode.SUCCESS,
          data: {
            thumbnail: base64,
          },
        });
      } catch (error) {
        resolve({
          code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
          msg: '处理图片数据失败',
        });
      }
    };

    reader.onerror = () => {
      cleanup();
      resolve({
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: '读取图片文件失败',
      });
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      cleanup();
      resolve({
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: '读取图片文件异常',
      });
    }
  });
};

/**
 * 压缩图片
 * @param filePath 图片路径
 * @param config 压缩配置
 * @returns 压缩结果，包含压缩后的文件路径
 */
const compressImageWithPath = async (filePath: string, config: {
  compressedWidth: number,
  compressedHeight: number,
  quality: number
}): Promise<IAsyncRes<{tempFilePath: string}>> => {
  try {
    // 执行压缩
    const result = await new Promise<UniNamespace.CompressImageSuccessResult>((resolve, reject) => {
      uni.compressImage({
        src: filePath,
        quality: config.quality * 100,
        compressedWidth: config.compressedWidth,
        compressedHeight: config.compressedHeight,
        success: resolve,
        fail: (error) => {
          reject(new Error(`压缩图片失败: ${error.errMsg || JSON.stringify(error)}`));
        },
      });
    });

    // 返回压缩结果
    return {
      code: ErrorCode.SUCCESS,
      data: {
        tempFilePath: result.tempFilePath,
      },
    };
  } catch (error) {
    return {
      code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
      msg: (error as Error).message || '压缩图片失败',
    };
  }
};

const getThumbnailWithPath = async (
  filePath: string,
  config: {
    compressedWidth: number,
    compressedHeight: number,
    quality: number
  },
): Promise<IAsyncRes<{tempFilePath: string}>> => {
  // 执行压缩
  const compressResult = await compressImageWithPath(filePath, config);
  if (compressResult.code !== ErrorCode.SUCCESS || !compressResult.data) {
    return compressResult;
  }
  const { tempFilePath: compressedFilePath } = compressResult.data;
  // 获取压缩后文件大小
  const fileInfoResult = await getFileInfo(compressedFilePath);
  if (fileInfoResult.code !== ErrorCode.SUCCESS || !fileInfoResult.data || !fileInfoResult.data.size) {
    return {
      code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
      msg: '获取压缩后文件信息失败',
    };
  }
  const { size } = fileInfoResult.data;
  // 检查文件大小是否超过限制
  const sizeLimit = MAX_MESSAGE_CONTENT_BYTES - IMAGE_THUMBNAIL_CONFIG.SIZE_BUFFER;
  // web 是通过字符串长度判断的size，所以这里将原本数据的 size * 大概的增量
  if (size * 1.35 <= sizeLimit) {
    return {
      code: ErrorCode.SUCCESS,
      data: { tempFilePath: compressedFilePath },
    };
  }

  // 计算新的压缩质量
  const newQuality = config.quality - 0.1;
  if (newQuality <= IMAGE_THUMBNAIL_CONFIG.MIN_QUALITY) {
    return {
      code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
      msg: '无法将图片压缩到所需大小',
    };
  }
  // 递归检查压缩结果
  return getThumbnailWithPath(
    compressedFilePath,
    {
      ...config,
      quality: newQuality,
    },
  );
};

/**
 * 根据图片路径生成带有缩略图的图片信息
 * @param filePath 图片文件路径
 * @param config 缩略图配置
 * @returns 包含缩略图数据的Promise
 */
const generateImageThumbnailWithPath = async (filePath: string, config?: IKitThumbnailConfig): Promise<IAsyncRes<IKitImageInfo>> => {
  // 解构配置参数并提供默认值
  const {
    maxHeight = IMAGE_THUMBNAIL_CONFIG.MAX_HEIGHT,
    maxWidth = IMAGE_THUMBNAIL_CONFIG.MAX_WIDTH,
    quality = IMAGE_THUMBNAIL_CONFIG.DEFAULT_QUALITY,
  } = config || {};

  try {
    // 获取原始图片信息
    const imageResult = await getImageInfo(undefined, filePath);
    if (imageResult.code !== ErrorCode.SUCCESS || !imageResult.data) {
      return imageResult as unknown as IAsyncRes<IKitImageInfo>;
    }
    const { width, height } = imageResult.data;

    const { width: compressedWidth, height: compressedHeight } = calculateImageSize(width, height, maxWidth, maxHeight);

    // 压缩图片
    const compressResult = await getThumbnailWithPath(filePath, {
      compressedWidth,
      compressedHeight,
      quality,
    });

    // 如果压缩失败
    if (compressResult.code !== ErrorCode.SUCCESS || !compressResult.data) {
      return compressResult as IAsyncRes<IKitImageInfo>;
    }

    const { tempFilePath: compressedFilePath } = compressResult.data;

    // 读取压缩后的图片数据
    if (isWeixin()) {
      return readImageBase64Weixin(compressedFilePath);
    }

    const fileInfoResult = await getFileInfo(compressedFilePath);
    if (fileInfoResult.code !== ErrorCode.SUCCESS || !fileInfoResult.data) {
      return fileInfoResult as unknown as IAsyncRes<IKitImageInfo>;
    }

    return readImageBase64Native(fileInfoResult.data.file);
  } catch (error) {
    return {
      code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
      msg: '处理图片失败',
    };
  }
};

/**
 * 根据图片文件生成带有缩略图的图片信息
 * @param file 图片文件
 * @param config 缩略图配置选项
 * @returns 包含缩略图数据的Promise
 */
const getImageThumbnailWithFile = (file: File, config?: IKitThumbnailConfig) : Promise<IAsyncRes<IKitImageInfo>> => {
  if (!file) {
    return Promise.resolve({
      code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
      msg: 'Invalid image file type',
    });
  }
  let {
    maxHeight = IMAGE_THUMBNAIL_CONFIG.MAX_HEIGHT,
    maxWidth = IMAGE_THUMBNAIL_CONFIG.MAX_WIDTH,
    quality = IMAGE_THUMBNAIL_CONFIG.DEFAULT_QUALITY,
    scale = IMAGE_THUMBNAIL_CONFIG.DEFAULT_SCALE,
  } = config || {};

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  if (!context) {
    return Promise.resolve({
      code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
      msg: 'Canvas context is not available',
    });
  }

  const img = new Image();
  return new Promise((resolve: ResolveFunc) => {
    img.onload = (evt) => {
      const pos = calcPosition(img.width, img.height, {
        maxHeight,
        maxWidth,
        scale,
      });
      canvas.width = Math.min(pos.w, maxWidth);
      canvas.height = Math.min(pos.h, maxHeight);
      context.drawImage(img, pos.x, pos.y, pos.w, pos.h);

      let base64 = getThumbailBase64(canvas, quality);
      const reg = /data:image\/[^;]+;base64,/;
      base64 = base64.replace(reg, '');
      resolve({
        code: ErrorCode.SUCCESS,
        data: {
          thumbnail: base64,
          width: pos.w,
          height: pos.h,
        },
      });
    };
    img.onerror = (evt) => {
      resolve({
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: `get image info fail:${JSON.stringify(evt)}`,
      });
    };
    img.src = (window.URL || window.webkitURL).createObjectURL(file);
  });
};

// 递归获取缩略图，每次调用降低图片质量，直到尺寸符合 content 大小要求
const getThumbailBase64 = (canvas: HTMLCanvasElement, quality: number): string => {
  let base64 = canvas.toDataURL('image/jpeg', quality);
  // 留 1k 的空间用于存放 content 中的其他信息
  return base64.length > MAX_MESSAGE_CONTENT_BYTES - 10 * 1024 ? getThumbailBase64(canvas, quality - 0.1) : base64;
};

// 计算图片位置
const calcPosition = (width: number, height: number, opts: {
  maxHeight: number,
  maxWidth: number,
  scale: number,
}) => {
  const {
    maxHeight = IMAGE_THUMBNAIL_CONFIG.MAX_HEIGHT,
    maxWidth = IMAGE_THUMBNAIL_CONFIG.MAX_WIDTH,
    scale = IMAGE_THUMBNAIL_CONFIG.DEFAULT_SCALE,
  } = opts;
  const isheight = width < height; // 100 * 60
  const _scale = isheight ? height / width : width / height; // 1.6
  let zoom; let x = 0;
  let y = 0;
  let w; let h;

  const gtScale = () => {
    if (isheight) {
      zoom = width / 160;
      w = 160;
      h = height / zoom;
      if (h > maxHeight) {
        y = (h - maxHeight) / 2;
      }
    } else {
      zoom = height / 160; // 0.6
      h = 160;
      w = width / zoom; // 166.6
      if (w > maxWidth) {
        x = (w - maxWidth) / 2; // 3.3
      }
    }
    return {
      w,
      h,
      x: -x,
      y: -y,
    };
  };

  const ltScale = () => {
    if (isheight) {
      zoom = height / maxHeight;
      h = maxHeight;
      w = width / zoom;
    } else {
      zoom = width / maxWidth;
      w = maxWidth;
      h = height / zoom;
    }
    return {
      w,
      h,
      x: -x,
      y: -y,
    };
  };
  return _scale > scale ? gtScale() : ltScale();
};

/**
 * 获取图片的尺寸信息
 * @param file 图片文件
 * @returns Promise<{width: number, height: number}> 图片尺寸
 */
const getImageDimensionsWithFile = async (file: File): Promise<{ width: number; height: number }> => new Promise((resolve, reject) => {
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  img.onload = () => {
    resolve({
      width: img.width,
      height: img.height,
    });
    URL.revokeObjectURL(objectUrl);
  };

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('获取图片尺寸失败'));
  };

  img.src = objectUrl;
});

const generateVideoThumbnailWithFile = (videoFile: File, options?: IKitThumbnailConfig): Promise<IAsyncRes<IKitImageInfo>> => {
  // 检查文件
  if (!videoFile) {
    return Promise.resolve({
      code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
      msg: 'Invalid video file type',
    });
  }

  const {
    maxHeight = IMAGE_THUMBNAIL_CONFIG.MAX_HEIGHT,
    maxWidth = IMAGE_THUMBNAIL_CONFIG.MAX_WIDTH,
    quality = IMAGE_THUMBNAIL_CONFIG.DEFAULT_QUALITY,
  } = options || {};

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve({
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg: 'Canvas context is not available',
      });
      return;
    }

    // 清理资源
    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(video.src);
    };

    const handleError = (msg: string) => {
      cleanup();
      resolve({
        code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
        msg,
      });
    };

    // 设置视频属性
    Object.assign(video, {
      autoplay: false,
      muted: true,
      preload: 'metadata',
    });

    // 添加视频加载超时处理
    const TIMEOUT_DURATION = 10000; // 10秒
    const timeoutId = setTimeout(() => {
      handleError('Video load timeout');
    }, TIMEOUT_DURATION);

    // 等待视频元数据加载完成
    video.onloadedmetadata = () => {
      // 检查视频尺寸是否有效
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        handleError('Invalid video dimensions');
        return;
      }

      // 设置时间点为 0.1 秒，避免完全黑屏的第一帧
      video.currentTime = 0.1;
    };

    video.onerror = () => handleError('Failed to load video');

    video.onseeked = () => {
      try {
        // 计算缩放后的尺寸
        const { width: scaledWidth, height: scaledHeight } = calculateImageSize(
          video.videoWidth,
          video.videoHeight,
          maxWidth,
          maxHeight,
        );

        // 设置画布尺寸
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;

        // 直接绘制并缩放视频帧到最终画布
        ctx.drawImage(
          video,
          0,
          0,
          video.videoWidth,
          video.videoHeight,
          0,
          0,
          scaledWidth,
          scaledHeight,
        );

        // 生成缩略图
        const base64 = getThumbailBase64(canvas, quality);
        const reg = /data:image\/[^;]+;base64,/;
        const thumbnail = base64.replace(reg, '');

        cleanup();
        resolve({
          code: ErrorCode.SUCCESS,
          data: {
            thumbnail,
            width: scaledWidth,
            height: scaledHeight,
          },
        });
      } catch (error) {
        handleError('Failed to generate thumbnail');
      }
    };

    // 设置视频源
    video.src = URL.createObjectURL(videoFile);
  });
};
