import {
  IKitUploadResult, AKitUploadRequest, IKitMediaMessageOptions, IKitUploadInfo,
  IKitUploadRequestData,
} from '@rongcloud/imkit-store';
import {
  BaseMessage, ISendMessageOptions, ErrorCode, IAsyncRes, IAReceivedMessage, FileType,
} from '@rongcloud/imlib-next';
import { readFileArrayBuffer } from './media';
// // #ifdef APP-PLUS
// import { uploadFile, cancelUpload } from '@/uni_modules/RCIM-Kit-Utils';
// // #endif

export interface IMediaMessageOptions {
  conversationKey: string;
  message: BaseMessage;
  sendOptions?: ISendMessageOptions;
  info: IKitUploadInfo;
}

class RCUniUploadRequest extends AKitUploadRequest {
  private _uniUploadTask: UniApp.RequestTask | UniApp.UploadTask | null = null;

  private _uploadTaskId: string | null = null;

  execute(requestData: IKitUploadRequestData): Promise<IAsyncRes<IKitUploadResult>> {
    if (!requestData) {
      return Promise.reject(new Error('请求数据不能为空'));
    }

    return new Promise((resolve) => {
      try {
        if (requestData.method === 'POST') {
          const requestOptions = {
            url: requestData.url,
            filePath: this.uploadInfo.path,
            file: this.uploadInfo.file,
            name: 'file',
            header: requestData.headers,
            formData: requestData.body,
            success: this.handleUploadSuccess(resolve),
            fail: this.handleUploadFail(resolve),
          };
          this._uniUploadTask = uni.uploadFile(requestOptions) as UniApp.UploadTask;
        } else {
          // // #ifdef APP-PLUS
          // const requestOptionsApp = {
          //   url: requestData.url,
          //   data: requestData.body,
          //   header: requestData.headers,
          //   method: requestData.method,
          //   filePath: requestData.filePath,
          // };
          // this._uploadTaskId = uploadFile(requestOptionsApp, (res: any) => {
          //   const { statusCode, data } = res;
          //   resolve({ code: statusCode, data });
          // }, (err: any) => {
          //   resolve({ code: ErrorCode.UPLOAD_FAIL, msg: err });
          // });
          // // #endif
          // #ifndef APP-PLUS
          const requestOptions = {
            url: requestData.url,
            data: requestData.body,
            header: requestData.headers,
            method: requestData.method,
            success: this.handleUploadSuccess(resolve),
            fail: this.handleUploadFail(resolve),
          };
          this._uniUploadTask = uni.request(requestOptions) as UniApp.RequestTask;
          // #endif
        }
      } catch (e) {
        console.log('upload request catch', e);
        resolve({ code: ErrorCode.UPLOAD_FAIL, msg: `${e}` });
      }
    });
  }

  abort(): void {
    // // #ifdef APP-PLUS
    // if (this._uploadTaskId) {
    //   cancelUpload(this._uploadTaskId);
    // }
    // // #endif
    // #ifndef APP-PLUS
    this._uniUploadTask?.abort();
    // #endif
    super.abort();
  }

  private handleUploadSuccess(resolve: (value: IAsyncRes<any>) => void) {
    return (res: UniApp.RequestSuccessCallbackResult | UniApp.UploadFileSuccessCallbackResult) => {
      const { statusCode, data } = res;
      resolve({ code: statusCode, data });
    };
  }

  private handleUploadFail(resolve: (value: IAsyncRes<IKitUploadResult>) => void) {
    return (err: UniApp.GeneralCallbackResult) => {
      resolve({ code: ErrorCode.UPLOAD_FAIL, msg: err.errMsg });
    };
  }
}

/**
 * 发送媒体消息失败缓存
 */
const sendMediaMessageFailedOptionsCache = new Map<number, IKitMediaMessageOptions>();

export const sendMediaMessage = async (mediaMessageOptions: IMediaMessageOptions): Promise<IAsyncRes<IAReceivedMessage>> => {
  const { info } = mediaMessageOptions;

  let enhancedInfo = { ...info };
  let file = info.file ?? info.path;
  if (!file) {
    return {
      code: ErrorCode.INVALID_PARAMETER_MEDIA_URL,
      msg: '文件或路径不能为空',
    };
  }

  const request = new RCUniUploadRequest(enhancedInfo);
  const storeMediaMessageOptions: IKitMediaMessageOptions = {
    request,
    ...mediaMessageOptions,
    info: enhancedInfo,
  };

  const res = await uni.$RongKitStore.messageStore?.sendMediaMessage(storeMediaMessageOptions);
  if (res?.code !== ErrorCode.SUCCESS && res?.data && res.data.messageId) {
    sendMediaMessageFailedOptionsCache.set(res.data.messageId, storeMediaMessageOptions);
    console.error('发送媒体消息失败', res);
  }
  return res;
};

/**
 * 重发媒体消息
 */
export const resendMediaMessage = async (messageId: number) => {
  const options = sendMediaMessageFailedOptionsCache.get(messageId);
  if (!options) {
    uni.showToast({
      title: '消息不存在',
      icon: 'none',
    });
    return;
  }
  options.sendOptions = {
    ...(options.sendOptions || {}),
    messageId,
  };
  sendMediaMessageFailedOptionsCache.delete(messageId);
  try {
    const { code } = await sendMediaMessage(options);
    if (code !== ErrorCode.SUCCESS) {
      uni.showToast({
        title: `重发失败: ${code}`,
        icon: 'success',
      });
    }
  } catch (error) {
    uni.showToast({
      title: `重发失败:${error}`,
      icon: 'none',
    });
  }
};
