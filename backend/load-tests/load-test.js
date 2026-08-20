import http from 'k6/http';
import { check, sleep } from 'k6';

// Override with `k6 run -e BASE_URL=... load-test.js` to point at staging/local
// instead of prod (defaults to the same Render URL the app ships with, see
// frontend/eas.json).
const BASE_URL = __ENV.BASE_URL || 'https://fitness-vioh.onrender.com';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };

// Tagged with the k6-loadtest- prefix and @example.com (a reserved,
// non-deliverable domain — signup requires no email verification, so this
// never sends real mail) so these rows are easy to find and delete after a
// run:
//   DELETE FROM "User" WHERE email LIKE 'k6-loadtest-%@example.com';
const uniqueEmail = () =>
  `k6-loadtest-${__VU}-${__ITER}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

export default function () {
  const email = uniqueEmail();
  const password = 'LoadTest123!';

  const signupRes = http.post(
    `${BASE_URL}/api/auth/signup`,
    JSON.stringify({ email, password }),
    JSON_HEADERS,
  );
  check(signupRes, {
    'signup status is 201': (r) => r.status === 201,
    'signup returns accessToken': (r) => !!r.json('accessToken'),
  });

  sleep(0.1);

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    JSON_HEADERS,
  );
  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login returns accessToken': (r) => !!r.json('accessToken'),
  });

  sleep(0.1);
}
