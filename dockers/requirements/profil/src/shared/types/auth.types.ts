export interface IAddUser {
  username: string,
  email: string,
  password: string
}

export interface ILogin {
  email: string,
  password: string
}

export interface IModifyUser {
  username?: string,
  email?: string,
  password?: string
}

export interface IReplyUser {
  id: string;
  username: string;
  email: string;
}

export interface IReplyLogin {
  token: string,
  user: {
    id: string,
    role: string,
    username: string
  }
}