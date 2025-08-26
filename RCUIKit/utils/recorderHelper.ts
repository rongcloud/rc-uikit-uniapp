/**
 * 录音管理器
 * 代理录音管理器的事件回调，保证全局只有一个回调方法执行
 */
export const recorderManager: UniApp.RecorderManager = uni.getRecorderManager();

let onStartHandler: null | (() => void) = null;
let onStopHandler: null | ((res: any) => void) = null;
let onErrorHandler: null | ((res: any) => void) = null;

export const setOnStartHandler = (handler: () => void) => {
  onStartHandler = handler;
};
export const setOnStopHandler = (handler: (res: any) => void) => {
  onStopHandler = handler;
};
export const setOnErrorHandler = (handler: (res: any) => void) => {
  onErrorHandler = handler;
};

export const offStartHandler = () => {
  onStartHandler = null;
};
export const offStopHandler = () => {
  onStopHandler = null;
};
export const offErrorHandler = () => {
  onErrorHandler = null;
};

recorderManager.onStart(() => {
  if (onStartHandler) {
    onStartHandler();
  }
});
recorderManager.onStop((res: any) => {
  if (onStopHandler) {
    onStopHandler(res);
  }
});
recorderManager.onError((res) => {
  if (onErrorHandler) {
    onErrorHandler(res);
  }
});
