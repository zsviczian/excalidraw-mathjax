import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from "rollup-plugin-terser";
import copy from "rollup-plugin-copy";
import typescript2 from "rollup-plugin-typescript2";
import dotenv from 'dotenv';
import replace from "@rollup/plugin-replace";
import fs from 'fs';

dotenv.config();
const DIST_FOLDER = 'dist';
const isProd = (process.env.NODE_ENV === "production");
console.log(`Running: ${process.env.NODE_ENV}; isProd: ${isProd}`);

const manifestStr = fs.readFileSync("manifest.json", "utf-8");
const manifest = JSON.parse(manifestStr);
console.log(manifest.version);

const BASE_CONFIG = {
  input: 'src/main.ts',
  external: [
    'obsidian'
  ],
};

const getRollupPlugins = (tsconfig, ...plugins) => [
  typescript2(tsconfig),
  commonjs(),
  nodeResolve({ browser: true, preferBuiltins: false }),
  replace({
    preventAssignment: true,
    values: {
      'process.env.PLUGIN_VERSION': JSON.stringify(manifest.version),
    },
  }),
].concat(plugins);

const BUILD_CONFIG = {
  ...BASE_CONFIG,
  output: {
    dir: DIST_FOLDER,
    entryFileNames: 'main.js',
    format: 'cjs',
    exports: 'default',
  },
  plugins: getRollupPlugins(
    { tsconfig:"tsconfig.json" },
    terser({
      toplevel: false,
      compress: { passes: 2 },
      format: {
        comments: false, // Remove all comments
      },
    }),
    copy({
      targets: [ { src: 'manifest.json', dest: DIST_FOLDER }, {src: 'styles.css', dest: DIST_FOLDER} ],
      verbose: true,
    }),
  ),
};

let config = [];
config.push(BUILD_CONFIG);

export default config;