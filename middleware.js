// Password gate for the admin dashboard. Vercel runs this before serving /admin.
// Set ADMIN_USER and ADMIN_PASSWORD in the Vercel project (Settings > Environment Variables).
// With either one missing, the admin stays locked.
export const config = { matcher: ['/admin', '/admin/:path*'] };

const same = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export default function middleware(request) {
  const user = process.env.ADMIN_USER, pass = process.env.ADMIN_PASSWORD;
  const [scheme, token] = (request.headers.get('authorization') || '').split(' ');
  if (user && pass && scheme === 'Basic' && token) {
    let given = '';
    try { given = atob(token); } catch (e) { /* bad header: falls through to 401 */ }
    const i = given.indexOf(':');
    if (i > -1 && same(given.slice(0, i), user) && same(given.slice(i + 1), pass)) {
      return new Response(null, { headers: { 'x-middleware-next': '1', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } });
    }
  }
  return new Response('Sign in to open the MIRAS admin.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="MIRAS admin", charset="UTF-8"', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
