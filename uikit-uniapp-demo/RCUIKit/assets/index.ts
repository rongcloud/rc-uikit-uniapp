import groupProfile from './icon/group-portrait.svg?raw';
import userProfile from './icon/user-portrait.svg?raw';
import systemProfile from './icon/system-portrait.svg?raw';
import leftIcon from './icon/left.svg?raw';
import draftIcon from './icon/draft.svg?raw';
import notifyIcon from './icon/notify.svg?raw';
import sendingIcon from './icon/sending.svg?raw';
import sendErrorIcon from './icon/send-error.svg?raw';
import closeIcon from './icon/close.svg?raw';
import close2Icon from './icon/close2.svg?raw';
import extraIcon from './icon/extra.svg?raw';
import faceIcon from './icon/face.svg?raw';
import keyboardIcon from './icon/keyboard.svg?raw';
import soundBtnIcon from './icon/sound-btn.svg?raw';
import deleteIcon from './icon/delete.svg?raw';
import topIcon from './icon/top.svg?raw';
import cancelTopTcon from './icon/cancel-top.svg?raw';
import inputToolbarPhotoIcon from './icon/input-toolbar-photo.svg?raw';
import inputToolbarCameraIcon from './icon/input-toolbar-camera.svg?raw';
import inputToolbarVideoIcon from './icon/input-toolbar-video.svg?raw';
import inputToolbarVideoRecordIcon from './icon/input-toolbar-video-record.svg?raw';
import inputToolbarFileIcon from './icon/input-toolbar-file.svg?raw';
import menuTopIcon from './icon/menu-top.svg?raw';
import menuCancelTopIcon from './icon/menu-cancle-top.svg?raw';
import menuDelIcon from './icon/menu-del.svg?raw';
import menuMutedIcon from './icon/menu-muted.svg?raw';
import menuUnmutedIcon from './icon/menu-unmuted.svg?raw';
import emptyIcon from './icon/no-message.svg?raw';
import voiceInIcon from './icon/voice-in.svg?raw';
import voiceOutIcon from './icon/voice-out.svg?raw';
import playIcon from './icon/play.svg?raw';
import recorderIcon from './icon/recorder.svg?raw';
import recorder2Icon from './icon/recorder2.svg?raw';
import fileInIcon from './icon/file-in.svg?raw';
import fileOutIcon from './icon/file-out.svg?raw';
import copyIcon from './icon/copy.svg?raw';
import multeSelectIcon from './icon/multe-select.svg?raw';
import replyIcon from './icon/reply.svg?raw';
import recallIcon from './icon/recall.svg?raw';
import warningIcon from './icon/warning.svg?raw';
import forwardIcon from './icon/forward.svg?raw';
import deleteTextIcon from './icon/delete-text.svg?raw';
import deleteText2Icon from './icon/delete-text2.svg?raw';

import downloadIcon from './icon/download.svg?raw';
import downloadLoadingIcon from './icon/download-loading.svg?raw';
import { encode } from 'base-64';

function createObjectURL(content: string, type: string): string {
  return `data:${type};base64,${encode(content)}`;
}

export const DEFAULT_GROUP_PORTRAIT_SVG = createObjectURL(groupProfile, 'image/svg+xml');
export const DEFAULT_USER_PORTRAIT_SVG = createObjectURL(userProfile, 'image/svg+xml');
export const DEFAULT_SYSTEM_PORTRAIT_SVG = createObjectURL(systemProfile, 'image/svg+xml');

