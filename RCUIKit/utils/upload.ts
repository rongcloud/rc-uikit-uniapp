import {
  IKitUploadResult, AKitUploadRequest, IKitMediaMessageOptions, IKitUploadInfo,
} from '@rongcloud/imkit-store';
import {
  BaseMessage, ISendMessageOptions, ErrorCode, IAsyncRes, IAReceivedMessage,
} from '@rongcloud/imlib-next';

export interface IMediaMessageOptions {
  conversationKey: string;
  message: BaseMessage;
  sendOptions?: ISendMessageOptions;
  info: IKitUploadInfo;
}
class RCUniUploadRequest extends AKitUploadRequest {
  private _uniUploadTask: UniApp.UploadTask | null = null;

  execute(): Promise<IAsyncRes<IKitUploadResult>> {
    if (!this._requestData) {
      return Promise.reject(new Error('请求数据不能为空'));
    }

    const formData = this._requestData.body;

    return new Promise((resolve) => {
      this._uniUploadTask = uni.uploadFile({
        url: this._requestData!.url,
        filePath: this.uploadInfo.path,
        file: this.uploadInfo.file,
        name: 'file',
        header: this._requestData!.headers,
        formData,
        success: this.handleUploadSuccess(resolve),
        fail: this.handleUploadFail(resolve),
      });

      this.bindProgressUpdate();
    });
  }

  abort(): void {
    this._uniUploadTask?.abort();
    super.abort();
  }

  private handleUploadSuccess(resolve: (value: IAsyncRes<IKitUploadResult>) => void) {
    return (res: UniApp.UploadFileSuccessCallbackResult) => {
      const { statusCode, data } = res;
      const code = statusCode === 200 ? ErrorCode.SUCCESS : statusCode;
      const dataJson = JSON.parse(data);
      resolve({ code, data: dataJson });
    };
  }

  private handleUploadFail(resolve: (value: IAsyncRes<IKitUploadResult>) => void) {
    return (err: UniApp.GeneralCallbackResult) => {
      resolve({ code: ErrorCode.UPLOAD_FAIL, msg: err.errMsg });
    };
  }

  private bindProgressUpdate(): void {
    this._uniUploadTask?.onProgressUpdate((res) => {
      const { progress } = res;
      this.uploadInfo.onProgress?.(progress);
    });
  }
}
/**
 * 发送媒体消息失败缓存
 */
const sendMediaMessageFailedOptionsCache = new Map<number, IKitMediaMessageOptions>();

export const sendMediaMessage = async (mediaMessageOptions: IMediaMessageOptions): Promise<IAsyncRes<IAReceivedMessage>> => {
  const { info } = mediaMessageOptions;

  const request = new RCUniUploadRequest(info);
  const storeMediaMessageOptions: IKitMediaMessageOptions = {
    request,
    ...mediaMessageOptions,
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
