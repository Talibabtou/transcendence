export interface IReplyGetFriend {
  id: string;
  accepted: boolean;
  created_at: string;
}

export interface IReplyGetFriendStatus {
  status: boolean | undefined;
}