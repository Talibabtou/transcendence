interface IFriend {
    id: string;
    accepted: boolean;
    date: string;
}

export interface IReplyGetFriends {
    ids: Array<IFriend>;
}

export interface IId {
    id: string;
}
