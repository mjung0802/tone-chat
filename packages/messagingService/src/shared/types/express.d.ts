import type { IServerMember } from '../../members/serverMember.model.js';
import type { IServer } from '../../servers/server.model.js';

declare global {
  namespace Express {
    interface Request {
      member?: IServerMember;
      server?: IServer;
    }
  }
}