export const left = createObjectURL(leftIcon, 'image/svg+xml');
export const draft = createObjectURL(draftIcon, 'image/svg+xml');
export const notify = createObjectURL(notifyIcon, 'image/svg+xml');
export const sending = createObjectURL(sendingIcon, 'image/svg+xml');
export const sendError = createObjectURL(sendErrorIcon, 'image/svg+xml');
export const close = createObjectURL(closeIcon, 'image/svg+xml');
export const close2 = createObjectURL(close2Icon, 'image/svg+xml');
export const extra = createObjectURL(extraIcon, 'image/svg+xml');
export const face = createObjectURL(faceIcon, 'image/svg+xml');
export const keyboard = createObjectURL(keyboardIcon, 'image/svg+xml');
export const soundBtn = createObjectURL(soundBtnIcon, 'image/svg+xml');
export const del = createObjectURL(deleteIcon, 'image/svg+xml');
export const top = createObjectURL(topIcon, 'image/svg+xml');
export const cancelTop = createObjectURL(cancelTopTcon, 'image/svg+xml');
export const inputToolbarPhoto = createObjectURL(inputToolbarPhotoIcon, 'image/svg+xml');
export const inputToolbarCamera = createObjectURL(inputToolbarCameraIcon, 'image/svg+xml');
export const inputToolbarVideo = createObjectURL(inputToolbarVideoIcon, 'image/svg+xml');
export const inputToolbarVideoRecord = createObjectURL(inputToolbarVideoRecordIcon, 'image/svg+xml');
export const inputToolbarFile = createObjectURL(inputToolbarFileIcon, 'image/svg+xml');
export const menuTop = createObjectURL(menuTopIcon, 'image/svg+xml');
export const menuCancelTop = createObjectURL(menuCancelTopIcon, 'image/svg+xml');
export const menuDel = createObjectURL(menuDelIcon, 'image/svg+xml');
export const menuMuted = createObjectURL(menuMutedIcon, 'image/svg+xml');
export const menuUnmuted = createObjectURL(menuUnmutedIcon, 'image/svg+xml');
export const empty = createObjectURL(emptyIcon, 'image/svg+xml');
export const voiceIn = createObjectURL(voiceInIcon, 'image/svg+xml');
export const voiceOut = createObjectURL(voiceOutIcon, 'image/svg+xml');
export const play = createObjectURL(playIcon, 'image/svg+xml');
export const recorder = createObjectURL(recorderIcon, 'image/svg+xml');
export const recorder2 = createObjectURL(recorder2Icon, 'image/svg+xml');
export const fileIn = createObjectURL(fileInIcon, 'image/svg+xml');
export const fileOut = createObjectURL(fileOutIcon, 'image/svg+xml');
export const copy = createObjectURL(copyIcon, 'image/svg+xml');
export const multeSelect = createObjectURL(multeSelectIcon, 'image/svg+xml');
export const reply = createObjectURL(replyIcon, 'image/svg+xml');
export const recall = createObjectURL(recallIcon, 'image/svg+xml');
export const download = createObjectURL(downloadIcon, 'image/svg+xml');
export const downloadLoading = createObjectURL(downloadLoadingIcon, 'image/svg+xml');
export const warning = createObjectURL(warningIcon, 'image/svg+xml');
export const forward = createObjectURL(forwardIcon, 'image/svg+xml');
export const deleteText = createObjectURL(deleteTextIcon, 'image/svg+xml');
export const deleteText2 = createObjectURL(deleteText2Icon, 'image/svg+xml');
export const iconType = {
  left,
  draft,
  notify,
  sending,
  sendError,
  close,
  close2,
  extra,
  face,
  keyboard,
  soundBtn,
  del,
  top,
  cancelTop,
  inputToolbarPhoto,
  inputToolbarCamera,
  inputToolbarFile,
  inputToolbarVideo,
  inputToolbarVideoRecord,
  menuTop,
  menuCancelTop,
  menuDel,
  menuMuted,
  menuUnmuted,
  empty,
  voiceIn,
  voiceOut,
  play,
  recorder,
  recorder2,
  fileIn,
  fileOut,
  copy,
  multeSelect,
  reply,
  recall,
  download,
  downloadLoading,
  warning,
  forward,
  deleteText,
  deleteText2,
};

export type IconType = keyof typeof iconType;
