// ✅ Your Spotify Client ID
const SPOTIFY_CLIENT_ID = '329e873b7a9f45a4a8128770e084e27c';

// ✅ Your Redirect URI from Spotify Dashboard
const REDIRECT_URI = 'https://a6an.github.io/playlist-syncer/';

// Spotify Authorization Endpoint
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';

// ✅ Debug: Confirm JS is loading
console.log('✅ app.js loaded');

// 🔘 Add event listener to Spotify login button
const spotifyLoginButton = document.getElementById('spotifyLogin');

if (spotifyLoginButton) {
  spotifyLoginButton.addEventListener('click', () => {
    console.log('🎵 Spotify login button clicked');

    const scopes = [
      'playlist-read-private',
      'playlist-read-collaborative'
    ];

    const authUrl = `${SPOTIFY_AUTH_URL}?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes.join(' '))}`;

    console.log('🔗 Redirecting to:', authUrl);
    window.location.href = authUrl;
  });
} else {
  console.error('❌ Could not find the #spotifyLogin button in the DOM');
}

// ✅ Handle access token after redirect
// --- After redirect, Spotify returns access_token in the URL hash ---
window.addEventListener('load', () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const spotifyToken = params.get('access_token');

  if (spotifyToken) {
    // ✅ Save token in localStorage so it stays on reload
    localStorage.setItem('spotify_token', spotifyToken);
    document.getElementById('status').innerText = '✅ Logged in to Spotify!';
    console.log('🟢 Spotify access token:', spotifyToken);

    // Clean up the URL by removing the token from the hash
    history.replaceState(null, '', window.location.pathname);
  } else {
    // Try to load from localStorage
    const savedToken = localStorage.getItem('spotify_token');
    if (savedToken) {
      document.getElementById('status').innerText = '✅ Logged in to Spotify (from saved token)';
      console.log('🟢 Reusing saved token:', savedToken);
    } else {
      console.log('ℹ️ No access token found in URL or storage');
    }
  }
});

