/// <reference types="vite/client" />
import type { Uni as _Uni } from '@dcloudio/types';
import * as RongIMlib from '@rongcloud/imlib-next';
import { RCKitStore } from '@rongcloud/imkit-store';

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare global {
  interface Uni extends _Uni {
      $RongIMLib: RongIMlib
      $RongKitStore: RCKitStore
  }
}
