import * as NodeHttp from "node:http";
import * as NodeUtil from "node:util";

const { values } = NodeUtil.parseArgs({
  options: {
    port: { type: "string", default: "18011" },
    target: { type: "string", default: "http://127.0.0.1:8011" },
  },
});
const target = new URL(values.target);
if (target.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) {
  throw new Error("The thinking bridge requires a local HTTP model server.");
}

const server = NodeHttp.createServer(async (request, response) => {
  let upstream;
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    let body = Buffer.concat(chunks);
    if (request.method === "POST" && request.url?.split("?")[0] === "/v1/chat/completions") {
      const data = JSON.parse(body.toString("utf8"));
      data.chat_template_kwargs = { ...data.chat_template_kwargs, enable_thinking: true };
      body = Buffer.from(JSON.stringify(data));
    }
    const headers = { ...request.headers, host: target.host };
    delete headers["transfer-encoding"];
    delete headers.connection;
    if (body.length > 0) headers["content-length"] = String(body.length);
    upstream = NodeHttp.request(
      {
        hostname: target.hostname,
        port: target.port || 80,
        path: request.url,
        method: request.method,
        headers,
      },
      (incoming) => {
        response.writeHead(incoming.statusCode ?? 502, incoming.headers);
        incoming.on("error", () => response.destroy());
        incoming.pipe(response);
      },
    );
    response.on("close", () => upstream.destroy());
    upstream.on("error", () => {
      if (response.headersSent) response.destroy();
      else {
        response.writeHead(502, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { message: "Local model server is unavailable." } }));
      }
    });
    upstream.end(body);
  } catch {
    upstream?.destroy();
    if (!response.headersSent) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: "Invalid local model request." } }));
    } else response.destroy();
  }
});

server.listen(Number(values.port), "127.0.0.1", () => {
  console.log(`Local thinking bridge: http://127.0.0.1:${values.port} → ${target.origin}`);
});
