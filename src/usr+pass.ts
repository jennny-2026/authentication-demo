import { Router, type Request, type Response } from 'express';
import { expectedCredentials } from './utils/creds.js';

const router = Router();

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

	res.json({ username });
});

export default router;
