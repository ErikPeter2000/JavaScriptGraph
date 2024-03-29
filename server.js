const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Get the file path based on the requested URL
    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.log(err);
            res.statusCode = 404;
            res.end('File not found');
        } else {
            // Read the file and send it as the response
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.statusCode = 500;
                    res.end('Internal server error');
                } else {
                    // Set the appropriate content type based on the file extension
                    const ext = path.extname(filePath);
                    let contentType = 'text/html';
                    if (ext === '.js') {
                        contentType = 'text/javascript';
                    }

                    res.setHeader('Content-Type', contentType);
                    res.end(data);
                }
            });
        }
    });
});

const port = 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});