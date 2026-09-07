import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Under Phusion Passenger on cPanel, PORT can be a TCP port number OR a unix socket path
const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> EliteHub CRM ready on ${port}`);
  });
}).catch((err) => {
  console.error('Fatal error starting Next.js application:', err);
  process.exit(1);
});

