import type { IServerMember } from '../../members/serverMember.model.js';

declare global {
  namespace Express {
    interface Request {
      member?: IServerMember;
    }
  }
}
