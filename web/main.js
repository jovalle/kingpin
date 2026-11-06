import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import './style.css';
import { prepare, prepareSlideshow } from './media.js';
import { slideshowFrame } from './slideshow.js';
import { createStatusParser } from './status.js';
import { clampOffset, previewPlacement } from './crop.js';
import { packetize } from './protocol.js';
import { requestBadge, sendPackets } from './bluetooth.js';

const uploadIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4"/><path d="M5 14v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4"/></svg>';
const bluetoothIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7l10 10-5 4V3l5 4L7 17"/></svg>';
document.querySelector('#app').innerHTML = `

<main><input id="file" type="file" accept="image/*,video/*" multiple hidden><div class="workspace"><button id="bluetooth-toggle" class="frame-control bluetooth-toggle" type="button" aria-label="Bluetooth settings" aria-controls="badge-settings" aria-expanded="false" title="Bluetooth settings">${bluetoothIcon}</button><button id="settings-toggle" class="frame-control settings-toggle" type="button" aria-label="Badge settings" aria-controls="badge-settings" aria-expanded="false" title="Badge settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h4m4 0h8M4 17h8m4 0h4"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="17" r="2"/></svg></button><aside id="badge-settings" class="badge-settings" aria-label="Badge information" hidden><div id="settings-view" class="device-panel"><h2>Ani-Pin</h2><div class="settings-status"><span>Status</span><strong id="settings-connection">Not connected</strong></div><div class="settings-status usage-label"><span>Usage</span><strong><span id="badge-used">Unknown</span> / <span id="badge-capacity">Unknown</span></strong></div><div id="usage-bar" class="usage-bar" role="progressbar" aria-label="Storage usage" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Storage usage unknown"><span id="usage-fill"></span></div><p id="badge-storage-note">Connect to see usage.</p></div><div id="bluetooth-view" class="device-panel" hidden><h2>Bluetooth</h2><p id="bluetooth-status">Not connected</p><div id="available"><button id="search" class="connect-icon" aria-label="Connect badge" title="Connect badge">${bluetoothIcon}</button><label class="show-all"><input id="show-all" type="checkbox"> Show all nearby devices</label></div><div id="unavailable" hidden><p>Open in a Bluetooth-enabled browser.</p><input id="page-address" readonly hidden><button id="copy-address" class="settings-action">Copy page address</button><button id="copy-flag" class="settings-action">Copy browser flag</button></div><button id="disconnect" class="disconnect-icon" aria-label="Disconnect badge" title="Disconnect badge" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 3v9M6.4 6.4a8 8 0 1 0 11.2 0"/></svg></button><p id="connection-status" class="dialog-status" role="status" aria-live="polite"></p></div></aside>
<section id="upload-view" class="upload-view workspace-card"><div class="device-frame"><div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="Connect badge"><span class="device-status" id="device-status" role="status" aria-live="polite">Not connected</span><span class="device-context" id="device-context">Tap to connect</span></div></div><div class="empty-details"><p>Zoom and position your image before sending it to your badge.</p><button type="button" id="browse-files" class="outline-button">Browse files</button><span class="browse-hint">Images, GIFs, videos, or multiple still images</span></div><p id="upload-error" class="status error" role="alert"></p></section>
<section id="preview-view" class="preview-view workspace-card" hidden><div class="preview-stage"><div class="device-frame"><svg class="transfer-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="47"/><circle id="ring-value" cx="50" cy="50" r="47" pathLength="100"/></svg><div class="transfer-readout" id="transfer-readout" aria-hidden="true" hidden></div><div class="device-overlay" id="device-overlay" hidden><span id="overlay-icon" aria-hidden="true">✓</span><strong id="overlay-title"></strong><span id="overlay-detail"></span></div><div class="badge-screen" id="crop-preview" tabindex="0" role="group" aria-label="Reposition image" aria-describedby="crop-help"><img draggable="false" id="preview-image" alt="Selected image on badge" hidden><img draggable="false" id="preview-next" alt="" aria-hidden="true" hidden><video id="preview-video" aria-label="Selected video on badge" muted playsinline loop hidden></video></div></div><details class="slideshow-label" id="slideshow-label" hidden><summary>Animation frames</summary><div id="slide-list"></div></details><div class="crop-controls"><div class="file-line"><span id="filedetails"></span><button class="text-button" id="change">Replace</button></div><div class="crop-row"><label for="zoom">Zoom</label><input id="zoom" type="range" min="1" max="2" step="0.01" value="1"><output id="zoom-value" for="zoom">100%</output><button type="button" class="crop-reset" id="crop-reset" aria-label="Reset image position and zoom" title="Reset image position and zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button></div><p class="crop-note" id="crop-help">Drag or use arrow keys to position</p></div></div><button id="send" class="primary transfer-action">Connect badge</button><div class="transfer-feedback"><div class="progress" id="progress-wrap" role="progressbar" aria-label="Transfer progress" aria-valuemin="0" aria-valuemax="100" hidden><div id="progress-bar"></div></div><p id="status" class="status" role="status" aria-live="polite"></p></div></section>
</div></main>

`;
const $ = (s) => document.querySelector(s);
let device = null,
  write = null,
  selected = null,
  previewURL = null,
  busy = false,
  connecting = false,
  cancelled = false,
  showSuccess = false,
  successTimer = null,
  slideshowFiles = null,
  slideshowURLs = [],
  slideTimer = null,
  slideIndex = 0,
  storageStats = null,
  statusParser = createStatusParser();
