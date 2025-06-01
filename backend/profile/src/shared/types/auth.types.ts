export interface IUsername {
  username: string;
}

export interface IAddUser {
  username: string;
  email: string;
  password: string;
}

export interface ILogin {
  email: string;
  password: string;
}

export interface IModifyUser {
  username?: string;
  email?: string;
  password?: string;
}

export interface IReplyUser {
  id: string;
  username: string;
  email: string;
}

export interface IReplyLogin {
  token?: string;
  id?: string;
  role?: string;
  username?: string;
  status?: string;
}

export interface I2faCode {
  twofaCode: string;
}

export interface IJwtId {
  id: string;
}

export interface IId {
  id: string;
}

export interface IReplyQrCode {
  qrcode: string;
  otpauth: string | undefined;
}

export interface IReplyTwofaStatus {
  two_factor_enabled: boolean;
}


export interface FastifyJWT {
  user: {
    id: string;
    role: string;
    jwtId?: string;
    twofa?: boolean;
    iat?: number;
    exp?: number;
  };
}

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: boolean;
    roles?: string[];
  }
}
