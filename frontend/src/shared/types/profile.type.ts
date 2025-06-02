import { PlayerMatchSummary } from './match.type.js';

export interface IUpload {
	file: string;
	description?: string;
}

export interface IId {
	id: string;
}

export interface IReplyPic {
	link: string;
}

export interface IReplySummary {
	username: string;
	id: string;
	summary: PlayerMatchSummary;
	pics: IReplyPic;
}
