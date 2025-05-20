/**
 * 安卓权限检查工具
 * 通过Native.js检查应用是否拥有特定权限
 */
import { logger } from './logger';
import { LogTag } from '@/RCUIKit/enum/logTag';

// 声明plus变量，uni-app环境中已定义
declare const plus: any;
declare const uni: any;

// 日志标签
const LOG_TAG = LogTag.K_PERMISSION_S;

/**
 * 检查安卓设备是否拥有指定的权限
 * @param permissionName 权限名称，例如："android.permission.CAMERA"
 * @returns Promise<boolean> 是否拥有权限
 */
export function checkAndroidPermission(permissionName: string): Promise<boolean> {
  // 返回Promise对象，以支持异步调用
  return new Promise((resolve) => {
    if (plus) {
      checkPermissionInner(permissionName, resolve);
    } else {
      // H5+事件处理
      document.addEventListener('plusready', () => {
        checkPermissionInner(permissionName, resolve);
      }, false);
    }
  });
}

/**
 * 内部权限检查实现
 */
function checkPermissionInner(permissionName: string, resolve: (value: boolean) => void): void {
  // 只在安卓平台执行权限检查
  if (plus.os.name === 'Android') {
    try {
      // 获取主Activity对象
      const main = plus.android.runtimeMainActivity();

      // 导入ContextCompat类，用于检查权限
      const ContextCompat = plus.android.importClass('androidx.core.content.ContextCompat');

      // 导入PackageManager类，用于获取权限常量
      const PackageManager = plus.android.importClass('android.content.pm.PackageManager');

      // 检查权限
      const permissionCheck = ContextCompat.checkSelfPermission(main, permissionName);

      // 如果权限状态等于PERMISSION_GRANTED，则拥有权限
      const hasPermission = permissionCheck === PackageManager.PERMISSION_GRANTED;

      logger.info(LOG_TAG, `检查权限 ${permissionName}: ${hasPermission ? '已授权' : '未授权'}`);

      resolve(hasPermission);
    } catch (e) {
      logger.error(LOG_TAG, `检查权限出错：${e}`);
      resolve(false);
    }
  } else {
    // 非安卓平台默认返回true
    logger.info(LOG_TAG, '非Android平台，默认返回true');
    resolve(true);
  }
}

/**
 * 请求安卓设备授予权限
 * @param permissionName 权限名称，例如："android.permission.CAMERA"
 * @returns Promise<boolean | number> 权限状态：true成功，false失败，-1需要去设置页授权，0用户拒绝
 */
export function requestAndroidPermission(permissionName: string): Promise<boolean | number> {
  return new Promise((resolve) => {
    if (plus) {
      requestPermissionInner(permissionName, resolve);
    } else {
      // H5+事件处理
      document.addEventListener('plusready', () => {
        requestPermissionInner(permissionName, resolve);
      }, false);
    }
  });
}

/**
 * 内部请求权限实现
 */
