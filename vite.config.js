import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";

function deploymentVersion() {
  return {
    name: "deployment-version",
    closeBundle() {
      writeFileSync("dist/version.json", JSON.stringify({ version: Date.now() }), "utf8");
    },
  };
}

export default defineConfig({ plugins: [react(), deploymentVersion()], build: { outDir: "dist" } });
