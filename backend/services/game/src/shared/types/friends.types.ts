export interface IReplyGetFriend {
  id: string;
  username: string;
  accepted: boolean;
  pic: string;
  created_at: string;
}

export interface IReplyFriendStatus {
  status: boolean;
  requesting: string;
}
