import { Router, type Request, type Response } from 'express';
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = Router();

const CLIENT_ID = "my-app";
const CLIENT_SECRET = "my-secret";

const REDIRECT_URI = "http://localhost:3000/api-oidc-client/callback";

const AUTHORIZE_URL = "http://localhost:4000/oidc-authorize";
const TOKEN_URL = "http://localhost:4000/oidc-token";

const JWT_SECRET = "my-jwt-secret";

// Temporary values used to protect the login request.
// A real application would associate these with a user session.
const loginRequests = new Map<string, { nonce: string }>();
/*
 * Start authentication
 */
router.get("/login", (req: Request, res: Response) => {
  console.log("triggered!")
  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");

  loginRequests.set(state, {
    nonce,
  });

  const url = new URL(AUTHORIZE_URL);

  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");

  // This is what makes this an OIDC request.
  // The client requests to get the following permissions
  url.searchParams.set("scope", "openid profile email");

  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);

  console.log("Starting OIDC login");
  console.log("state:", state);
  console.log("nonce:", nonce);

  res.redirect(url.toString());
});

/*
 * Provider redirects the browser here.
 */
router.get("/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (typeof code !== "string" || typeof state !== "string") {
    return res.status(400).send("Invalid callback parameters");
  }

  const loginRequest = loginRequests.get(state);

  if (!loginRequest) {
    return res.status(400).send("Invalid state");
  }

  loginRequests.delete(state);

  console.log("5. Received authorization code:", code);

  /*
   * Exchange authorization code for tokens.
   *
   * Notice: this request happens from our SERVER
   * directly to the OIDC Provider.
   */
  const response = await fetch(TOKEN_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },

    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokens = await response.json();

  if (!response.ok) {
    console.error(tokens);
    return res.status(400).send("Token exchange failed");
  }

  console.log("6. Tokens received:");
  console.log(tokens);

  /*
   * Validate ID Token.
   *
   * jwt.verify checks the signature and expiration.
   * We additionally require the expected issuer/audience.
   */
  try {
    const claims = jwt.verify(
      tokens.id_token,
      JWT_SECRET,
      {
        algorithms: ["HS256"],
        issuer: "http://localhost:4000",
        audience: CLIENT_ID,
      }
    );

    if (
      typeof claims === "string" ||
      typeof claims["nonce"] !== "string" ||
      claims["nonce"] !== loginRequest.nonce
    ) {
      return res.status(400).send("Invalid nonce");
    }

    console.log("7. ID Token verified:");
    console.log(claims);

    const redirectUrl = new URL("/", REDIRECT_URI);
    redirectUrl.searchParams.set("id_token", tokens.id_token);
    return res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error(error);

    return res.status(401).send("Invalid ID Token");
  }
});

export default router;
