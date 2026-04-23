import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// GitHub Pages project site: https://<user>.github.io/<repo>/
const repoBase = "/reader/";

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? repoBase : "/",
  plugins: [vue(), viteSingleFile({ removeViteModuleLoader: true })],
  esbuild: {
    legalComments: "none"
  },
  build: {
    outDir: "build",
    emptyOutDir: true,
    target: "es2022",
    minify: "terser",
    cssMinify: "esbuild",
    sourcemap: false,
    terserOptions: {
      module: true,
      compress: {
        passes: 2,
        pure_getters: true
      },
      mangle: {
        toplevel: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        compact: true
      }
    }
  }
});
