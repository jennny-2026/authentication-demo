import { Router, type Request, type Response } from 'express';
import passport  from 'passport';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20'
import { expectedGoogleAuth } from './utils/creds.js';

declare global {
  namespace Express {
    interface User {
      id: string;
    }
  }
}

passport.use(
  new GoogleStrategy(
    {
      clientID: expectedGoogleAuth.GOOGLE_CLIENT_ID,  // Client ID
      clientSecret: expectedGoogleAuth.GOOGLE_CLIENT_SECRET,  // Client secret
      callbackURL: "http://localhost:3000/api-oath2/google/callback",
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        console.log(profile);
        return done(null, { id: profile.id });
      } catch (err) {
        return done(err, undefined);
      }
    }
  )
);

/* How to store the user information in the session */
passport.serializeUser<string>(function (user, done) {
  done(null, user.id);
});

/* How to retrieve the user from the session */
passport.deserializeUser<string>(function (id, done) {
  done(null, { id });
});

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/failure" }),
  function (req, res) {
    // Successful authentication
    if (!req.user) {
      return res.redirect("/failure");
    }

    console.log(req.user);
    res.redirect(`/?user=${encodeURIComponent(req.user.id)}`);
  }
);

export { passport, router };