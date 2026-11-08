// Example inspired by https://medium.com/@rinkitadhana/jwt-authentication-apis-with-typescript-node-js-and-mongodb-b05a8a3cb062
// Some code reused its implementation

import { Router, type Request, type Response } from 'express';
import { expectedCredentials } from './utils/creds.js';
import jwt from "jsonwebtoken";

const router = Router();
const secret = 'my_secret'
const expirationTime = '1h'

router.post('/login', (req: Request, res: Response) => {
    const body: unknown = req.body;

    if (typeof body !== 'object' || body === null) {
		res.status(400).json({ message: 'Username and password are required.' });
		return;
	}

	const { username, password } = body as Record<string, unknown>;
	if (typeof username !== 'string' || typeof password !== 'string') {
		res.status(400).json({ message: 'Username and password are invalid.' });
		return;
	}

    if (username !== expectedCredentials.username || password !== expectedCredentials.password) {
		res.status(401).json({ message: 'Username or password is incorrect.' });
		return;
	}

    const token = jwt.sign({ username }, secret, { expiresIn: expirationTime });

    const expiryInSeconds = parseInt(expirationTime as string);
        if (isNaN(expiryInSeconds)) {
            throw new Error("Invalid JWT_EXPIRY value");
    }

    res.cookie("jwt", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: expiryInSeconds * 1000,
        path: "/api-jwt/test",
    });

    res.json({ authenticated: true });
})

router.get('/test/me', (req: Request, res: Response) => {
    const token = req.cookies?.['jwt'];
    console.log('token', token)

    if (!token) {
        res.status(401).json({ authenticated: false });
        return
    }

    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload & { username: string };
      res.json({ authenticated: true, user: payload.username });
    } catch {
      res.status(401).json({ authenticated: false });
    }
})

export default router;