const image = $('#preview-image'),
  nextImage = $('#preview-next'),
  video = $('#preview-video'),
  cropPreview = $('#crop-preview');
let cropOffset = { x: 0, y: 0 },
  drag = null,
  pendingFiles = null;
function dimensions() {
  return image.hidden
    ? { width: video.videoWidth, height: video.videoHeight }
    : { width: image.naturalWidth, height: image.naturalHeight };
}
function updateCrop() {
  const { width, height } = dimensions();
  if (!width || !height) return;
  const zoom = Number($('#zoom').value);
  cropOffset = clampOffset(width, height, zoom, cropOffset);
  const placement = previewPlacement(width, height, zoom, cropOffset);
  const media = image.hidden ? video : image;
  function place(target, p) {
    target.style.width = `${p.width}%`;
    target.style.height = `${p.height}%`;
    target.style.left = `${p.x}%`;
    target.style.top = `${p.y}%`;
    target.style.transform = `translate(-50%, -50%) scale(${zoom})`;
  }
  place(media, placement);
  if (!nextImage.hidden && nextImage.naturalWidth && nextImage.naturalHeight)
    place(
      nextImage,
      previewPlacement(nextImage.naturalWidth, nextImage.naturalHeight, zoom, cropOffset),
    );
}
function moveCrop(dx, dy) {
  if (busy) return;
  cropOffset = { x: cropOffset.x + dx, y: cropOffset.y + dy };
  updateCrop();
}
image.addEventListener('load', updateCrop);
nextImage.addEventListener('load', updateCrop);
video.addEventListener('loadedmetadata', updateCrop);
function setStatus(message, error = false) {
  const el = $('#status');
  el.textContent = message;
  el.classList.toggle('error', error);
  if (error && !selected) {
    $('#device-status').textContent = 'File not supported';
    $('#device-context').textContent = 'Choose an image, GIF, or video';
  }
}
function setConnectionStatus(message, error = false) {
  const el = $('#connection-status');
  el.textContent = error ? 'Connection failed. Try again.' : message;
  el.title = error ? message : '';
  el.classList.toggle('error', error);
  if (error) {
    const noSelection = message.startsWith('No device selected');
    $('#device-status').textContent = noSelection ? 'No badge selected' : 'Couldn’t connect';
    $('#device-context').textContent = noSelection
      ? 'Tap to search again'
      : 'Check Bluetooth, then tap to retry';
  }
}
function supported() {
  return window.isSecureContext && !!navigator.bluetooth;
}
function clearSuccess() {
  clearTimeout(successTimer);
  successTimer = null;
  showSuccess = false;
}
function setProgress(phase, value = null) {
  const readout = $('#transfer-readout');
  readout.hidden = phase === 'sent';
  readout.textContent =
    value === null
      ? 'Preparing…'
      : `${phase === 'preparing' ? 'Preparing' : 'Sending'} ${Math.round(value)}%`;
  const ring = $('#ring-value');
  ring.style.strokeDashoffset =
    value === null ? '75' : String(100 - Math.max(0, Math.min(100, value)));
  ring.parentElement.classList.toggle('active', phase !== 'sent');
  ring.parentElement.classList.toggle('indeterminate', value === null);
  const el = $('#progress-wrap');
  el.dataset.phase = phase;
  el.setAttribute(
    'aria-label',
    phase === 'preparing'
      ? 'Preparing file'
      : phase === 'sent'
        ? 'Transfer sent'
        : 'Sending to badge',
  );
  if (value === null) {
    el.removeAttribute('aria-valuenow');
    $('#progress-bar').style.width = '';
  } else {
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    el.setAttribute('aria-valuenow', percent);
    $('#progress-bar').style.width = `${percent}%`;
  }
}
function state() {
  const connected = !!device?.gatt?.connected;
  if (!$('#connection-status').classList.contains('error')) {
    $('#device-status').textContent = connecting
      ? 'Connecting…'
      : connected
        ? 'Add an image, GIF, or video'
        : 'Not connected';
    $('#device-context').textContent = connected
      ? 'Drag & drop or click to browse'
      : 'Tap to connect';
  }
  $('#dropzone').setAttribute('aria-label', connected ? 'Choose or drop a file' : 'Connect badge');
  $('#settings-connection').textContent = connecting
    ? 'Connecting…'
    : connected
      ? 'Connected'
      : 'Not connected';
  $('#bluetooth-status').textContent = connecting
    ? 'Connecting…'
    : connected
      ? device.name || 'Connected'
      : 'Not connected';
  $('#bluetooth-toggle').dataset.status = connecting
    ? 'connecting'
    : connected
      ? 'connected'
      : 'disconnected';
  $('#send').textContent = busy
    ? cancelled
      ? 'Stopping…'
      : 'Stop transfer'
    : connected
      ? 'Send'
      : 'Connect to send';
  $('#send').disabled = busy && cancelled;
  $('#send').classList.toggle('is-cancel', busy);
  $('#search').disabled = connecting || busy;
  $('#search').setAttribute('aria-label', connecting ? 'Connecting…' : 'Connect badge');
  $('#available').hidden = connected || !supported();
  $('#unavailable').hidden = connected || supported();
  $('#disconnect').hidden = !connected;
  $('#disconnect').disabled = busy;
  $('#change').disabled = busy;
  $('#slideshow-label').inert = busy;
  $('#zoom').disabled = busy;
  $('#crop-reset').disabled = busy;
  cropPreview.setAttribute('aria-disabled', String(busy));
}
function renderStorage() {
  const format = (n) => `${(n / 1048576).toFixed(2).replace(/\.00$/, '')} MiB`;
  $('#badge-capacity').textContent = storageStats ? format(storageStats.totalBytes) : 'Unknown';
  $('#badge-used').textContent = storageStats ? format(storageStats.usedBytes) : 'Unknown';
  const bar = $('#usage-bar');
  const percent =
    storageStats && storageStats.totalBytes > 0
      ? Math.max(0, Math.min(100, (storageStats.usedBytes / storageStats.totalBytes) * 100))
      : null;
  $('#usage-fill').style.width = percent === null ? '0%' : `${percent}%`;
  if (percent === null) {
    bar.removeAttribute('aria-valuenow');
    bar.setAttribute('aria-valuetext', 'Storage usage unknown');
  } else {
    bar.setAttribute('aria-valuenow', String(Math.round(percent)));
    bar.setAttribute('aria-valuetext', `${Math.round(percent)}% used`);
  }
  $('#badge-storage-note').textContent = storageStats
    ? `${format(storageStats.freeBytes)} free`
    : device?.gatt?.connected
      ? 'Waiting for storage data.'
      : 'Connect to see usage.';
}
function disconnect() {
  clearSuccess();
  storageStats = null;
  statusParser = createStatusParser();
  renderStorage();
  write = null;
  device = null;
  renderStorage();
  if (busy) setStatus('Badge disconnected during transfer.', true);
  setConnectionStatus('');
  state();
}
let activePanel = null;
function openConnection() {
  if (supported()) {
    $('#search').click();
    return;
  }
  openSettings('bluetooth');
}
function openSettings(view = 'settings') {
  activePanel = view;
  $('#badge-settings').hidden = false;
  $('#settings-view').hidden = view !== 'settings';
  $('#bluetooth-view').hidden = view !== 'bluetooth';
  $('#badge-settings').setAttribute(
    'aria-label',
    view === 'settings' ? 'Badge information' : 'Bluetooth settings',
  );
  $('#settings-toggle').setAttribute('aria-expanded', String(view === 'settings'));
  $('#bluetooth-toggle').setAttribute('aria-expanded', String(view === 'bluetooth'));
  $('#settings-toggle').setAttribute(
    'aria-label',
    view === 'settings' ? 'Close badge settings' : 'Badge settings',
  );
  $('#bluetooth-toggle').setAttribute(
    'aria-label',
    view === 'bluetooth' ? 'Close Bluetooth settings' : 'Bluetooth settings',
  );
  $('#page-address').value = location.href;
  state();
}
function closeSettings() {
  activePanel = null;
  $('#badge-settings').hidden = true;
  $('#settings-toggle').setAttribute('aria-expanded', 'false');
  $('#bluetooth-toggle').setAttribute('aria-expanded', 'false');
  $('#settings-toggle').setAttribute('aria-label', 'Badge settings');
  $('#bluetooth-toggle').setAttribute('aria-label', 'Bluetooth settings');
}
for (const [selector, view] of [
  ['#settings-toggle', 'settings'],
  ['#bluetooth-toggle', 'bluetooth'],
])
  $(selector).addEventListener('click', () =>
    activePanel === view ? closeSettings() : openSettings(view),
  );
