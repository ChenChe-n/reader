import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  build: {
    outDir: "build",
    emptyOutDir: true
  }
});
