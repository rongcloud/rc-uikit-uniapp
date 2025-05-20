<script>
	import * as RongIMLib from '@rongcloud/imlib-next';
	import { RCKitStoreInstaller } from '@rongcloud/imkit-store';
	import { hooks } from './storeHooks';

	export default {
		onLaunch() {
			console.log('App Launch');

			const config = {
				// 从融云开发者后台获取 appkey
				appkey: 'YOUR_APP_KEY',
				// 从融云开发者后台获取临时 token
				token: 'YOUR_TOKEN',
			};

			uni.$RongIMLib = RongIMLib;

			// lib 初始化
			uni.$RongIMLib.init({
				appkey: config.appkey,
			});

			// Kit store 初始化
			const store = RCKitStoreInstaller({ logLevel: 1, hooks });
			uni.$RongKitStore = store;

			// 连接 IM
			uni.$RongIMLib.connect(config.token).then((res) => {
				const { code, data } = res;
				if (code !== uni.$RongIMLib.ErrorCode.SUCCESS) {
					uni.showToast({
						title: `登录失败 code: ${code}`, icon: 'none',
					});
				}
			});
		},
		onShow() {
			console.log('App Show');
		},
		onHide() {
			console.log('App Hide');
		},
	};
</script>
