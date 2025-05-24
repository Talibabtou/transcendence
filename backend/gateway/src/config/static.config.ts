import path from 'path';

export const staticConfig = {
  root: path.join(path.resolve(), process.env.UPLOADS_DIR || '/uploads'),
  prefix: '/uploads',
};
