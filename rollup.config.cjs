const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser').default;

module.exports = {
  input: 'src/index.js',
  output: [
    { file: 'dist/humantime.esm.js', format: 'es' },
    { file: 'dist/humantime.cjs.js', format: 'cjs' },
    { file: 'dist/humantime.umd.js', format: 'umd', name: 'HumanTime' }
  ],
  plugins: [resolve(), commonjs(), terser()]
}; \-0]9
