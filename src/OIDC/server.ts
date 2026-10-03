import express from 'express'
import { type Request, type Response } from 'express';
import jwt from "jsonwebtoken";
import crypto from "crypto";

const app = express();
app.use(express.urlencoded({ extended: false }));

const PORT = 4000;

// Registered client
const CLIENT = {
  clientId: "my-app",
  clientSecret: "my-secret",
  redirectUri: "http://localhost:3000/api-oidc-client/callback",
};

// Our extremely sophisticated user database :)
const USER = {
  sub: "12345",
  name: "Alice",
  email: "alice@example.com",
};

// Used to sign ID Tokens.
// DEMO ONLY — production OIDC providers use asymmetric keys.
const JWT_SECRET = "my-jwt-secret";

// Temporary authorization codes
const authorizationCodes = new Map();

/*
 * Authorization Endpoint
 *
 * Browser arrives here after clicking "Login".
 */
app.get("/oidc-authorize", (req: Request, res:Response) => {
  const {
    client_id,
    redirect_uri,
    response_type,
    scope,
    state,
    nonce,
  } = req.query;

  // Very basic validation
  if (
    client_id !== CLIENT.clientId ||
    redirect_uri !== CLIENT.redirectUri ||
    response_type !== "code"
  ) {
    return res.status(400).send("Invalid authorization request");
  }

  if (typeof scope !== "string") {
    return res.status(400).send("Invalid callback parameters");
  }

  if (!scope?.split(" ").includes("openid")) {
    return res.status(400).send("Missing openid scope");
  }

  // Normally we'd display a login page here.
  // For the demo, Alice is automatically authenticated.

  const code = crypto.randomBytes(16).toString("hex");

  authorizationCodes.set(code, {
    clientId: client_id,
    redirectUri: redirect_uri,
    user: USER,
    nonce,
  });

  const callback = new URL(redirect_uri);
  callback.searchParams.set("code", code);

  if (state && typeof state== "string") {
    callback.searchParams.set("state", state);
  }

  console.log("1. User authenticated:", USER.name);
  console.log("2. Authorization code:", code);

  return res.redirect(callback.toString());
});

/*
 * Token Endpoint
 *
 * The CLIENT SERVER calls this endpoint.
 * This is not a browser redirect.
 */
app.post("/oidc-token", (req: Request, res: Response) => {
  const {
    grant_type,
    code,
    client_id,
    client_secret,
    redirect_uri,
  } = req.body;

  if (
    client_id !== CLIENT.clientId ||
    client_secret !== CLIENT.clientSecret
  ) {
    return res.status(401).json({
      error: "invalid_client",
    });
  }

  if (grant_type !== "authorization_code") {
    return res.status(400).json({
      error: "unsupported_grant_type",
    });
  }

  const authorization = authorizationCodes.get(code);

  if (!authorization) {
    return res.status(400).json({
      error: "invalid_grant",
    });
  }

  if (authorization.redirectUri !== redirect_uri) {
    return res.status(400).json({
      error: "invalid_grant",
    });
  }

  // Authorization codes should only be usable once.
  authorizationCodes.delete(code);

  const now = Math.floor(Date.now() / 1000);

  const idToken = jwt.sign(
    {
      iss: "http://localhost:4000",
      sub: authorization.user.sub,
      aud: CLIENT.clientId,

      name: authorization.user.name,
      email: authorization.user.email,

      nonce: authorization.nonce,

      iat: now,
      exp: now + 3600,
    },
    JWT_SECRET,
    {
      algorithm: "HS256",
    }
  );

  // Normally this would also be an opaque/random or signed token.
  const accessToken = crypto.randomBytes(24).toString("hex");

  console.log("3. Authorization code exchanged");
  console.log("4. ID Token generated");

  return res.json({
    token_type: "Bearer",
    access_token: accessToken,
    expires_in: 3600,
    id_token: idToken,
  });
});

app.listen(PORT, () => {
  console.log(`OIDC Provider running at http://localhost:${PORT}`);
});