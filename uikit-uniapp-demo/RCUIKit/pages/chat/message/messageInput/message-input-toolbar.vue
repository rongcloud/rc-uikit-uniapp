<template>
  <view class="rc-input-toolbar">
    <swiper class="toolbar-swiper" :indicator-dots="false" :vertical="false">
      <swiper-item>
        <view class="toolbar-page">
          <toolbar-item v-for="item in pageItems" :key="item.type" :icon="item.icon" :text="item.text"
            @click="handleItemClick(item)" />
        </view>
      </swiper-item>
    </swiper>
  </view>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import ToolbarItem from './message-input-toolbar-item.vue';
  import {
 isApp, isH5, isWeixin, isAndroidApp, generateImageThumbnail, generateVideoThumbnail,
 getFileName, getImageInfo, uniRuntimeVersion, versionCompare,
} from '@/RCUIKit/utils';
  import { requestAndroidPermission, gotoAppPermissionSetting } from '@/RCUIKit/external/permission';
  import { IMediaMessageOptions, sendMediaMessage } from '@/RCUIKit/utils/upload';
  import { events } from '@/RCUIKit/constant/events';
  import {
 ErrorCode, FileType, GIFMessage, ImageMessage, SightMessage,
} from '@rongcloud/imlib-next';
  import { trans2ConversationKey } from '@rongcloud/imkit-store';
  import { VIDEO_MAX_DURATION } from '@/RCUIKit/constant/media';

  interface Item {
    icon : string;
    text : string;
    type : 'image' | 'camera' | 'video' | 'videoRecord';
  }

  interface MediaOptions {
    mediaType : Array<'image' | 'video'>;
    sourceType : Array<'album' | 'camera'>;
  }

  interface ChooseResult {
    path ?: string;
    file ?: File;
    type : 'image' | 'video';
    name ?: string; // 仅 h5 image、video 有 name
    videoThumbnailPath ?: string; // 视频缩略图
    duration ?: number; // 视频时长
    size : number; // 文件大小
    source ?: string; // 文件来源
  }

  const getToolbarItems = (): Item[] => {
    const baseItems: Item[] = [
      { icon: 'Photo', text: '照片', type: 'image' as const },
      { icon: 'Video', text: '视频', type: 'video' as const },
    ];
    if (!isH5()) {
      baseItems.push({ icon: 'Camera', text: '拍照', type: 'camera' as const });
      baseItems.push({ icon: 'VideoRecord', text: '拍摄', type: 'videoRecord' as const });
    }
    return baseItems;
  };

  const items = ref<Item[]>(getToolbarItems());

  // 每页显示的工具数量
  const PAGE_SIZE = 8;

  const PICKER_MAX_COUNT = 9;

  // 计算当前页显示的工具
  const pageItems = computed(() => items.value.slice(0, PAGE_SIZE));

  const handleItemClick = (item : Item) => {
    switch (item.type) {
      case 'image':
        openImagePicker();
        break;
      case 'camera':
        openCamera();
        break;
      case 'video':
        openVideoPicker();
        break;
      case 'videoRecord':
        openVideoRecord();
        break;
    }
  };

  const openImagePicker = () => {
    let mediaType : Array<'image' | 'video'> = ['image'];
    if (isWeixin()) {
      mediaType.push('video');
    }
    chooseMedia({
      mediaType,
      sourceType: ['album'],
    });
  };

  const openCamera = () => {
    chooseMedia({
      mediaType: ['image'],
      sourceType: ['camera'],
    });
  };

  const openVideoPicker = () => {
    chooseMedia({
      mediaType: ['video'],
      sourceType: ['album'],
    });
  };

  const openVideoRecord = () => {
    chooseMedia({
      mediaType: ['video'],
      sourceType: ['camera'],
    });
  };

  const chooseMedia = async (options : MediaOptions) => {
    const { mediaType, sourceType } = options;
    // 微信图片和视频选择、app 视频选取、app 图片和视频拍摄使用 uni.chooseMedia 接口
    // app 图片选取使用 uni.chooseImage 接口
    // h5 视频选取使用 uni.chooseVideo 接口
    if (isWeixin() || (isApp() && mediaType.length === 1 && mediaType[0] === 'video') || sourceType.includes('camera')) {
      if (isApp() && versionCompare(uniRuntimeVersion(), '4.52') === -1) {
        uni.showModal({
          title: '提示',
          content: '此功能需要使用 4.52 及以上的 HBuilderX 版本。',
          showCancel: false,
        });
        return;
      }
      uni.chooseMedia({
        count: PICKER_MAX_COUNT,
        mediaType,
        sourceType,
        maxDuration: VIDEO_MAX_DURATION,
        success: (res) => {
          const { tempFiles } = res;
          const results : ChooseResult[] = tempFiles.map((file) => ({
            path: file.tempFilePath,
            type: file.fileType,
            size: file.size,
            duration: file.duration, // video duration
            videoThumbnailPath: file.thumbTempFilePath,
            source: (sourceType.length === 1 && sourceType[0] === 'camera') ? sourceType[0] : undefined,
          }));
          chooseResult(results);
        },
        fail: (err) => {
          console.error('chooseMedia fail', err);
        },
      });
      return;
    }

    if (isAndroidApp()) {
      const deviceInfo:any = uni.getDeviceInfo();
      let permissionName = 'READ_EXTERNAL_STORAGE';
      // osVersion 转为 number 后，判断安卓版本，不同的版本权限名称不一样
      const osVersion = parseInt(deviceInfo.osVersion as string, 10);
      if (osVersion >= 13) {
        permissionName = mediaType[0] === 'image' ? 'READ_MEDIA_IMAGES' : 'READ_MEDIA_VIDEO';
      }
      if (permissionName) {
        const permission = await requestAndroidPermission(`android.permission.${permissionName}`);
        if (permission === -1) {
          uni.showModal({
            title: '提示',
            content: '需要您授权文件或照片权限，才能访问图片和媒体。',
            success: (res) => {
              if (res.confirm) {
                gotoAppPermissionSetting();
              }
            },
          });
          return;
        }
        if (permission === 0) {
          uni.showToast({
            title: '授权失败',
            icon: 'none',
          });
          return;
        }
      }
    }
    // mediaType 不是数组时，直接选择图片或视频
    if (mediaType.length === 1 && mediaType[0] === 'image') {
      uni.chooseImage({
        count: PICKER_MAX_COUNT,
        sourceType: options.sourceType,
        success: (res) => {
          const { tempFiles } = res;
          let results : ChooseResult[] = (Array.isArray(tempFiles) ? tempFiles : [tempFiles])
            .map((file) => ({
              file: isH5() ? file as File : undefined,
              path: !isH5() ? (file as UniNamespace.ChooseImageSuccessCallbackResultFile).path : '',
              type: 'image' as const,
              size: file.size,
            }));
          chooseResult(results);
        },
        fail: (err) => {
          console.log(err);
        },
      });
    } else if (mediaType.length === 1 && mediaType[0] === 'video') {
      uni.chooseVideo({
        sourceType: options.sourceType,
        maxDuration: VIDEO_MAX_DURATION,
        success: (res) => {
          chooseResult([{
            file: res.tempFile as File,
            type: 'video' as const,
            duration: res.duration,
            name: res.name,
            size: res.size,
          }]);
        },
      });
    }
  };

  const chooseResult = async (res: ChooseResult[]): Promise<void> => {
    if (res.length === 0) {
      console.error('没有选择任何文件');
      return;
    }
    // 检查当前会话是否存在
    const { openedConversation } = uni.$RongKitStore.conversationStore;
    if (!openedConversation) {
      console.error('没有打开的会话');
      return;
    }

    // 准备会话信息
    const conversation = {
      conversationType: openedConversation.conversationType,
      targetId: openedConversation.targetId,
      channelId: openedConversation.channelId,
    };
    const conversationKey = trans2ConversationKey(conversation);

    // 创建处理每个文件的任务数组
    const tasks = res.map(async (item) => {
      try {
        // 1. 准备文件信息
        // 仅 h5 image、video 有 name
        let {
 file, path, name, size, type, duration, videoThumbnailPath, source,
} = item;
        // 验证文件是否有效
        if ((!file && isH5()) || (!isH5() && !path)) {
          console.error('文件不存在或无法访问');
          return;
        }

        // 2. 准备上传信息
        const fileType = type === 'image' ? FileType.IMAGE : FileType.VIDEO;
        const info = {
          file,
          path,
          fileSize: size,
          fileType,
          duration,
          onProgress: (progress: number) => {},
          onComplete: (res: any) => {},
        };

        // 3. 根据文件类型生成不同的消息
        let baseMessage;
        if (fileType === FileType.IMAGE) {
          let isGif = false;
          let imageInfoRes : any;
          if ((source && source !== 'camera') || !source) {
            imageInfoRes = await getImageInfo(file, path);
            if (imageInfoRes.code !== ErrorCode.SUCCESS || !imageInfoRes.data) {
              uni.showToast({
                title: '获取图片信息失败',
                icon: 'none',
              });
              return; // 获取图片信息失败
            }
            isGif = imageInfoRes.data.type === 'image/gif' || imageInfoRes.data.type === 'gif';
          }
          if (isGif) {
            const { width, height, thumbnail } = imageInfoRes.data;
            const remoteUrl = isH5() ? `data:image/gif;base64,${thumbnail}` : path!;
            baseMessage = new GIFMessage({
              gifDataSize: size,
              remoteUrl,
              width: width!,
              height: height!,
            });
          } else {
            const imageInfo = await generateImageThumbnail(file, path);
            if (imageInfo.code !== ErrorCode.SUCCESS || !imageInfo.data) {
              console.error('生成图片缩略图失败');
              return;
            }
            baseMessage = new ImageMessage({
              content: imageInfo.data.thumbnail!,
              imageUri: '',
            });
          }
        } else {
          // 处理视频
          const videoInfo = await generateVideoThumbnail(file, videoThumbnailPath, {
            maxWidth: 240,
            maxHeight: 240,
          });
          if (videoInfo.code !== ErrorCode.SUCCESS || !videoInfo.data) {
            console.error('生成视频缩略图失败');
            return;
          }
          baseMessage = new SightMessage({
            sightUrl: '',
            content: videoInfo.data.thumbnail!,
            duration: duration ?? 0,
            size,
            name: isH5() ? name! : getFileName(path!),
          });
        }

        // 4. 发送媒体消息
        const mediaMessageOptions: IMediaMessageOptions = {
          message: baseMessage,
          conversationKey,
          info,
        };
        uni.$emit(events.SCROLL_TO_BOTTOM);
        await sendMediaMessage(mediaMessageOptions);
        uni.$emit(events.SCROLL_TO_BOTTOM);
      } catch (error) {
        console.error('处理媒体文件时出错:', error);
      }
    });

    // 可选：等待所有任务完成
    // await Promise.all(tasks);
  };

</script>

<style lang="scss" scoped>
  @use '../../../../styles/_variables.scss' as var;

  .rc-input-toolbar {
    background-color: var.$rc-color-bg-auxiliary-1;

    .toolbar-swiper {
      height: 224px;
    }

    .toolbar-page {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(2, 1fr);
      height: 100%;
    }
  }
</style>
