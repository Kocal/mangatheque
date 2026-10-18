import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite-plus";
import type { Plugin } from "vite-plus";

function frozenStore(): Plugin {
  const file = fileURLToPath(new URL("./data/frozen.json", import.meta.url));
  return {
    name: "mangatheque-frozen-store",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__frozen", (req, res) => {
        if (req.method !== "PUT") {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          try {
            const frozen: unknown = JSON.parse(body);
            if (!Array.isArray(frozen)) {
              throw new Error("not an array");
            }
            await writeFile(file, `${JSON.stringify(frozen, null, 2)}\n`);
            res.statusCode = 204;
          } catch {
            res.statusCode = 400;
          }
          res.end();
        });
      });
    },
    handleHotUpdate({ file: changed }) {
      return changed === file ? [] : undefined;
    },
  };
}

export default defineConfig({
  plugins: [vue(), frozenStore()],
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
