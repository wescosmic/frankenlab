/**
 * Next.js configuration.
 *
 * The application is entirely on the client: there is no server route, no
 * database and no API. That means it can be published as a static site, which
 * is what the hosting needs.
 *
 * The static export is opt-in, because the ordinary build stays a server
 * build so that `npm start` still serves the app for a local review. Build
 * the static site with:
 *
 *     NEXT_STATIC_EXPORT=1 npm run build
 *
 * which writes the site to `out/`.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  ...(process.env.NEXT_STATIC_EXPORT ? { output: 'export' } : {}),
};

export default nextConfig;
