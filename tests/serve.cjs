const fs = require('node:fs');
module.exports = (req, res) => {
  const files = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/save-image.js': ['save-image.js', 'application/javascript'],
    '/vendor/html2canvas.min.js': ['vendor/html2canvas.min.js', 'application/javascript'],
  };
  const entry = files[req.url.split('?')[0]];
  if (!entry) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', entry[1]);
  res.end(fs.readFileSync(entry[0]));
};
