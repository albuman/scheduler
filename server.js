const http = require('http');
const fs = require('fs');
const url = require('url');
const mime = require('mime');

http.createServer((req, res) => {
    let requestedFile;

    switch (req.url) {
        case '/':
            requestedFile = __dirname + '/index.html';
            const readStream = fs.createReadStream(requestedFile);
            res.setHeader("Content-type", mime.getType(requestedFile))
            readStream.on('close', () => {
                res.end();
            });
            readStream.pipe(res);
            return;
        default:
            requestedFile = __dirname + req.url;
            fs.stat(requestedFile, (err, stats) => {
                if (err) {
                    res.end();
                    return;
                } else {
                    if (stats.isFile()) {
                        const readStream = fs.createReadStream(requestedFile);
                        res.setHeader("Content-type", mime.getType(requestedFile))
                        readStream.on('close', () => {
                            res.end();
                        });
                        readStream.pipe(res)
                    }
                }
            });
            return;
    }

}).listen(4040, 'localhost')
