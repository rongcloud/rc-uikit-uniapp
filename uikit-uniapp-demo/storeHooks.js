export const hooks = {
	// 批量获取用户信息
	reqUserProfiles: (userIds) => new Promise((resolve) => {
		// 注意：以下是 mock 数据，实际项目中需要替换为真实的接口请求
		const mockUsers = userIds.map((id) => ({
		id,
		name: `用户${id}`,
		// portraitUri: 'https://example.com/avatar.png'
    }));
		resolve(mockUsers);
  }),

	// 批量获取群组信息
	reqGroupProfiles: (groupIds) => new Promise((resolve) => {
		// 注意：以下是 mock 数据，实际项目中需要替换为真实的接口请求
		const mockGroups = groupIds.map((id) => ({
      id,
      name: `群组${id}`,
      // portraitUri: 'https://example.com/group-avatar.png',
      memberCount: Math.floor(Math.random() * 100),
		}));
		resolve(mockGroups);
  }),

	// 批量获取系统会话信息
	reqSystemProfiles: (targetIds) => new Promise((resolve) => {
		// 注意：以下是 mock 数据，实际项目中需要替换为真实的接口请求
		const mockProfiles = targetIds.map((id) => ({
      id,
      name: `系统消息${id}`,
      // portraitUri: 'https://example.com/system-avatar.png'
		}));
		resolve(mockProfiles);
  }),

	// 获取群组成员列表信息
	reqGroupMembers: (groupId) => new Promise((resolve) => {
		// 注意：以下是 mock 数据，实际项目中需要替换为真实的接口请求
		const mockMembers = Array.from({ length: 10 }, (_, i) => ({
    groupNickname: 'groupNickname',
    user: {
      id: `member_${i}`,
			nickname: `成员${i}`,
			// portraitUri: 'https://example.com/member-avatar.png',
    },
		}));
		resolve(mockMembers);
  }),
};
