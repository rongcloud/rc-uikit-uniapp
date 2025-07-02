import { ref } from '../../../../adapter-vue';

/**
 * 音频管理器类
 * 用于管理音频消息的播放，确保同一时间只有一个音频在播放
 */
export class AudioManager {
  private static instance: AudioManager;

  /**
   * 当前音频上下文，控制音频的播放、暂停、停止等操作
   */
  private currentAudioContext: any = null;

  /**
   * 当前正在播放的音频消息ID
   */
  private currentMessageId: string = '';

  /**
   * 音频播放状态
   */
  private isPlaying = ref(false);

  private constructor() {}

  /**
   * 获取 AudioManager 单例实例
   */
  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * 获取当前音频播放状态
   */
  public getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * 播放音频
   */
  public async playAudio(messageId: string, audioUrl: string) {
    // 如果正在播放的是当前音频，则停止播放
    if (this.currentMessageId === messageId && this.isPlaying.value) {
      await this.stopAudio();
      return;
    }

    // 如果有其他音频正在播放，先停止它
    if (this.currentAudioContext && this.isPlaying.value) {
      await this.stopAudio();
    }

    this.isPlaying.value = true;
    this.currentMessageId = messageId;
    // 创建新的音频上下文
    this.currentAudioContext = uni.createInnerAudioContext();

    // 设置音频源
    this.currentAudioContext.src = audioUrl;

    // 监听播放结束
    this.currentAudioContext.onEnded(() => {
      this.resetAudioContext();
    });

    // 监听播放错误
    this.currentAudioContext.onError((res: any) => {
      console.error('Audio playback error:', res);
      this.resetAudioContext();
    });

    // 监听暂停
    this.currentAudioContext.onPause((res: any) => {
      this.resetAudioContext();
    });

    // 监听停止
    this.currentAudioContext.onStop((res: any) => {
      this.resetAudioContext();
    });

    try {
      if (this.currentAudioContext) {
        // 开始播放
        this.currentAudioContext.play();
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }

  /**
   * 重置音频上下文
   */
  private resetAudioContext() {
    this.isPlaying.value = false;
    this.currentMessageId = '';
    // #ifndef H5
    this.currentAudioContext.destroy();
    // #endif
    this.currentAudioContext = null;
  }

  /**
   * 停止当前音频播放
   */
  public stopAudio() {
    if (this.currentAudioContext && this.isPlaying.value) {
      try {
        // #ifndef MP-WEIXIN
        this.currentAudioContext.stop();
        // #endif
        this.resetAudioContext();
      } catch (error) {
        console.error('Failed to stop audio:', error);
      }
    }
  }

  /**
   * 判断指定消息ID是否是当前正在播放的音频
   */
  public isCurrentAudio(messageId: string): boolean {
    return this.currentMessageId === messageId;
  }
}