document.addEventListener('click', (e) => {
  if (activePanel && !e.target.closest('#badge-settings, #settings-toggle, #bluetooth-toggle'))
    closeSettings();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activePanel) {
    const button = activePanel === 'settings' ? '#settings-toggle' : '#bluetooth-toggle';
    closeSettings();
    $(button).focus();
  }
});
$('#copy-address').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    setConnectionStatus('Address copied.');
  } catch {
    $('#page-address').select();
    setConnectionStatus('Copy the selected address and open it in Chrome or Edge.');
  }
});
$('#copy-flag').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(
      'chrome://flags/#enable-experimental-web-platform-features',
    );
    setConnectionStatus('Flag address copied.');
  } catch {
    setConnectionStatus('Copy the flag address shown above.', true);
  }
});

$('#disconnect').addEventListener('click', () => device?.gatt?.disconnect());
$('#search').addEventListener('click', async () => {
  if (connecting || !supported()) return;
  clearSuccess();
  storageStats = null;
  statusParser = createStatusParser();
  connecting = true;
  setConnectionStatus('');
  state();
  try {
    const connected = await requestBadge(
      navigator.bluetooth,
      (chosen) => {
        device = chosen;
        device.addEventListener('gattserverdisconnected', disconnect, { once: true });
        state();
      },
      {
        showAll: $('#show-all').checked,
        onNotification: (value) => {
          if (!device?.gatt?.connected) return;
          for (const stats of statusParser.push(value)) {
            storageStats = stats;
            renderStorage();
          }
        },
      },
    );
    if (!connected.device.gatt.connected) throw Error('Badge disconnected');
    device = connected.device;
    write = connected.write;
    renderStorage();
    setConnectionStatus('');
    showSuccess = true;
    $('#device-status').textContent = '✓';
    $('#device-context').textContent = 'Connected';
    $('#dropzone').classList.add('success');
    closeSettings();
    successTimer = setTimeout(() => {
      clearSuccess();
      $('#dropzone').classList.remove('success');
      state();
      if (pendingFiles) {
        const files = pendingFiles;
        pendingFiles = null;
        selectFiles(files);
      }
    }, 1400);
  } catch (e) {
    pendingFiles = null;
    if (device?.gatt?.connected) device.gatt.disconnect();
    device = null;
    write = null;
    storageStats = null;
    renderStorage();
    const message =
      e.name === 'NotFoundError'
        ? 'No device selected. Press the badge’s Bluetooth button and search again.'
        : `Could not connect: ${e.message}. Make sure the badge is in Bluetooth mode and disconnected from your phone.`;
    setConnectionStatus(message, true);
  } finally {
    connecting = false;
    if (!showSuccess) state();
  }
});
function selectFile(file) {
  if (!file) return;
  stopSlideshow();
  slideshowFiles = null;
  $('#slideshow-label').hidden = true;
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    setStatus('Choose an image, GIF, or video.', true);
    $('#upload-error').textContent = 'Choose an image, GIF, or video.';
    return;
  }
  selected = file;
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = URL.createObjectURL(file);
  const isVideo = file.type.startsWith('video/');
  video.pause();
  video.hidden = !isVideo;
  image.hidden = isVideo;
  if (isVideo) {
    video.src = previewURL;
    video.play().catch(() => {});
  } else image.src = previewURL;
  $('#filedetails').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  $('#upload-view').hidden = true;
  $('#preview-view').hidden = false;
  $('#zoom').value = 1;
  $('#zoom-value').textContent = '100%';
  cropOffset = { x: 0, y: 0 };
  updateCrop();
  $('#progress-wrap').hidden = true;
  setStatus('');
  state();
}

