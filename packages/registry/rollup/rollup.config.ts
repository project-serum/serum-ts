import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from 'rollup-plugin-typescript2';
import json from 'rollup-plugin-json';

const pkg = require('../package.json');

export default {
  input: `src/index.ts`,
  output: [
    {
      file: pkg.main,
      name: 'index',
      format: 'umd',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
  ],
  external: [],
  watch: {
    include: 'src/**',
  },
  plugins: [
    resolve(),
    commonjs({
			namedExports: {
        '../pool/dist/lib/index.js': ['Basket','decodePoolState', 'encodePoolState'],
			}
		}),
    json(),
    typescript({ useTsconfigDeclarationDir: true }),
    sourceMaps(),
  ],
};
