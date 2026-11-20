# Representative node-heavy image for design-cache-phase1.md's docker spike:
# a real npm install (216 packages) plus a tsc + webpack build, so a cold
# build pays dependency fetch, native-ish install work, and CPU-bound
# compile/bundle, not just an empty `npm ci`.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json webpack.config.mjs ./
COPY src ./src
RUN npm run build
CMD ["node", "bundle/bundle.cjs"]