function stopSlideshow() {
  clearInterval(slideTimer);
  slideTimer = null;
  nextImage.hidden = true;
  nextImage.style.opacity = '0';
  slideshowURLs.forEach((url) => URL.revokeObjectURL(url));
  slideshowURLs = [];
}
function selectFiles(files) {
  $('#upload-error').textContent = '';
  if (files.length < 2) {
    selectFile(files[0]);
    return;
  }
  if (
    files.length > 30 ||
    files.some((f) => !f.type.startsWith('image/') || f.type === 'image/gif')
  ) {
    const message = 'Choose 2–30 still images, or one GIF or video.';
    setStatus(message, true);
    $('#upload-error').textContent = message;
    return;
  }
  selectFile(files[0]);
  slideshowFiles = files;
  slideshowURLs = files.map((file) => URL.createObjectURL(file));
  slideIndex = 0;
  image.src = slideshowURLs[0];
  $('#filedetails').textContent = `${files.length} images · ${files.length * 2} seconds`;
  $('#slideshow-label').hidden = false;
  $('#slideshow-label').open = false;
  nextImage.hidden = false;
  slideIndex = 0;
  renderSlides();
  slideTimer = setInterval(() => {
    if (!slideshowFiles || busy) return;
    slideIndex = (slideIndex + 1) % (slideshowURLs.length * 20);
    const frame = slideshowFrame(slideIndex, slideshowURLs.length);
    if (image.src !== slideshowURLs[frame.image]) image.src = slideshowURLs[frame.image];
    if (nextImage.src !== slideshowURLs[frame.next]) nextImage.src = slideshowURLs[frame.next];
    nextImage.style.opacity = frame.alpha;
  }, 100);
}
function renderSlides() {
  const list = $('#slide-list');
  list.replaceChildren();
  slideshowFiles.forEach((file, index) => {
    const row = document.createElement('div');
    row.className = 'slide-item';
    const name = document.createElement('span');
    name.textContent = file.name;
    row.append(name);
    for (const [symbol, delta] of [
      ['↑', -1],
      ['↓', 1],
      ['×', 0],
    ]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = symbol;
      b.setAttribute(
        'aria-label',
        delta === 0 ? `Remove ${file.name}` : `Move ${file.name} ${delta < 0 ? 'up' : 'down'}`,
      );
      b.disabled =
        delta < 0
          ? index === 0
          : delta > 0
            ? index === slideshowFiles.length - 1
            : slideshowFiles.length <= 2;
      b.addEventListener('click', () => {
        const files = [...slideshowFiles];
        if (delta === 0) files.splice(index, 1);
        else [files[index], files[index + delta]] = [files[index + delta], files[index]];
        const oldZoom = $('#zoom').value,
          oldOffset = { ...cropOffset };
        selectFiles(files);
        $('#zoom').value = oldZoom;
        $('#zoom-value').textContent = `${Math.round(Number(oldZoom) * 100)}%`;
        cropOffset = oldOffset;
        updateCrop();
        $('#slideshow-label').open = true;
      });
      row.append(b);
    }
    list.append(row);
  });
}
$('#file').addEventListener('change', (e) => selectFiles([...e.target.files]));
$('#browse-files').addEventListener('click', () => $('#file').click());
$('#change').addEventListener('click', () => {
  const input = $('#file');
  input.value = '';
  input.click();
});
function activateDevice() {
  if (connecting || busy || showSuccess) return;
  if (device?.gatt?.connected) {
    $('#file').value = '';
    $('#file').click();
  } else if (supported()) $('#search').click();
  else openConnection();
}
$('#dropzone').addEventListener('click', activateDevice);
$('#dropzone').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    activateDevice();
  }
});
for (const type of ['dragenter', 'dragover'])
  $('#dropzone').addEventListener(type, (e) => {
    e.preventDefault();
    $('#dropzone').classList.add('dragging');
  });
