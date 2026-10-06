import express from 'express';

const app = express();
const port = 8801;

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'teach-os' });
});

app.get('/api/modules', (req, res) => {
  res.json([
    { name: 'acquisition', status: 'online' },
    { name: 'course', status: 'online' },
    { name: 'conversion', status: 'planned' },
    { name: 'qa', status: 'planned' },
    { name: 'learning', status: 'planned' },
    { name: 'data', status: 'planned' }
  ]);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;
