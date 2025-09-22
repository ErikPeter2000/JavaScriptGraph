// Static file server for testing.

const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
  const filePath = path.join(
    __dirname,
    req.url === "/" ? "index.html" : req.url,
  );

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log(err);
      res.statusCode = 404;
      res.end("File not found");
    } else {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.end("Internal server error");
        } else {
          const ext = path.extname(filePath);
          let contentType = "text/html";
          if (ext === ".js") {
            contentType = "text/javascript";
          }

          res.setHeader("Content-Type", contentType);
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

