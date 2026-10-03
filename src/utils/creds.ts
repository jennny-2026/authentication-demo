import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Credentials = {
	username: string;
	password: string;
};

export type GoogleAuth = {
	GOOGLE_CLIENT_ID: string,
	GOOGLE_CLIENT_SECRET: string
}

const configPath = fileURLToPath(new URL('../../config.json', import.meta.url));
const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
	'user+pass': Credentials;
	'google': GoogleAuth;
};

export const expectedCredentials = config['user+pass'];
export const expectedGoogleAuth = config['google'];


