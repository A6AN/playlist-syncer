// 🔒 Your actual client ID
const CLIENT_ID = '329e873b7a9f45a4a8128770e084e27c';
const REDIRECT_URI = 'https://a6an.github.io/playlist-syncer/';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Step 1: Generate a random code verifier
function generateCodeVerifier(length = 128) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return result;
}

// Step 2: Hash it to create code challenge
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return base64;
}

// Step 3: Handle Login Click
document.getElementById('spotifyLogin').addEventListener('click', async () => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem('verifier', verifier); // save for later

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: 'playlist-read-private playlist-read-collaborative'
  });

  window.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
});

// Step 4: Handle redirect back with code
async function handleRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const verifier = localStorage.getItem('verifier');

  if (!code) return;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await response.json();

  if (data.access_token) {
    localStorage.setItem('spotify_token', data.access_token);
    document.getElementById('status').innerText = '✅ Logged in to Spotify!';
    console.log('🟢 Access token:', data.access_token);
    history.replaceState(null, '', REDIRECT_URI); // Clean up URL
    fetchPlaylists(data.access_token); // Optional if you want to fetch
  } else {
    console.error('❌ Failed to get token:', data);
    document.getElementById('status').innerText = '❌ Login failed';
  }
}

// Step 5: Fetch user playlists
async function fetchPlaylists(token) {
  const res = await fetch('https://api.spotify.com/v1/me/playlists', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const data = await res.json();
  console.log('🎶 Your playlists:', data);
  document.getElementById('playlists').innerText = JSON.stringify(data.items, null, 2);
}

handleRedirect(); // Call on load
