export interface IReplyGetFriend {
  id: string;
  accepted: boolean;
  created_at: string;
}

export interface IReplyFriendStatus {
  status: boolean;
  requesting: string;
}
