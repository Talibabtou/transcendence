export interface ICreateUser {
  username: string,
  email: string,
  password: string
}

export interface ILogin {
  email: string,
  password: string
}

export interface IGetIdUser {
  id: number
}
