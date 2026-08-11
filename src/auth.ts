import { Router, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { config } from './config.js';
import { logger } from './logger.js';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      picture?: string;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

export function initAuth(app: any): void {
  if (!config.auth.enabled) {
    logger.info('Auth disabled');
    return;
  }

  if (!config.auth.authentikUrl || !config.auth.clientId || !config.auth.clientSecret) {
    logger.error('Auth enabled but missing Authentik config');
    return;
  }

  const sessionMiddleware = session({
    secret: config.auth.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.auth.callbackUrl.startsWith('https'),
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  const strategy = new OAuth2Strategy(
    {
      authorizationURL: `${config.auth.authentikUrl}/application/o/authorize/`,
      tokenURL: `${config.auth.authentikUrl}/application/o/token/`,
      clientID: config.auth.clientId,
      clientSecret: config.auth.clientSecret,
      callbackURL: config.auth.callbackUrl,
    },
    (accessToken: string, refreshToken: string, profile: any, done: any) => {
      const userinfo = jwtDecode(accessToken);
      const user: Express.User = {
        id: userinfo.sub || 'unknown',
        email: userinfo.email || '',
        name: userinfo.name || userinfo.preferred_username || '',
        picture: userinfo.picture,
      };
      logger.info('User authenticated', { email: user.email, name: user.name });
      done(null, user);
    }
  );

  passport.use('authentik', strategy);

  const authRouter = Router();

  authRouter.get('/login', (req: Request, res: Response) => {
    const returnTo = (req.query.returnTo as string) || '/';
    req.session.returnTo = returnTo;
    passport.authenticate('authentik', { scope: ['openid', 'email', 'profile'] })(req, res);
  });

  authRouter.get('/auth/callback', (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('authentik', { failureRedirect: '/login' })(req, res, () => {
      const returnTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      res.redirect(returnTo);
    });
  });

  authRouter.get('/logout', (req: Request, res: Response) => {
    req.logout(() => {
      res.redirect(`${config.auth.authentikUrl}/application/o/${config.auth.clientId}/end-session/`);
    });
  });

  authRouter.get('/auth/me', (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  app.use(authRouter);

  logger.info('Auth enabled with Authentik', { url: config.auth.authentikUrl });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.auth.enabled) {
    return next();
  }

  if (req.isAuthenticated()) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
}

function jwtDecode(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const payload = Buffer.from(parts[1], 'base64').toString();
    return JSON.parse(payload);
  } catch {
    return {};
  }
}
