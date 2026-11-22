import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Do not expose server internals, build scripts, or SQL migrations
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    p === '/server.js' ||
    p === '/package.json' ||
    p === '/package-lock.json' ||
    p.startsWith('/tools/') ||
    p === '/tools' ||
    p.startsWith('/supabase/') ||
    p === '/supabase' ||
    p.startsWith('/src/') ||
    p === '/src'
  ) {
    return res.status(404).sendFile(path.join(__dirname, '404.html'));
  }
  next();
});

app.use(
  express.static(__dirname, {
    extensions: ['html'],
    index: 'index.html',
    dotfiles: 'ignore',
    redirect: true,
  })
);

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`GoWithDME static server running at http://${HOST}:${PORT}`);
});
