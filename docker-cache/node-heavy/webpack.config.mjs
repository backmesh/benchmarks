import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  entry: './src/index.ts',
  target: 'node',
  module: {
    rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }],
  },
  resolve: { extensions: ['.ts', '.js'] },
  output: {
    filename: 'bundle.cjs',
    path: path.resolve(__dirname, 'bundle'),
  },
};
