const videoFilesInput = document.getElementById('videoFiles');
const videoCount = document.getElementById('videoCount');
const videoGrid = document.getElementById('videoGrid');
const videoEmptyState = document.getElementById('videoEmptyState');
const videoPlayerPanel = document.getElementById('videoPlayerPanel');
const videoPlayer = document.getElementById('videoPlayer');
const youtubePlayerContainer = document.getElementById('youtubePlayerContainer');
const activeVideoTitle = document.getElementById('activeVideoTitle');
const videoStatus = document.getElementById('videoStatus');
const youtubeForm = document.getElementById('youtubeForm');
const youtubeUrlInput = document.getElementById('youtubeUrl');
const youtubeStatus = document.getElementById('youtubeStatus');

const videos = new Map();
const youtubeVideos = new Map();
let nextVideoId = 0;
let activeVideoId = null;
let activeVideoType = null;

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function updateVideoCount() {
  const count = videos.size + youtubeVideos.size;
  videoCount.textContent = `${count} ${count === 1 ? 'video' : 'videos'}`;
  videoEmptyState.hidden = count > 0;
}

function makeVideoCard(id, titleText, detailsText, playText, playHandler, removeHandler) {
  const card = document.createElement('article');
  card.className = 'video-card';

  const artwork = document.createElement('div');
  artwork.className = 'video-card-art';
  artwork.setAttribute('aria-hidden', 'true');
  artwork.textContent = '▶';

  const content = document.createElement('div');
  content.className = 'video-card-content';

  const title = document.createElement('h3');
  title.textContent = titleText;

  const details = document.createElement('p');
  details.textContent = detailsText;

  const actions = document.createElement('div');
  actions.className = 'video-card-actions';

  const playButton = document.createElement('button');
  playButton.className = 'play-button';
  playButton.type = 'button';
  playButton.textContent = playText;
  playButton.addEventListener('click', playHandler);

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-video-button';
  removeButton.type = 'button';
  removeButton.textContent = 'Remove';
  removeButton.setAttribute('aria-label', `Remove ${titleText}`);
  removeButton.addEventListener('click', removeHandler);

  actions.append(playButton, removeButton);
  content.append(title, details, actions);
  card.append(artwork, content);
  return card;
}

function addVideo(file) {
  const id = nextVideoId++;
  const url = URL.createObjectURL(file);
  const card = makeVideoCard(id, file.name, formatFileSize(file.size), 'Play full video', () => playVideo(id), () => removeVideo(id));
  videos.set(id, { file, url, card });
  videoGrid.append(card);
}

function getYouTubeVideoId(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const allowedHosts = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
  ]);
  if (!allowedHosts.has(url.hostname.toLowerCase())) return null;

  let videoId = null;
  if (url.hostname.toLowerCase() === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0];
  } else if (url.pathname === '/watch') {
    videoId = url.searchParams.get('v');
  } else {
    videoId = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null;
  }

  return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
}

function addYouTubeVideo(videoId) {
  if ([...youtubeVideos.values()].some((video) => video.videoId === videoId)) {
    youtubeStatus.textContent = 'That YouTube video is already in your library.';
    return;
  }

  const id = nextVideoId++;
  const title = `YouTube video (${videoId})`;
  const card = makeVideoCard(
    id,
    title,
    'YouTube embed · Creator settings apply',
    'Play YouTube video',
    () => playYouTubeVideo(id),
    () => removeYouTubeVideo(id),
  );
  youtubeVideos.set(id, { videoId, title, card });
  videoGrid.append(card);
  updateVideoCount();
  youtubeStatus.textContent = 'YouTube video added. It will load from YouTube when you choose Play.';
}

function clearActivePlayer() {
  videoPlayer.pause();
  videoPlayer.removeAttribute('src');
  videoPlayer.load();
  videoPlayer.hidden = true;
  youtubePlayerContainer.replaceChildren();
  youtubePlayerContainer.hidden = true;
}

function playVideo(id) {
  const video = videos.get(id);
  if (!video) return;

  clearActivePlayer();
  activeVideoId = id;
  activeVideoType = 'local';
  videoPlayer.hidden = false;
  videoPlayer.src = video.url;
  videoPlayerPanel.hidden = false;
  activeVideoTitle.textContent = video.file.name;
  videoStatus.textContent = 'Full video ready. Use the controls to play, seek, or enter fullscreen.';
  videoPlayer.load();
  videoPlayerPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function playYouTubeVideo(id) {
  const video = youtubeVideos.get(id);
  if (!video) return;

  clearActivePlayer();
  activeVideoId = id;
  activeVideoType = 'youtube';
  videoPlayerPanel.hidden = false;
  activeVideoTitle.textContent = video.title;
  videoStatus.textContent = 'Playback is provided by YouTube. Embedding and availability depend on the video owner and YouTube.';

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0&playsinline=1`;
  iframe.title = video.title;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.loading = 'lazy';
  youtubePlayerContainer.append(iframe);
  youtubePlayerContainer.hidden = false;
  videoPlayerPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearActiveVideo(id, type) {
  if (activeVideoId !== id || activeVideoType !== type) return;

  clearActivePlayer();
  videoPlayerPanel.hidden = true;
  activeVideoTitle.textContent = '';
  videoStatus.textContent = '';
  activeVideoId = null;
  activeVideoType = null;
}

function removeVideo(id) {
  const video = videos.get(id);
  if (!video) return;

  clearActiveVideo(id, 'local');
  URL.revokeObjectURL(video.url);
  videos.delete(id);
  video.card.remove();
  updateVideoCount();
}

function removeYouTubeVideo(id) {
  const video = youtubeVideos.get(id);
  if (!video) return;

  clearActiveVideo(id, 'youtube');
  youtubeVideos.delete(id);
  video.card.remove();
  updateVideoCount();
}

videoFilesInput.addEventListener('change', () => {
  for (const file of videoFilesInput.files) addVideo(file);
  videoFilesInput.value = '';
  updateVideoCount();
});

youtubeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const videoId = getYouTubeVideoId(youtubeUrlInput.value.trim());
  if (!videoId) {
    youtubeStatus.textContent = 'Enter a valid YouTube video link (youtube.com or youtu.be).';
    youtubeUrlInput.focus();
    return;
  }

  addYouTubeVideo(videoId);
  youtubeForm.reset();
});

videoPlayer.addEventListener('error', () => {
  if (activeVideoType === 'local') {
    videoStatus.textContent = 'This video could not be played by your browser. Try a video format supported by your browser, such as MP4 or WebM.';
  }
});

updateVideoCount();