function requestPermissionInner(permissionName: string, resolve: (value: boolean | number) => void): void {
  // 只在安卓平台执行
  if (plus.os.name === 'Android') {
    try {
      const main = plus.android.runtimeMainActivity();

      // 检查当前权限状态
      const ContextCompat = plus.android.importClass('androidx.core.content.ContextCompat');
      const PackageManager = plus.android.importClass('android.content.pm.PackageManager');
      const currentPermission = ContextCompat.checkSelfPermission(main, permissionName);

      logger.info(LOG_TAG, `当前权限状态: ${currentPermission === PackageManager.PERMISSION_GRANTED ? '已授权' : '未授权'}`);

      if (currentPermission === PackageManager.PERMISSION_GRANTED) {
        logger.info(LOG_TAG, '已有权限，无需请求');
        resolve(true);
        return;
      }

      // 导入版本检查
      const Build = plus.android.importClass('android.os.Build');
      logger.info(LOG_TAG, `当前Android版本: ${Build.VERSION.SDK_INT}`);

      // Android 6.0以下不需要动态请求权限
      if (Build.VERSION.SDK_INT < 23) {
        logger.info(LOG_TAG, 'Android 6.0以下自动拥有权限');
        resolve(true);
        return;
      }

      // 创建权限请求监听器
      let permissionListener: any = null;
      let isComplete = false;

      try {
        logger.info(LOG_TAG, '创建权限请求监听器');

        permissionListener = uni.createRequestPermissionListener();

        // 监听权限请求完成
        permissionListener.onComplete((e: unknown) => {
          if (isComplete) return; // 避免多次回调
          isComplete = true;

          logger.info(LOG_TAG, '权限请求完成');

          // 再次检查权限状态
          try {
            const newStatus = ContextCompat.checkSelfPermission(main, permissionName);
            const granted = newStatus === PackageManager.PERMISSION_GRANTED;

            logger.info(LOG_TAG, `最终权限状态: ${granted ? '已授权' : '未授权'}`);

            // 如果仍未授权，检查是否为"不再询问"状态
            if (!granted) {
              const shouldShow = ActivityCompat.shouldShowRequestPermissionRationale(main, permissionName);

              if (!shouldShow) {
                logger.info(LOG_TAG, '用户选择了"不再询问"，建议打开设置页');

                // 停止监听器
                if (permissionListener) {
                  permissionListener.stop();
                  permissionListener = null;
                }

                resolve(-1); // 特殊值-1表示需要去设置页
                return;
              }
            }

            // 停止监听器
            if (permissionListener) {
              permissionListener.stop();
              permissionListener = null;
            }

            resolve(granted);
          } catch (checkErr) {
            logger.error(LOG_TAG, `检查权限出错: ${checkErr}`);

            // 停止监听器
            if (permissionListener) {
              permissionListener.stop();
              permissionListener = null;
            }

            resolve(false);
          }
        });
      } catch (listenerErr) {
        logger.error(LOG_TAG, `创建权限监听器失败: ${listenerErr}`);
        permissionListener = null;
        // 如果创建监听器失败，继续尝试请求权限
      }

      // 导入ActivityCompat类，用于请求权限
      const ActivityCompat = plus.android.importClass('androidx.core.app.ActivityCompat');

      // 检查是否需要显示权限请求理由
      const shouldShowRequestPermissionRationale = ActivityCompat.shouldShowRequestPermissionRationale(main, permissionName);
      logger.info(LOG_TAG, `是否应该显示权限请求理由: ${shouldShowRequestPermissionRationale}`);

      // 如果返回false，可能原因：1.用户首次请求 2.用户选择了"不再询问" 3.系统不支持该权限
      if (!shouldShowRequestPermissionRationale) {
        logger.info(LOG_TAG, '可能原因: 1.首次请求该权限 2.用户选择了"不再询问" 3.系统不支持该权限');
      }

      // 请求权限
      try {
        logger.info(LOG_TAG, '开始请求权限...');

        // 使用ActivityCompat请求权限
        ActivityCompat.requestPermissions(main, [permissionName], 101);
        logger.info(LOG_TAG, '权限请求已发送，等待回调...');

        // 注意：不再需要超时处理，完全依赖uni.createRequestPermissionListener的回调
        // 如果监听器无效，则这里会卡住，由外部处理超时情况
      } catch (requestErr) {
        logger.error(LOG_TAG, `请求权限出错: ${requestErr}`);

        // 停止监听器
        if (permissionListener) {
          permissionListener.stop();
          permissionListener = null;
        }

        resolve(false);
      }
    } catch (e) {
      logger.error(LOG_TAG, `整体权限请求过程出错: ${e}`);
      resolve(false);
    }
  } else {
    logger.info(LOG_TAG, '非Android平台，默认返回true');
    resolve(true);
  }
}

/**
 * 打开安卓应用设置页面，引导用户手动开启权限
 * 当自动请求权限失败时，可以调用此方法引导用户手动授权
 * @returns Promise<void>
 */
