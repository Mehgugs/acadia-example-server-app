import gen from '../gen/assets/elm.js';
import './XMLHttpRequest.js'
import http from 'node:http';
import fs from 'node:fs';

const app = gen.Elm.Main.init();

const server = http.createServer((req, res) => {
  let body = [];
  req.on('data', chunk => { body.push(chunk); });
  req.on('end', () => { req.__elm_body = body; app.ports.requests.send({ req: req, res: res }); });
});

app.ports.responses.subscribe(({ req, res, content }) => {
  console.dir(content)
  switch (content.tag)
  {
    case 'proxy':
      const preq = http.request({
        hostname: content.hostname,
        port: content.port,
        path: req.url,
        method: req.method,
        headers: req.headers
      }, (proxy) => {
        res.writeHead(proxy.statusCode, proxy.headers);
        proxy.pipe(res);
      });
      req.__elm_body.forEach((chunk) => { preq.write(chunk); });
      preq.end();
      return;

    case 'file':
      res.setHeader('content-type', content.type_);
      res.writeHead(content.code, content.headers);
      fs.createReadStream(content.path).pipe(res);
      return;

    case 'string':
      res.setHeader('content-type', content.type_);
      res.writeHead(content.code, content.headers);
      res.end(content.body);
      return;
    case 'empty':
      res.writeHead(content.code, content.headers)
      res.end();
      return;
    default:
      res.writeHead(500); // if we're not setting any headers we should not be setting a user defined status code.
      res.end();
      return;
  }
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Listening on localhost:3000');
});
