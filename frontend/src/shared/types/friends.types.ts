export interface IReplyGetFriend {
	id: string;
	requesting: string;
	username: string;
	request: boolean;
	accepted: boolean;
	pic: string;
	created_at: string;
}

export interface IReplyFriendStatus {
	status: boolean;
	requesting: string;
}
