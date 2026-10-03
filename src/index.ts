import express, { type Express, type Request, type Response } from 'express';
import ejs from 'ejs';
import userPassRouter from './usr+pass.js';
import jwtRouter from './jwt.js';
import oidcClientRouter from './OIDC/client.js';
import cookieParser from 'cookie-parser';
import { passport, router as oath2Router } from './oath2.js';
import session from 'express-session';

const app: Express = express();
const port = 3000;

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', './views');
app.use(express.json());
app.use(cookieParser());
app.use('/api', userPassRouter);
app.use('/api-jwt', jwtRouter);
app.use('/api-oidc-client', oidcClientRouter);
app.use(
  '/api-oath2',
  session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  }),
  passport.initialize(),
  passport.session(),
  oath2Router
);

app.get('/', (req: Request, res: Response) => {
  res.render('index');
});

app.get('/failure', (req: Request, res: Response) => {
  res.render('sample-failure');
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});