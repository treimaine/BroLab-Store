import express from 'express';
import { registerAuthRoutes, setupAuth } from './auth';
import downloadsRouter from './routes/downloads';
import ordersRouter from './routes/orders';
import serviceOrdersRouter from './routes/serviceOrders';
import subscriptionRouter from './routes/subscription';
import reservationsRouter from './routes/reservations';

const app = express();
app.use(express.json());

setupAuth(app);
registerAuthRoutes(app);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/service-orders', serviceOrdersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reservations', reservationsRouter);

export { app };

