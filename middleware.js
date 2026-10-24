// Password gate for the admin dashboard. Vercel runs this before it serves /admin.
// Only a scrambled (SHA-256) form of the password is stored here, never the password itself.
// To change the password: hash "miras-admin-v1:" + the new password with SHA-256 and put the hex below.
export const config = { matcher: ['/admin', '/admin/:path*'] };

const USER = 'miras';
const HASH = '78b779c018b3840df0974532122721442b27129cb37eb1c0acc40d8517a18ce5';

const same = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

const sha256 = async text => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
};

export default async function middleware(request) {
  const [scheme, token] = (request.headers.get('authorization') || '').split(' ');
  if (scheme === 'Basic' && token) {
    let given = '';
    try { given = atob(token); } catch (e) { /* bad header: falls through to 401 */ }
    const i = given.indexOf(':');
    if (i > -1 && same(given.slice(0, i), USER) && same(await sha256('miras-admin-v1:' + given.slice(i + 1)), HASH)) {
      return new Response(null, { headers: { 'x-middleware-next': '1', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } });
    }
  }
  return new Response('Sign in to open the MIRAS admin.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="MIRAS admin", charset="UTF-8"', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
