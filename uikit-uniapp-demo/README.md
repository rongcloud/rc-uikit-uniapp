# RongCloud IM UIKit UniApp

这是融云 IM UIKit 的 Uniapp 版本，提供了完整的即时通讯 UI 组件库及对应的示例 Demo。

## 目录结构

- `uikit-uniapp-demo/`: UniApp 项目示例
- `RCUIKit/`: UI 组件库

## 运行示例

### 1. 安装依赖

```bash
# 进入项目目录
cd uikit-uniapp-demo

# 安装依赖
npm install
# 或
yarn
# 或
pnpm install
```

### 2. 配置 App.vue

在项目的 `App.vue` 中将 `YOUR_APP_KEY` 替换为 融云 `appkey`，`YOUR_TOKEN` 替换为用户 `token`。

### 3. 运行

在 HBuilderX 中打开此目录，点击运行即可。

## 集成 UIKit 源码

### 1. 创建项目

使用 HBuilderX 创建 uni-app 项目：

1. 打开 HBuilderX
2. 点击菜单栏的"文件" -> "新建" -> "项目"
3. 选择"uni-app"模板
4. 填写项目名称，选择默认模板
5. 点击"创建"完成项目创建

### 2. 安装依赖

```
npm i @rongcloud/engine @rongcloud/imlib-next @rongcloud/imkit-store base-64 mobx
```

### 3. 导入 RCUIKit

将本仓库的 RCUIKit 源码目录复制到项目目录下

### 4. 配置页面路由

在 `pages.json` 中添加以下配置：

```json
{
	"pages": [ //pages数组中第一项表示应用启动页，参考：https://uniapp.dcloud.io/collocation/pages
		{
			"path": "RCUIKit/pages/conversation/index",
			"style": {
				"navigationStyle": "custom"
			}
		},
		{
			"path": "RCUIKit/pages/chat/index",
			"style": {
				"navigationBarTitleText": "uni-uikit-demo",
				"navigationStyle": "custom",
        "app-plus": {
          "bounce": "none"
        }
			}
		},
		{
			"path": "RCUIKit/pages/chat/forward-message",
			"style": {
				"navigationStyle": "custom"
			}
		},
		{
			"path": "RCUIKit/pages/chat/video-play",
			"style": {
				"navigationStyle": "custom"
			}
		}
	],
}

```

### 5. 初始化并连接

在 App.vue 中增加如下代码，并注意替换 `your_app_key` `your_token` 为真实数据

```typescript
import * as RongIMLib from '@rongcloud/imlib-next';
import { RCKitStoreInstaller } from '@rongcloud/imkit-store';

uni.$RongIMLib = RongIMLib;
// 应用 App Key
const APP_KEY = 'your_app_key';
// 'your_token' 临时测试可从开发者后台获取
const TOKRN = 'your_token';

// lib 初始化
uni.$RongIMLib.init({
  appkey: APP_KEY, // 从融云开发者后台获取
});

// Kit store 初始化
const store = RCKitStoreInstaller({ logLevel: 1 });
uni.$RongKitStore = store;

// 连接 IM 
uni.$RongIMLib.connect(TOKRN).then((res) => {
  const { code, data } = res;
  if (code !== uni.$RongIMLib.ErrorCode.SUCCESS) {
    uni.showToast({
      title: `登录失败 code: ${code}`, icon: 'none',
    });
  }
});
```

## 6. 启动 Demo

1. 在 HBuilderX 中打开项目
2. 点击"运行" -> "运行到浏览器"或"运行到手机或模拟器"
3. 等待项目编译完成并启动