// ── Location data with direct go2rtc server mappings ──

const LOCATIONS = {
  ghaziabad: {
    name: "Ghaziabad CPLI",
    serverUrl: "https://stream.aacctrust.in",
    cameras: [
      { id: "cam1", name: "CAM 01" },
      { id: "cam3", name: "CAM 02" },
    ],
  },
  hapur: {
    name: "Hapur IRCA",
    serverUrl: "https://cameras.aacctrust.in",
    cameras: [
      { id: "camera1", name: "CAM 01" },
      { id: "camera2", name: "CAM 02", h265: true },
      { id: "camera3", name: "CAM 03", h265: true },
      { id: "camera4", name: "CAM 04", h265: true },
      { id: "camera8", name: "CAM 05" },
      { id: "camera10", name: "CAM 06", h265: true },
      { id: "camera11", name: "CAM 07", h265: true },
    ],
  },
  shamli: {
    name: "Shamli DDAC",
    serverUrl: "https://shamli-cctv.aacctrust.in",
    cameras: [
      { id: "camera1", name: "CAM 01", h265: true },
      { id: "camera2", name: "CAM 02", h265: true },
      { id: "camera5", name: "CAM 03", h265: true },
      { id: "camera9", name: "CAM 04", h265: true },
      { id: "camera10", name: "CAM 05", h265: true },
      { id: "camera12", name: "CAM 06", h265: true },
      { id: "camera13", name: "CAM 07", h265: true },
      { id: "camera14", name: "CAM 08", h265: true },
    ],
  },
};

// ── State ──

let currentLocation = null;
let currentCameras = [];
const state = {};

// ── Browser Capability Detection ──

function browserSupportsH265() {
  try {
    const video = document.createElement("video");
    return !!(
      video.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') ||
      video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"')
    );
  } catch (e) {
    return false;
  }
}

function shouldTranscodeCamera(cam) {
  return cam && cam.h265 && !browserSupportsH265();
}

// ── Helpers ──

