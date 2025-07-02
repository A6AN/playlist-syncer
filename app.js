// 🔒 Client IDs
const CLIENT_ID = '329e873b7a9f45a4a8128770e084e27c'; // Spotify
const GOOGLE_CLIENT_ID = '751979399141-3o00olt73hd46o4c6695g1cv0d3ieab1.apps.googleusercontent.com'; // Google OAuth

// 🔗 Redirect URIs and Scopes
const REDIRECT_URI = 'https://a6an.github.io/playlist-syncer/';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/userinfo.profile';

// --- Step 1: PKCE for Spotify ---
function generateCodeVerifier(length = 128) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(x => chars[x % chars.length])
    .join('');
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// --- Step 2: Spotify Login ---
document.getElementById('spotifyLogin').addEventListener('click', async () => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem('verifier', verifier);

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

// --- Step 3: YouTube Login ---
document.getElementById('googleLogin').addEventListener('click', () => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: GOOGLE_SCOPES,
    include_granted_scopes: 'true'
  });

  window.location = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
});

// --- Step 4: Handle Redirect ---
async function handleRedirect() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  // Spotify PKCE
  if (searchParams.has('code')) {
    const code = searchParams.get('code');
    const verifier = localStorage.getItem('verifier');

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
      console.log('🟢 Spotify token:', data.access_token);
      fetchPlaylists(data.access_token);
    } else {
      console.error('❌ Spotify token error:', data);
      document.getElementById('status').innerText = '❌ Spotify login failed';
    }

    history.replaceState(null, '', REDIRECT_URI);
  }

  // YouTube Token
  if (hashParams.has('access_token')) {
    const ytToken = hashParams.get('access_token');
    localStorage.setItem('google_token', ytToken);
    document.getElementById('status').innerText += '\n✅ Logged in to YouTube!';
    console.log('🔴 YouTube token:', ytToken);
    history.replaceState(null, '', REDIRECT_URI);
  }
}

handleRedirect();

// --- Step 5: Fetch & Display Spotify Playlists ---
async function fetchPlaylists(token) {
  const res = await fetch('https://api.spotify.com/v1/me/playlists', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('🎶 Your playlists:', data);

  const container = document.getElementById('playlists');
  container.innerHTML = '';

  data.items.forEach(playlist => {
    const html = `
      <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 8px; max-width: 400px;">
        <label style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" class="playlist-checkbox" data-id="${playlist.id}" data-name="${playlist.name}" />
          <strong>${playlist.name}</strong>
        </label>
        <img src="${playlist.images[0]?.url || ''}" alt="Playlist cover" style="width: 100%; max-width: 300px; border-radius: 6px; margin-top: 10px;">
        <p>👤 ${playlist.owner.display_name} | 🎵 ${playlist.tracks.total} tracks</p>
        <a href="${playlist.external_urls.spotify}" target="_blank" style="color: #1DB954;">Open in Spotify →</a>
      </div>
    `;
    container.innerHTML += html;
  });

  document.getElementById('syncSelected').style.display = 'block';
}

// --- Step 6: Sync Selected Playlists ---
document.getElementById('syncSelected').addEventListener('click', handleSyncSelected);

async function handleSyncSelected() {
  const checkboxes = document.querySelectorAll('.playlist-checkbox:checked');
  const selected = Array.from(checkboxes).map(cb => ({
    id: cb.dataset.id,
    name: cb.dataset.name
  }));

  if (selected.length === 0) {
    alert('Please select at least one playlist.');
    return;
  }

  const token = localStorage.getItem('spotify_token');
  const googleToken = localStorage.getItem('google_token');
  if (!token || !googleToken) {
    alert('Please log into both Spotify and YouTube first.');
    return;
  }

  for (const playlist of selected) {
    const tracks = await getSpotifyTracks(playlist.id, token);
    console.log(`🎵 Tracks from "${playlist.name}":`, tracks);

    const ytPlaylistId = await createYouTubePlaylist(playlist.name, googleToken);
    console.log(`📺 Created YouTube playlist: ${ytPlaylistId}`);

    for (const track of tracks.slice(0, 10)) {
      const searchQuery = `${track.name} ${track.artists}`;
      const result = await searchYouTubeTrack(searchQuery, googleToken);

      if (result) {
        console.log(`🎯 Adding to YouTube: ${result.title}`);
        await addToYouTubePlaylist(ytPlaylistId, result.videoId, googleToken);
      } else {
        console.warn(`❌ No YouTube result for ${searchQuery}`);
      }
    }

    alert(`✅ Synced "${playlist.name}" to YouTube!`);
  }
}

// --- Helper: Get Tracks from Spotify Playlist ---
async function getSpotifyTracks(playlistId, token) {
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
  const tracks = [];

  let next = url;
  while (next) {
    const res = await fetch(next, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();

    data.items.forEach(item => {
      const track = item.track;
      if (track) {
        tracks.push({
          name: track.name,
          artists: track.artists.map(a => a.name).join(', ')
        });
      }
    });

    next = data.next;
  }

  return tracks;
}

// --- Helper: Search YouTube Track ---
async function searchYouTubeTrack(query, googleToken) {
  const params = new URLSearchParams({
    part: 'snippet',
    maxResults: 1,
    q: query,
    type: 'video'
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${googleToken}`,
      Accept: 'application/json'
    }
  });

  const data = await res.json();
  if (data.items && data.items.length > 0 && data.items[0].id.videoId) {
    const video = data.items[0];
    return {
      videoId: video.id.videoId,
      title: video.snippet.title,
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`
    };
  } else {
    return null;
  }
}

// --- Helper: Create YT Playlist ---
async function createYouTubePlaylist(title, googleToken) {
  const res = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${googleToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        title,
        description: `Synced from Spotify: ${title}`
      },
      status: {
        privacyStatus: 'private'
      }
    })
  });

  const data = await res.json();
  return data.id;
}

// --- Helper: Add Video to YT Playlist ---
async function addToYouTubePlaylist(playlistId, videoId, googleToken) {
  await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${googleToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId
        }
      }
    })
  });
}
