const videoFilesInput = document.getElementById('videoFiles');
const videoCount = document.getElementById('videoCount');
const videoGrid = document.getElementById('videoGrid');
const videoEmptyState = document.getElementById('videoEmptyState');
const videoPlayerPanel = document.getElementById('videoPlayerPanel');
const videoPlayer = document.getElementById('videoPlayer');
const activeVideoTitle = document.getElementById('activeVideoTitle');
const videoStatus = document.getElementById('videoStatus');

const videos = new Map();
let nextVideoId = 0;
let activeVideoId = null;

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function updateVideoCount() {
  const count = videos.size;
  videoCount.textContent = `${count} ${count === 1 ? 'video' : 'videos'}`;
  videoEmptyState.hidden = count > 0;
}

function makeVideoCard(id, file) {
  const card = document.createElement('article');
  card.className = 'video-card';

  const artwork = document.createElement('div');
  artwork.className = 'video-card-art';
  artwork.setAttribute('aria-hidden', 'true');
  artwork.textContent = '▶';

  const content = document.createElement('div');
  content.className = 'video-card-content';

  const title = document.createElement('h3');
  title.textContent = file.name;

  const details = document.createElement('p');
  details.textContent = formatFileSize(file.size);

  const actions = document.createElement('div');
  actions.className = 'video-card-actions';

  const playButton = document.createElement('button');
  playButton.className = 'play-button';
  playButton.type = 'button';
  playButton.textContent = 'Play full video';
  playButton.addEventListener('click', () => playVideo(id));

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-video-button';
  removeButton.type = 'button';
  removeButton.textContent = 'Remove';
  removeButton.setAttribute('aria-label', `Remove ${file.name}`);
  removeButton.addEventListener('click', () => removeVideo(id));

  actions.append(playButton, removeButton);
  content.append(title, details, actions);
  card.append(artwork, content);
  return card;
}

function addVideo(file) {
  const id = nextVideoId++;
  const url = URL.createObjectURL(file);
  const card = makeVideoCard(id, file);
  videos.set(id, { file, url, card });
  videoGrid.append(card);
}

function playVideo(id) {
  const video = videos.get(id);
  if (!video) return;

  activeVideoId = id;
  videoPlayer.pause();
  videoPlayer.src = video.url;
  videoPlayerPanel.hidden = false;
  activeVideoTitle.textContent = video.file.name;
  videoStatus.textContent = 'Full video ready. Use the controls to play, seek, or enter fullscreen.';
  videoPlayer.load();
  videoPlayerPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function removeVideo(id) {
  const video = videos.get(id);
  if (!video) return;

  if (activeVideoId === id) {
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    videoPlayerPanel.hidden = true;
    activeVideoTitle.textContent = '';
    videoStatus.textContent = '';
    activeVideoId = null;
  }

  URL.revokeObjectURL(video.url);
  videos.delete(id);
  video.card.remove();
  updateVideoCount();
}

videoFilesInput.addEventListener('change', () => {
  for (const file of videoFilesInput.files) addVideo(file);
  videoFilesInput.value = '';
  updateVideoCount();
});

videoPlayer.addEventListener('error', () => {
  if (activeVideoId !== null) {
    videoStatus.textContent = 'This video could not be played by your browser. Try a video format supported by your browser, such as MP4 or WebM.';
  }
});

updateVideoCount();
