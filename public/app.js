const DEFAULT_SERVER =
  document.getElementById("appConfig")?.dataset.defaultServer?.replace(/\/+$/, "") || "http://localhost:1984";

function getServerUrl() {
  return DEFAULT_SERVER;
}

let SERVER_URL = getServerUrl();

function getHttpBase() {
  return SERVER_URL;
}

function updateServerBadge() {
  const badge = document.getElementById("serverBadge");
  if (!badge) return;
  try {
    const u = new URL(SERVER_URL);
    badge.textContent = u.host;
  } catch (e) {
    badge.textContent = SERVER_URL;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateServerBadge);
} else {
  updateServerBadge();
}

const CAMERAS = [
  { id: "101", name: "CAM 101" },
  { id: "201", name: "CAM 201" },
];
const WEBRTC_TIMEOUT = 8000;

const state = {};

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
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setInterval(updateClock, 1000);
    updateClock();
  });
} else {
  setInterval(updateClock, 1000);
  updateClock();
}

const grid = document.getElementById("grid");
if (grid) {
  CAMERAS.forEach((cam) => {
    state[cam.id] = { method: null, status: "idle", pc: null, lastFrame: null };
    const tile = document.createElement("div");
    tile.className = "cam-tile";
    tile.id = `tile-${cam.id}`;
    tile.innerHTML = `
      <video id="vid-${cam.id}" autoplay muted playsinline></video>
      <div class="cam-overlay">
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
      </div>
      <div class="no-signal" id="nosig-${cam.id}" style="display:none">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>
        <div class="no-signal-text">NO SIGNAL</div>
        <button class="retry-btn" onclick="startStream('${cam.id}')">RETRY</button>
      </div>`;
    tile.addEventListener("click", (e) => {
      if (e.target.closest(".retry-btn")) return;
      openFullscreen(cam.id);
    });
    grid.appendChild(tile);
  });
}

function setStatus(camId, status, method) {
  const s = state[camId];
  s.status = status;
  s.method = method || s.method;
  const el = document.getElementById(`status-${camId}`);
  const mel = document.getElementById(`method-${camId}`);
  const nosig = document.getElementById(`nosig-${camId}`);
  nosig.style.display = "none";
  el.className = "badge";
  if (status === "live") {
    el.classList.add("badge-live");
    el.textContent = "LIVE";
  } else if (status === "connecting") {
    el.classList.add("badge-connecting");
    el.textContent = "CONNECTING";
  } else if (status === "error") {
    el.classList.add("badge-error");
    el.textContent = "ERROR";
    nosig.style.display = "flex";
  }
  if (s.method) {
    mel.style.display = "";
    mel.textContent = s.method.toUpperCase();
  } else {
    mel.style.display = "none";
  }
}

function updateFrameTime(camId) {
  state[camId].lastFrame = new Date();
}

function tickFrameTimes() {
  CAMERAS.forEach((cam) => {
    const s = state[cam.id];
    const el = document.getElementById(`time-${cam.id}`);
    if (s.lastFrame) {
      el.textContent = formatDT(s.lastFrame);
    }
  });
}
setInterval(tickFrameTimes, 1000);

function cleanup(camId) {
  const s = state[camId];
  if (s.pc) {
    try {
      s.pc.close();
    } catch (e) {}
    s.pc = null;
  }
  const vid = document.getElementById(`vid-${camId}`);
  vid.srcObject = null;
  vid.src = "";
  vid.load();
  const tile = document.getElementById(`tile-${camId}`);
  const oldImg = tile.querySelector("img.mjpeg");
  if (oldImg) oldImg.remove();
}

async function tryWebRTC(camId) {
  return new Promise(async (resolve) => {
    const vid = document.getElementById(`vid-${camId}`);
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, WEBRTC_TIMEOUT);

    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      state[camId].pc = pc;
      const ms = new MediaStream();
      vid.srcObject = ms;

      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (ev) => {
        ms.addTrack(ev.track);
        if (ev.track.kind === "video") {
          updateFrameTime(camId);
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve(true);
          }
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve(false);
          }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const resp = await fetch(`${getHttpBase()}/api/webrtc?src=${camId}`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: pc.localDescription.sdp,
      });
      if (!resp.ok) {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(false);
        }
        return;
      }

      const sdp = await resp.text();
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));

      vid.play().catch(() => {});
      vid.addEventListener("timeupdate", () => updateFrameTime(camId));
    } catch (e) {
      console.warn(`WebRTC failed for ${camId}:`, e);
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(false);
      }
    }
  });
}

