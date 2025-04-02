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