for (const type of ['dragleave', 'drop'])
  $('#dropzone').addEventListener(type, (e) => {
    e.preventDefault();
    $('#dropzone').classList.remove('dragging');
  });
$('#dropzone').addEventListener('drop', (e) => {
  if (device?.gatt?.connected) selectFiles([...e.dataTransfer.files]);
  else {
    pendingFiles = [...e.dataTransfer.files];
    activateDevice();
  }
});
for (const type of ['dragenter', 'dragover'])
  cropPreview.addEventListener(type, (e) => {
    e.preventDefault();
    if (!busy) cropPreview.classList.add('dragging');
  });
for (const type of ['dragleave', 'drop'])
  cropPreview.addEventListener(type, (e) => {
    e.preventDefault();
    cropPreview.classList.remove('dragging');
  });
cropPreview.addEventListener('drop', (e) => {
  if (!busy) selectFiles([...e.dataTransfer.files]);
});
$('#zoom').addEventListener('input', () => {
  const z = Number($('#zoom').value);
  $('#zoom-value').textContent = `${Math.round(z * 100)}%`;
  updateCrop();
});
cropPreview.addEventListener('pointerdown', (e) => {
  if (busy || e.button !== 0) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  cropPreview.setPointerCapture(e.pointerId);
  cropPreview.classList.add('is-dragging');
});
cropPreview.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const size = cropPreview.clientWidth;
  if (size) moveCrop((e.clientX - drag.x) / size, (e.clientY - drag.y) / size);
  drag.x = e.clientX;
  drag.y = e.clientY;
});
function endDrag(e) {
  if (drag?.id !== e.pointerId) return;
  drag = null;
  cropPreview.classList.remove('is-dragging');
}
cropPreview.addEventListener('pointerup', endDrag);
cropPreview.addEventListener('pointercancel', endDrag);
cropPreview.addEventListener('lostpointercapture', endDrag);
cropPreview.addEventListener('keydown', (e) => {
  const step = e.shiftKey ? 0.1 : 0.025;
  const moves = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  if (!moves[e.key] || busy) return;
  e.preventDefault();
  moveCrop(...moves[e.key]);
});
$('#crop-reset').addEventListener('click', () => {
  cropOffset = { x: 0, y: 0 };
  $('#zoom').value = 1;
  $('#zoom-value').textContent = '100%';
  updateCrop();
});
$('#send').addEventListener('click', async () => {
  if (busy) {
    if (!cancelled) {
      cancelled = true;
      setStatus('Stopping…');
      state();
    }
    return;
  }
  if (!selected) return;
  if (!device?.gatt?.connected || !write) {
    openConnection();
    return;
  }
  busy = true;
  cancelled = false;
  state();
  $('#progress-wrap').hidden = false;
  setProgress('preparing');
  try {
    setStatus('Preparing…');
    const converter = slideshowFiles ? prepareSlideshow : prepare;
    const result = await converter(
      slideshowFiles || selected,
      Number($('#zoom').value),
      (n, total) => {
        if (cancelled) throw Error('Preparation cancelled');
        setProgress('preparing', (n / total) * 100);
        setStatus(`Preparing… ${Math.floor((n / total) * 100)}%`);
      },
      { ...cropOffset },
    );
    if (cancelled) throw Error('Preparation cancelled');
    const chunks = packetize(result.kind, result.message);
    setProgress('sending', 0);
    await sendPackets(write, chunks, {
      isCancelled: () => cancelled,
      isConnected: () => !!device?.gatt?.connected,
      onProgress: (n, total) => {
        if (!cancelled && (n % 10 === 0 || n === total)) {
          setProgress('sending', (n / total) * 100);
          setStatus(`Sending… ${Math.round((n / total) * 100)}%`);
        }
      },
    });
    if (cancelled) throw Error('Transfer stopped. Check your badge.');
    setProgress('sent', 100);
    setStatus('Sent. Check your badge.');
    $('#overlay-title').textContent = 'Sent';
    $('#overlay-detail').textContent = 'Check your badge';
    $('#device-overlay').hidden = false;
    setTimeout(() => {
      if (busy) return;
      $('#device-overlay').hidden = true;
      stopSlideshow();
      slideshowFiles = null;
      selected = null;
      if (previewURL) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
      }
      video.pause();
      $('#preview-view').hidden = true;
      $('#upload-view').hidden = false;
      $('#progress-wrap').hidden = true;
      setStatus('');
      state();
      $('#device-status').textContent = 'Add an image, GIF, or video';
      $('#device-context').textContent = 'Drag & drop or click to browse';
    }, 1800);
  } catch (e) {
    $('#progress-wrap').hidden = true;
    $('#transfer-readout').hidden = true;
    $('#ring-value').parentElement.classList.remove('active');
    setStatus(e.message || 'Could not send file.', true);
  } finally {
    busy = false;
    state();
  }
});
state();
