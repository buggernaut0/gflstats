/**
 * Statische Website: `npm run build` erzeugt den Ordner out/, der ohne Server
 * ausgeliefert werden kann (z. B. GitHub Pages). NEXT_PUBLIC_BASE_PATH ist der
 * Unterpfad, unter dem die Seite laeuft (bei GitHub Pages: /gflstats).
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
