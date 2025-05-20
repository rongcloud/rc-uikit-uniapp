import { addEventListener, Events, IMessagesEvent } from '@rongcloud/imlib-next';
import { generateDefaultAvatar, parseMessage2Text } from './index';
import { trans2ConversationKey } from '@rongcloud/imkit-store';

/**
 * 本地通知配置
 */
export interface NotificationConfig {
  /**
   * 通知消息为当前会话页面时，是否禁用通知
   */
  disableInCurrentChat?: boolean;

  /**
   * 当前页面为会话列表页面时，是否禁用通知
   */
  disableInConversationList?: boolean;
}

// 通知管理类
export class NotificationManager {
  private static instance: NotificationManager;

  private notifications = new Map();

  private config: NotificationConfig = {};

  private constructor(config: NotificationConfig = {}) {
    if (!NotificationManager.instance) {
      this.config = config;
      addEventListener(Events.MESSAGES, this.#onMessage, this);
    }
  }

  /**
   * 获取通知管理类实例
   * @param config 通知配置
   * @returns 通知管理类实例
   */
  public static getInstance(config?: NotificationConfig): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager(config);
    }
    return NotificationManager.instance;
  }

  #onMessage(messages: IMessagesEvent) {
    const showNotificationList = messages.messages.filter((message) => message.isPersited && !message.isOffLineMessage);
    try {
      showNotificationList.forEach(async (message) => {
        // 检查是否在聊天页面或会话列表页面
        const isInConversationList = uni.$RongKitStore.conversationStore.openedConversation !== null;
        const key = trans2ConversationKey({
          conversationType: message.conversationType,
          targetId: message.targetId,
          channelId: message.channelId,
        });
        const isCurrentChat = uni.$RongKitStore.conversationStore.openedConversation?.key === key;

        // 根据配置决定是否显示通知
        if ((!!this.config.disableInCurrentChat && isCurrentChat)
            || (!!this.config.disableInConversationList && isInConversationList)) {
          return;
        }

        const content = parseMessage2Text(message.messageType, message.content.content);
        const profile = await uni.$RongKitStore.appData.getProfileSync(message.targetId, message.conversationType);
        await this.createNotification(message.messageUId, {
          title: profile?.name || message.targetId,
          content,
        });
      });
    } catch (error) {
      console.error('发送通知失败:', error);
    }
  }

  /**
   * 创建本地通知
   * @param id 通知ID
   * @param options 通知配置
   */
  public async createNotification(id: string, options: UniApp.CreatePushMessageOptions): Promise<void> {
    try {
      // #ifdef APP-PLUS
      const notification = await uni.createPushMessage({
        title: options.title,
        content: options.content,
        // icon: options.icon,
      });
      this.notifications.set(id, notification);
      // #endif
    } catch (error) {
      console.error('创建通知失败:', error);
      throw error;
    }
  }
}