export function openAndroidAppSettings(): Promise<void> {
  return new Promise((resolve) => {
    if (plus && plus.os.name === 'Android') {
      try {
        const main = plus.android.runtimeMainActivity();
        const Intent = plus.android.importClass('android.content.Intent');
        const Settings = plus.android.importClass('android.provider.Settings');
        const Uri = plus.android.importClass('android.net.Uri');

        // 创建Intent打开应用设置页面
        const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        const uri = Uri.fromParts('package', main.getPackageName(), null);
        intent.setData(uri);

        main.startActivity(intent);
        logger.info(LOG_TAG, '已打开应用设置页面');

        resolve();
      } catch (e) {
        logger.error(LOG_TAG, `打开设置页面失败: ${e}`);
        resolve();
      }
    } else {
      logger.info(LOG_TAG, '非Android平台，不支持打开设置');
      resolve();
    }
  });
}

/**
 * 高级安卓权限请求，如果普通请求失败，会尝试打开设置页面
 * @param permissionName 权限名称
 * @param showSettingsDialog 如果权限被拒绝，是否显示对话框引导用户去设置页面手动开启
 * @param customMessage 自定义提示信息，不传则根据权限类型自动生成
 * @returns Promise<boolean> 是否有权限
 */
export function requestAndroidPermissionAdvanced(
  permissionName: string,
  showSettingsDialog = true,
  customMessage?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    // 创建内部异步处理函数
    const executeRequest = async () => {
      try {
        // 首先检查权限
        const hasPermission = await checkAndroidPermission(permissionName);
        if (hasPermission) {
          resolve(true);
          return;
        }

        // 尝试请求权限
        const granted = await requestAndroidPermission(permissionName);
        if (granted === true) {
          resolve(true);
          return;
        }

        // 如果用户选择了"不再询问"（返回-1），或者其他拒绝情况下且showSettingsDialog为true
        if (granted === -1 || (showSettingsDialog && granted === false)) {
          // 根据权限类型生成友好的提示信息
          const message = customMessage || getPermissionMessage(permissionName);

          // 显示确认框
          uni.showModal({
            title: '权限请求',
            content: message,
            confirmText: '去设置',
            cancelText: '取消',
            success: (res: any) => {
              if (res.confirm) {
                // 打开应用设置页面
                openAndroidAppSettings();
                // 返回false，应用程序需要自行处理用户从设置页面返回后的权限检查
                resolve(false);
              } else {
                resolve(false);
              }
            },
          });
        } else {
          resolve(false);
        }
      } catch (error) {
        logger.error(LOG_TAG, `高级权限请求失败: ${error}`);
        resolve(false);
      }
    };

    // 执行异步请求
    executeRequest();
  });
}

/**
 * 根据权限名称获取友好的提示信息
 * @param permissionName 权限名称
 * @returns 友好的提示信息
 */
function getPermissionMessage(permissionName: string): string {
  // 权限名称与提示信息的映射
  const permissionMessages: Record<string, string> = {
    [AndroidPermissions.CAMERA]: '需要相机权限，请在设置中开启',
    [AndroidPermissions.READ_EXTERNAL_STORAGE]: '需要存储读取权限，请在设置中开启',
    [AndroidPermissions.WRITE_EXTERNAL_STORAGE]: '需要存储写入权限，请在设置中开启',
    [AndroidPermissions.RECORD_AUDIO]: '需要麦克风权限，请在设置中开启',
    [AndroidPermissions.READ_MEDIA_IMAGES]: '需要图片读取权限，请在设置中开启',
    [AndroidPermissions.READ_MEDIA_VIDEO]: '需要视频读取权限，请在设置中开启',
  };

  // 根据权限名返回对应的提示信息，如果没有对应的提示则返回通用提示
  return permissionMessages[permissionName]
    || `需要${permissionName.split('.').pop()}权限，请在设置中开启`;
}

// 安卓权限常量
export const AndroidPermissions = {
  CAMERA: 'android.permission.CAMERA',
  READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
  WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
  RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
  READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
  READ_MEDIA_VIDEO: 'android.permission.READ_MEDIA_VIDEO',
};