async function tryMSE(camId) {
  return new Promise((resolve) => {
    const vid = document.getElementById(`vid-${camId}`);
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, WEBRTC_TIMEOUT);

    vid.src = `${getHttpBase()}/api/stream.mp4?src=${camId}`;
    vid.addEventListener("loadeddata", function onLoad() {
      vid.removeEventListener("loadeddata", onLoad);
      updateFrameTime(camId);
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(true);
      }
    });
    vid.addEventListener("error", function onErr() {
      vid.removeEventListener("error", onErr);
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(false);
      }
    });
    vid.addEventListener("timeupdate", () => updateFrameTime(camId));
    vid.play().catch(() => {});
  });
}

async function tryMJPEG(camId) {
  return new Promise((resolve) => {
    const tile = document.getElementById(`tile-${camId}`);
    const vid = document.getElementById(`vid-${camId}`);
    vid.style.display = "none";
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, WEBRTC_TIMEOUT);

    const img = document.createElement("img");
    img.className = "mjpeg";
    img.src = `${getHttpBase()}/api/stream.mjpeg?src=${camId}`;
    img.onload = () => {
      updateFrameTime(camId);
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(true);
      }
      setInterval(() => updateFrameTime(camId), 1000);
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(false);
      }
    };
    tile.insertBefore(img, tile.querySelector(".cam-overlay"));
  });
}

async function startStream(camId) {
  cleanup(camId);
  const vid = document.getElementById(`vid-${camId}`);
  vid.style.display = "";

  setStatus(camId, "connecting", "webrtc");
  if (await tryWebRTC(camId)) {
    setStatus(camId, "live", "webrtc");
    return;
  }
  cleanup(camId);
  vid.style.display = "";

  setStatus(camId, "connecting", "mse");
  if (await tryMSE(camId)) {
    setStatus(camId, "live", "mse");
    return;
  }
  cleanup(camId);
  vid.style.display = "";

  setStatus(camId, "connecting", "mjpeg");
  if (await tryMJPEG(camId)) {
    setStatus(camId, "live", "mjpeg");
    return;
  }
  cleanup(camId);

  setStatus(camId, "error", null);
}

const fsOverlay = document.getElementById("fsOverlay");
const fsWrap = document.getElementById("fsWrap");
const fsInfo = document.getElementById("fsInfo");
let fsActive = null;

function openFullscreen(camId) {
  if (!fsOverlay || !fsWrap || !fsInfo) return;
  const s = state[camId];
  if (s.status !== "live") return;
  fsActive = camId;
  const cam = CAMERAS.find((c) => c.id === camId);

  fsInfo.innerHTML = `<span class="cam-name">${cam.name}</span><span class="badge badge-live">LIVE</span><span class="badge badge-method">${(s.method || "").toUpperCase()}</span>`;

  const tile = document.getElementById(`tile-${camId}`);
  if (!tile) return;
  const mjpeg = tile.querySelector("img.mjpeg");
  const existingMedia = fsWrap.querySelector("video, img.mjpeg");
  if (existingMedia) existingMedia.remove();

  if (mjpeg) {
    const img = document.createElement("img");
    img.className = "mjpeg";
    img.src = mjpeg.src;
    fsWrap.appendChild(img);
  } else {
    const vid = document.createElement("video");
    vid.autoplay = true;
    vid.muted = true;
    vid.playsInline = true;
    const srcVid = document.getElementById(`vid-${camId}`);
    if (!srcVid) return;
    if (srcVid.srcObject) {
      vid.srcObject = srcVid.srcObject;
    } else if (srcVid.src) {
      vid.src = srcVid.src;
    }
    vid.play().catch(() => {});
    fsWrap.appendChild(vid);
  }
  fsOverlay.classList.add("active");
}

const fsClose = document.getElementById("fsClose");
if (fsClose && fsOverlay && fsWrap) {
  fsClose.addEventListener("click", (e) => {
    e.stopPropagation();
    fsOverlay.classList.remove("active");
    const m = fsWrap.querySelector("video, img.mjpeg");
    if (m) m.remove();
    fsActive = null;
  });
  fsOverlay.addEventListener("click", (e) => {
    if (e.target === fsOverlay) {
      fsClose.click();
    }
  });
}

if (grid) {
  CAMERAS.forEach((cam) => startStream(cam.id));
}