function formatDT(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yy}  ${hh}:${mi}:${ss}`;
}

function updateClock() {
  const headerTime = document.getElementById("headerTime");
  if (headerTime) {
    headerTime.textContent = formatDT(new Date());
  }
}
setInterval(updateClock, 1000);
updateClock();

function updateFrameTime(camId) {
  if (state[camId]) {
    state[camId].lastFrame = new Date();
  }
}

function tickFrameTimes() {
  currentCameras.forEach((cam) => {
    const s = state[cam.id];
    const el = document.getElementById(`time-${cam.id}`);
    if (s && s.lastFrame && el) {
      el.textContent = formatDT(s.lastFrame);
    }
  });
}
setInterval(tickFrameTimes, 1000);

// ── Cleanup ──

function cleanup(camId) {
  const tile = document.getElementById(`tile-${camId}`);
  if (tile) {
    const iframe = tile.querySelector("iframe");
    if (iframe) {
      iframe.src = "about:blank";
      iframe.remove();
    }
  }
}

// ── Start stream utilizing go2rtc official stream.html player ──

function startStream(camId) {
  const tile = document.getElementById(`tile-${camId}`);
  if (!tile) return;

  // Clear previous iframe if any
  const oldIframe = tile.querySelector("iframe");
  if (oldIframe) {
    oldIframe.src = "about:blank";
    oldIframe.remove();
  }

  const loc = currentLocation;
  const config = LOCATIONS[loc];
  if (!config) return;

  const cam = config.cameras.find((c) => c.id === camId);
  const useTranscoded = shouldTranscodeCamera(cam);
  const targetSrc = useTranscoded ? `${camId}_h264` : camId;
  const streamUrl = `${config.serverUrl}/stream.html?src=${encodeURIComponent(targetSrc)}`;

  const iframe = document.createElement("iframe");
  iframe.src = streamUrl;
  iframe.allow = "autoplay; encrypted-media; fullscreen";
  iframe.setAttribute("allowfullscreen", "");
  iframe.setAttribute("loading", "lazy");
  iframe.title = `${camId} - ${config.name}`;
  iframe.style.width = "100%";
  iframe.style.height = "calc(100% + 54px)";
  iframe.style.border = "none";
  iframe.style.background = "#000";
  iframe.style.position = "absolute";
  iframe.style.top = "-6px";
  iframe.style.left = "0";

  // Insert iframe before the overlay
  tile.insertBefore(iframe, tile.querySelector(".cam-overlay"));
  
  const el = document.getElementById(`status-${camId}`);
  if (el) {
    el.className = "badge badge-live";
    el.textContent = "CONNECTED";
  }
  
  updateFrameTime(camId);
}

// ── Grid layout ──

function getGridColClass(cameraCount) {
  if (cameraCount <= 2) return "cols-2";
  if (cameraCount <= 4) return "cols-2";
  return "cols-3";
}

function applyGridLayout(grid, cameraCount) {
  grid.classList.remove("cols-2", "cols-3", "cols-4");

  if (window.innerWidth <= 900) return;

  grid.classList.add(getGridColClass(cameraCount));
  const cols = cameraCount <= 4 ? 2 : 3;
  const rows = Math.ceil(cameraCount / cols);
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
}

// ── Render camera grid for a location ──

function renderGrid(locationKey) {
  const location = LOCATIONS[locationKey];
  if (!location) return;

  // Cleanup previous streams
  currentCameras.forEach((cam) => {
    cleanup(cam.id);
  });

  currentLocation = locationKey;
  currentCameras = location.cameras;

  const grid = document.getElementById("grid");
  if (!grid) return;

  // Clear old tiles
  grid.innerHTML = "";
  grid.style.gridTemplateRows = "";

  // Apply layout
  applyGridLayout(grid, currentCameras.length);

  // Create tiles containing the iframe player
  currentCameras.forEach((cam) => {
    state[cam.id] = { lastFrame: new Date() };

    // Register transcoded stream in background if browser lacks H.265 decoding
    if (shouldTranscodeCamera(cam)) {
      console.log(`Pre-registering transcoded H.264 stream for ${cam.id} in background...`);
      fetch(`/api/streams?loc=${locationKey}&name=${cam.id}_h264&src=${encodeURIComponent("ffmpeg:" + cam.id + "#video=h264")}`, {
        method: "PUT"
      }).catch(err => console.error("Failed to register transcoded stream:", err));
    }

    const tile = document.createElement("div");
    tile.className = "cam-tile";
    tile.id = `tile-${cam.id}`;
    
    tile.innerHTML = `
      <div class="cam-click-cover" style="position: absolute; inset: 0; z-index: 10; cursor: pointer; background: transparent;"></div>
      <div class="cam-overlay" style="z-index: 5;">
        <div class="cam-top">
          <span class="cam-name">${cam.name}</span>
          <div class="cam-badges">
            <span class="badge badge-connecting" id="status-${cam.id}">CONNECTING</span>
            <span class="badge badge-method" id="method-${cam.id}" style="display:none"></span>
          </div>
        </div>
        <div class="cam-bottom">
          <span class="cam-time" id="time-${cam.id}">--</span>
        </div>
      </div>`;
      
    tile.addEventListener("click", () => {
      openFullscreen(cam.id);
    });
    grid.appendChild(tile);
  });

  // Handle resize
  const onResize = () => applyGridLayout(grid, currentCameras.length);
  window.removeEventListener("resize", window._gridResizeHandler);
  window._gridResizeHandler = onResize;
  window.addEventListener("resize", onResize);

  // Start all streams
  currentCameras.forEach((cam) => startStream(cam.id));
}

// ── Fullscreen ──

const fsOverlay = document.getElementById("fsOverlay");
const fsWrap = document.getElementById("fsWrap");
const fsInfo = document.getElementById("fsInfo");

function clearFullscreenMedia() {
  const media = fsWrap?.querySelector("iframe");
  if (media) {
    media.src = "about:blank";
    media.remove();
  }
}

function openFullscreen(camId) {
  if (!fsOverlay || !fsWrap || !fsInfo) return;
  const cam = currentCameras.find((c) => c.id === camId);
  if (!cam) return;

  const loc = currentLocation;
  const config = LOCATIONS[loc];
  if (!config) return;

  const useTranscoded = shouldTranscodeCamera(cam);
  const targetSrc = useTranscoded ? `${camId}_h264` : camId;
  const streamUrl = `${config.serverUrl}/stream.html?src=${encodeURIComponent(targetSrc)}`;

  fsInfo.innerHTML = `<span class="cam-name">${cam.name}</span><span class="badge badge-live">LIVE</span>`;

  clearFullscreenMedia();

  const iframe = document.createElement("iframe");
  iframe.src = streamUrl;
  iframe.allow = "autoplay; encrypted-media; fullscreen";
  iframe.setAttribute("allowfullscreen", "");
  iframe.title = `${cam.name} - ${config.name}`;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.background = "#000";

  fsWrap.appendChild(iframe);
  fsOverlay.classList.add("active");
}

// Close fullscreen
const fsClose = document.getElementById("fsClose");
if (fsClose && fsOverlay) {
  fsClose.addEventListener("click", (e) => {
    e.stopPropagation();
    fsOverlay.classList.remove("active");
    clearFullscreenMedia();
  });
}
if (fsOverlay) {
  fsOverlay.addEventListener("click", (e) => {
    if (e.target === fsOverlay) {
      fsClose?.click();
    }
  });
}

// ESC key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && fsOverlay?.classList.contains("active")) {
    fsClose?.click();
  }
});

// ── Auto-initialize from data-location attribute ──
// The server-rendered page sets data-location on .app-shell

const appShell = document.querySelector(".app-shell[data-location]");
if (appShell) {
  const locationKey = appShell.dataset.location;
  if (locationKey && LOCATIONS[locationKey]) {
    renderGrid(locationKey);
  }
}
