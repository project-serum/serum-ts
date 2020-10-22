import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from 'rollup-plugin-typescript2';
import json from 'rollup-plugin-json';

export default {
  input: `src/index.ts`,
  output: [
    {
      file: './dist/index.browser.umd.js',
      name: 'index',
      format: 'umd',
      sourcemap: true,
      globals: {
        crypto: 'crypto',
      },
    },
    {
      file: './dist/index.browser.es5.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  external: [],
  watch: {
    include: 'src/**',
  },
  plugins: [
    resolve({
      browser: true,
    }),
    commonjs(),
    json(),
    typescript({ useTsconfigDeclarationDir: true }),
    sourceMaps(),
  ],
};
