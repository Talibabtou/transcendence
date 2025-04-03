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
  
  export interface IReplyGetUser {
    username: string;
    email: string;
  }
  
  export interface IReplyGetUsers {
    users: Array<IReplyGetUser>
  }
  
  export interface IReplyLogin {
    id: string,
    role: string,
    username: string,
    token: string
  }