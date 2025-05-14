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
	token: string;
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
