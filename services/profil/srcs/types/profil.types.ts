export interface IGetIdUser {
  id: string
}

export interface IReply {
  success?: boolean,
  message?: string,
  option?: any
}

export interface IReplyBuffer {
  buffer: Buffer;
}