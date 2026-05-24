// ── Location data ──

const LOCATIONS = {
  ghaziabad: {
    name: "Ghaziabad CPLI",
    cameras: [
      { id: "gz-cam1", name: "CAM 01", url: "http://pradeepgoyal.duckdns.org:1984/stream.html?src=camera1" },
      { id: "gz-cam3", name: "CAM 02", url: "http://pradeepgoyal.duckdns.org:1984/stream.html?src=camera3" },
    ],
  },
  hapur: {
    name: "Hapur IRCA",
    cameras: [
      { id: "hp-cam1", name: "CAM 01", url: "https://cameras.aacctrust.in/stream.html?src=camera1" },
      { id: "hp-cam2", name: "CAM 02", url: "https://cameras.aacctrust.in/stream.html?src=camera2" },
      { id: "hp-cam3", name: "CAM 03", url: "https://cameras.aacctrust.in/stream.html?src=camera3" },
      { id: "hp-cam4", name: "CAM 04", url: "https://cameras.aacctrust.in/stream.html?src=camera4" },
      { id: "hp-cam8", name: "CAM 05", url: "https://cameras.aacctrust.in/stream.html?src=camera8" },
      { id: "hp-cam10", name: "CAM 06", url: "https://cameras.aacctrust.in/stream.html?src=camera10" },
      { id: "hp-cam11", name: "CAM 07", url: "https://cameras.aacctrust.in/stream.html?src=camera11" },
    ],
  },
  shamli: {
    name: "Shamli DDAC",
    cameras: [
      { id: "sh-cam1", name: "CAM 01", url: "https://shamli-cctv.aacctrust.in/stream.html?src=camera1" },
      { id: "sh-cam2", name: "CAM 02", url: "https://shamli-cctv.aacctrust.in/stream.html?src=camera2" },
      { id: "sh-cam5", name: "CAM 03", url: "https://shamli-cctv.aacctrust.in/stream.html?src=camera5" },
      { id: "sh-cam9", name: "CAM 04", url: "https://shamli-cctv.aacctrust.in/stream.html?src=camera9" },
      { id: "sh-cam10", name: "CAM 05", url: "https://shamli-cctv.aacctrust.in/stream.html?src=camera10" },
      { id: "sh-cam12", name: "CAM 06", url: "https://shamli-cctv.aacctrust.in/stream.html?src=camera12" },
      { id: "sh-cam13", name: "CAM 07", url: "https://shamli-cctv.aacctrust.in/stream.html?src=camera13" },
      { id: "sh-cam14", name: "CAM 08", url: "https://shamli-cctv.aacctrust.in/stream.html?src=camera14" },
    ],
  },
};

// ── State ──

let currentLocation = null;

// ── Clock ──

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

// ── Grid helpers ──

function getGridColClass(cameraCount) {
  if (cameraCount <= 2) return "cols-2";
  if (cameraCount <= 4) return "cols-2";
  return "cols-3";
}

function applyGridLayout(grid, cameraCount) {
  // Remove old column classes
  grid.classList.remove("cols-2", "cols-3", "cols-4");

  if (window.innerWidth <= 900) {
    // Mobile: single column, handled by CSS
    return;
  }

  grid.classList.add(getGridColClass(cameraCount));

  const cols = cameraCount <= 4 ? 2 : 3;
  const rows = Math.ceil(cameraCount / cols);
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
}

// ── Render camera grid ──

function renderGrid(locationKey) {
  const location = LOCATIONS[locationKey];
  if (!location) return;

  currentLocation = locationKey;

  const picker = document.getElementById("locationPicker");
  const grid = document.getElementById("grid");
  if (!picker || !grid) return;

  // Hide picker, show grid
  picker.style.display = "none";
  grid.style.display = "";

  // Clear old tiles
  grid.innerHTML = "";

  // Apply grid layout
  applyGridLayout(grid, location.cameras.length);

  // Create tiles
  location.cameras.forEach((cam) => {
    const tile = document.createElement("div");
    tile.className = "cam-tile";
    tile.id = `tile-${cam.id}`;

    const iframe = document.createElement("iframe");
    iframe.src = cam.url;
    iframe.allow = "autoplay; encrypted-media";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("loading", "lazy");
    iframe.title = `${cam.name} - ${location.name}`;

    const overlay = document.createElement("div");
    overlay.className = "cam-overlay";
    overlay.innerHTML = `
      <div class="cam-top">
        <span class="cam-name">${cam.name}</span>
        <div class="cam-badges">
          <span class="badge badge-live">LIVE</span>
        </div>
      </div>
      <div class="cam-bottom">
        <span class="cam-time">${location.name}</span>
      </div>`;

    tile.appendChild(iframe);
    tile.appendChild(overlay);

    // Click to open fullscreen
    tile.addEventListener("click", () => {
      openFullscreen(cam);
    });

    grid.appendChild(tile);
  });

  // Update header dropdown to reflect current location
  const locationSelect = document.getElementById("locationSelect");
  if (locationSelect) {
    locationSelect.value = locationKey;
  }

  // Handle resize
  const onResize = () => applyGridLayout(grid, location.cameras.length);
  window.removeEventListener("resize", window._gridResizeHandler);
  window._gridResizeHandler = onResize;
  window.addEventListener("resize", onResize);
}

// ── Show location picker ──

function showLocationPicker() {
  const picker = document.getElementById("locationPicker");
  const grid = document.getElementById("grid");
  if (!picker || !grid) return;

  currentLocation = null;
  grid.style.display = "none";
  grid.innerHTML = "";
  picker.style.display = "";

  const locationSelect = document.getElementById("locationSelect");
  if (locationSelect) {
    locationSelect.value = "";
  }
}

// ── Fullscreen ──

const fsOverlay = document.getElementById("fsOverlay");
const fsWrap = document.getElementById("fsWrap");
const fsInfo = document.getElementById("fsInfo");

function clearFullscreenMedia() {
  if (!fsWrap) return;
  const media = fsWrap.querySelector("iframe, video, img.mjpeg");
  if (media) media.remove();
}

function openFullscreen(cam) {
  if (!fsOverlay || !fsWrap || !fsInfo) return;

  const location = currentLocation ? LOCATIONS[currentLocation] : null;
  const locationName = location ? location.name : "";

  fsInfo.innerHTML = `<span class="cam-name">${cam.name}</span><span class="badge badge-live">LIVE</span><span class="cam-time" style="margin-left:6px">${locationName}</span>`;

  clearFullscreenMedia();

  const iframe = document.createElement("iframe");
  iframe.src = cam.url;
  iframe.allow = "autoplay; encrypted-media";
  iframe.setAttribute("allowfullscreen", "");
  iframe.title = `${cam.name} - ${locationName}`;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
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

// ── ESC key to close fullscreen ──
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && fsOverlay?.classList.contains("active")) {
    fsClose?.click();
  }
});

// ── Location card click handlers ──

document.querySelectorAll(".location-card").forEach((card) => {
  card.addEventListener("click", () => {
    const locationKey = card.dataset.location;
    if (locationKey && LOCATIONS[locationKey]) {
      renderGrid(locationKey);
    }
  });
});

// ── Header location dropdown ──

const locationSelect = document.getElementById("locationSelect");
if (locationSelect) {
  locationSelect.addEventListener("change", () => {
    const value = locationSelect.value;
    if (value && LOCATIONS[value]) {
      renderGrid(value);
    } else {
      showLocationPicker();
    }
  });
}
