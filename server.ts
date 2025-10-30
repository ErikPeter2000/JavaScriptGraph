// Static file server for testing.

import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFile, access, constants } from "fs";
import { join, extname } from "path";

const serverDirectory = join(__dirname, "public");

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const filePath = join(
    serverDirectory,
    req.url === "/" ? "index.html" : req.url || "",
  );

  access(filePath, constants.F_OK, (err) => {
    if (err) {
      console.log(err);
      res.statusCode = 404;
      res.end("File not found");
    } else {
      readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.end("Internal server error");
        } else {
          const ext = extname(filePath);
          let contentType = "text/html";
          if (ext === ".js") {
            contentType = "text/javascript";
          } else if (ext === ".css") {
            contentType = "text/css";
          } else if (ext === ".json") {
            contentType = "application/json";
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