// 🔒 REPLACE with your own Spotify Client ID from developer dashboard
const SPOTIFY_CLIENT_ID = '329e873b7a9f45a4a8128770e084e27c';

// This must match what you set in Spotify dashboard
const REDIRECT_URI = 'http://localhost:5500/';

// Spotify's authorization endpoint
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';

// Handle click on login button
document.getElementById('spotifyLogin').addEventListener('click', () => {
  const scopes = [
    'playlist-read-private',
    'playlist-read-collaborative'
  ];

  const url = `${SPOTIFY_AUTH_URL}?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes.join(' '))}`;

  window.location.href = url;
});

// --- After redirect, Spotify returns access_token in the URL hash ---
const hash = window.location.hash.substring(1); // remove "#"
const params = new URLSearchParams(hash);
const spotifyToken = params.get('access_token');

// If token exists, user is logged in!
if (spotifyToken) {
  document.getElementById('status').innerText = '✅ Logged in to Spotify!';
  console.log('Spotify token:', spotifyToken);
}
