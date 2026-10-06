import express from 'express';
import { conversionRouter } from './modules/conversion';

const app = express();
const port = 8801;

app.use(express.json());
app.use('/api/conversion', conversionRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'teach-os' });
});

app.get('/api/modules', (req, res) => {
  res.json([
    { name: 'acquisition', status: 'online' },
    { name: 'course', status: 'online' },
    { name: 'conversion', status: 'online' },
    { name: 'qa', status: 'planned' },
    { name: 'learning', status: 'planned' },
    { name: 'data', status: 'planned' }
  ]);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;
