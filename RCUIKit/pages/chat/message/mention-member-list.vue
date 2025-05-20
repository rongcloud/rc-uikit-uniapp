<template>
<view class="rc-mention">
  <view class="rc-header">
    <RCIcon class="rc-header-left" type="left":size="'20px'" @click="$emit('onClose')" clickable/>
    <view class="rc-header-title">
      选择提醒人
    </view>
    <view class="rc-header-right">
    </view>
  </view>
    <scroll-view
      class="rc-list"
      scroll-y
      :refresher-enabled="false"
    >
      <SelectMemberItem
        v-for="(member, index) in memberList"
        :key="index"
        @onSelect="onSelect(member)"
        :data="{
          portraitUri: member.user.portraitUri,
          name: member.groupNickname || member.user.nickname
        }"
      >
        </SelectMemberItem>
    </scroll-view>
</view>
</template>

<script setup lang="ts">
/**
* at 成员列表组件
*/
import {
 defineProps, defineEmits, ref, onUnmounted,
} from 'vue';
import RCIcon from '@/RCUIKit/components/rc-icon.vue';
import SelectMemberItem from '@/RCUIKit/pages/chat/message/select-member-item.vue';
import { autorun } from 'mobx';
import { IGroupMemberProfile } from '@rongcloud/imkit-store';
import { deepClone } from '@/RCUIKit/utils';
import { DEFAULT_GROUP_PORTRAIT_SVG, DEFAULT_USER_PORTRAIT_SVG } from '@/RCUIKit/assets';

const props = defineProps({
  groupId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['onSelect', 'onClose']);

const memberList = ref<IGroupMemberProfile[]>([]);

const allMember = {
  user: {
    id: '',
    nickname: '所有人',
    portraitUri: DEFAULT_GROUP_PORTRAIT_SVG,
  },
  groupNickname: '所有人',
};

const memberListDisposer = autorun(() => {
  const members = deepClone<IGroupMemberProfile[]>(uni.$RongKitStore.appData.groupMembersCache.getGroupMembers(props.groupId));

  memberList.value = [allMember, ...members];
});

const onSelect = (member: IGroupMemberProfile) => {
  emit('onSelect', member);
};

onUnmounted(() => {
  memberListDisposer();
});

</script>

<style lang="scss" scoped>
@use '../../../styles/_variables.scss' as var;
.rc-mention {
  background-color: var.$rc-color-bg-regular;
  height: 80vh;
  z-index: 999999;
}
.rc-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  &-title {
    text-align: center;
    font-size: var.$rc-font-size-regular;
    flex: 1;
  }
  &-right {
    width: 20px;
  }
}
.rc-list {
  height: calc(100% - 44px);
  &-item {
    display: flex;
    padding: 10px;
    align-items: center;
    &-avatar {
      border-radius: 50%;
      overflow: hidden;
    }
    &-name {
      flex: 1;
      padding-left: 10px;
      font-size: var.$rc-font-size-regular;
    }
  }
}
</style>
