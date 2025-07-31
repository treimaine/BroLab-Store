import express from 'express';
import { registerAuthRoutes, setupAuth } from './auth';
import downloadsRouter from './routes/downloads';
import openGraphRouter from './routes/openGraph';
import ordersRouter from './routes/orders';
import reservationsRouter from './routes/reservations';
import schemaRouter from './routes/schema';
import serviceOrdersRouter from './routes/serviceOrders';
import sitemapRouter from './routes/sitemap';
import subscriptionRouter from './routes/subscription';

const app = express();
app.use(express.json());

setupAuth(app);
registerAuthRoutes(app);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/service-orders', serviceOrdersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/opengraph', openGraphRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/schema', schemaRouter);
app.use('/', sitemapRouter);

export { app };

