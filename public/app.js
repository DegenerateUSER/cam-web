function normalizeServerUrl(value) {
  const trimmedValue = (value || "").trim();
  const normalized = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
  return normalized.replace(/\/+$/, "");
}

const DEFAULT_SERVER = normalizeServerUrl(
  document.getElementById("appConfig")?.dataset.defaultServer || "https://rtc.aacctrust.in"
);
const DEFAULT_CAMERA_CONFIG = "cam1:CAM 01,cam3:CAM 02";

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

function getDefaultCameraName(id) {
  const baseId = (id || "").split("|")[0];
  const camMatch = /^cam(\d+)$/i.exec(baseId);
  if (camMatch) {
    return `CAM ${camMatch[1].padStart(2, "0")}`;
  }
  return `CAM ${baseId.toUpperCase()}`;
}

function getCameras() {
  const rawCameraConfig = document.getElementById("appConfig")?.dataset.cameras || DEFAULT_CAMERA_CONFIG;
  const parsedCameras = rawCameraConfig
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [idPart, ...nameParts] = entry.split(":");
      const id = idPart?.trim();
      if (!id) return null;
      const name = nameParts.join(":").trim() || getDefaultCameraName(id);
      const sources = id
        .split("|")
        .map((source) => source.trim())
        .filter(Boolean);
      const cameraId = sources[0] || id;
      return { id: cameraId, name, sources: sources.length > 0 ? sources : [cameraId] };
    })
    .filter(Boolean);

  if (parsedCameras.length > 0) return parsedCameras;

  return [
    { id: "cam1", name: "CAM 01", sources: ["cam1"] },
    { id: "cam3", name: "CAM 02", sources: ["cam3"] },
  ];
}

const CAMERAS = getCameras();
const WEBRTC_TIMEOUT = 8000;
const STREAM_METHOD_KEY = "stream_method";
const DEFAULT_STREAM_METHOD = "hls";
const MOBILE_LAYOUT_BREAKPOINT = 900;

function getStreamMethod() {
  const method = localStorage.getItem(STREAM_METHOD_KEY);
  if (method === "auto" || method === "webrtc" || method === "hls" || method === "mse" || method === "mjpeg") {
    return method;
  }
  return DEFAULT_STREAM_METHOD;
}

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
  const applyGridLayout = () => {
    const columns = CAMERAS.length === 1 ? 1 : window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT ? 1 : 2;
    const rowCount = Math.max(1, Math.ceil(CAMERAS.length / columns));
    grid.style.gridTemplateColumns = columns === 1 ? "1fr" : "1fr 1fr";
    grid.style.gridTemplateRows = `repeat(${rowCount}, minmax(0, 1fr))`;
  };
  applyGridLayout();
  window.addEventListener("resize", applyGridLayout);

  CAMERAS.forEach((cam) => {
    state[cam.id] = { method: null, status: "idle", pc: null, hls: null, mjpegLoop: null, lastFrame: null };
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
  if (s.hls) {
    try {
      s.hls.destroy();
    } catch (e) {}
    s.hls = null;
  }
  if (s.mjpegLoop) {
    clearTimeout(s.mjpegLoop);
    s.mjpegLoop = null;
  }
  const vid = document.getElementById(`vid-${camId}`);
  vid.srcObject = null;
  vid.src = "";
  vid.load();
  const tile = document.getElementById(`tile-${camId}`);
  const oldImg = tile.querySelector("img.mjpeg");
  if (oldImg) oldImg.remove();
}

async function tryMSE(camId, sourceId) {
  return new Promise((resolve) => {
    const vid = document.getElementById(`vid-${camId}`);
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, WEBRTC_TIMEOUT);

    vid.src = `/api/stream.mp4?src=${encodeURIComponent(sourceId)}`;
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

async function tryMJPEG(camId, sourceId) {
  return new Promise((resolve) => {
    const s = state[camId];
    const tile = document.getElementById(`tile-${camId}`);
    const vid = document.getElementById(`vid-${camId}`);
    vid.style.display = "none";
    let settled = false;
    let firstFrameSeen = false;
    let useProxy = false;
    const directBase = `${getHttpBase()}/api/frame.jpeg?src=${encodeURIComponent(sourceId)}`;
    const proxyBase = `/api/frame.jpeg?src=${encodeURIComponent(sourceId)}`;
    const nextFrameUrl = () => `${useProxy ? proxyBase : directBase}&_=${Date.now()}`;
    const settle = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(ok);
    };
    const timeout = setTimeout(() => {
      settle(false);
    }, 15000);

    const img = document.createElement("img");
    img.className = "mjpeg";
    img.referrerPolicy = "no-referrer";
    const scheduleNextFrame = () => {
      if (s.mjpegLoop) clearTimeout(s.mjpegLoop);
      s.mjpegLoop = setTimeout(() => {
        img.src = nextFrameUrl();
      }, 250);
    };

    img.onload = () => {
      firstFrameSeen = true;
      updateFrameTime(camId);
      settle(true);
      scheduleNextFrame();
    };
    img.onerror = () => {
      if (!firstFrameSeen && !useProxy) {
        useProxy = true;
        img.src = nextFrameUrl();
        return;
      }
      if (!firstFrameSeen) {
        settle(false);
        return;
      }
      scheduleNextFrame();
    };
    tile.insertBefore(img, tile.querySelector(".cam-overlay"));
    img.src = nextFrameUrl();
  });
}

async function tryHLS(camId, sourceId) {
  return new Promise((resolve) => {
    const vid = document.getElementById(`vid-${camId}`);
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, 15000);
    const hlsUrl = `/api/stream.m3u8?src=${encodeURIComponent(sourceId)}`;

    if (typeof window.Hls !== "undefined" && window.Hls.isSupported()) {
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      state[camId].hls = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(vid);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        vid.play().catch(() => {});
      });
      vid.addEventListener("loadeddata", function onLoad() {
        vid.removeEventListener("loadeddata", onLoad);
        updateFrameTime(camId);
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(true);
        }
      });
      hls.on(window.Hls.Events.ERROR, (event, data) => {
        if (data?.fatal) {
          hls.destroy();
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve(false);
          }
        }
      });
      vid.addEventListener("timeupdate", () => updateFrameTime(camId));
      return;
    }

    if (vid.canPlayType("application/vnd.apple.mpegurl")) {
      vid.src = hlsUrl;
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
      return;
    }

    if (!settled) {
      settled = true;
      clearTimeout(timeout);
      resolve(false);
    }
  });
}

async function tryWebRTC(camId, sourceId) {
  return new Promise(async (resolve) => {
    const vid = document.getElementById(`vid-${camId}`);
    let settled = false;
    const settle = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(ok);
    };
    const timeout = setTimeout(() => {
      settle(false);
    }, WEBRTC_TIMEOUT);
    const startPlayback = () => {
      const playAttempt = vid.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {});
      }
    };
    const markLive = () => {
      updateFrameTime(camId);
      settle(true);
    };

    try {
      vid.muted = true;
      vid.autoplay = true;
      vid.playsInline = true;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      state[camId].pc = pc;
      const ms = new MediaStream();
      vid.srcObject = ms;
      vid.addEventListener("timeupdate", () => updateFrameTime(camId));
      vid.addEventListener("loadeddata", markLive, { once: true });
      vid.addEventListener("playing", markLive, { once: true });
      vid.addEventListener("error", () => settle(false), { once: true });

      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (ev) => {
        if (ev.track.kind === "video") {
          if (ev.streams?.[0] && vid.srcObject !== ev.streams[0]) {
            vid.srcObject = ev.streams[0];
          } else if (!ev.streams?.[0]) {
            ms.addTrack(ev.track);
          }

          ev.track.onunmute = () => {
            updateFrameTime(camId);
            startPlayback();
            if (typeof vid.requestVideoFrameCallback === "function") {
              vid.requestVideoFrameCallback(() => markLive());
            }
          };
          ev.track.onended = () => settle(false);
          startPlayback();
        } else {
          ms.addTrack(ev.track);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          settle(false);
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          settle(false);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (pc.iceGatheringState !== "complete") {
        await new Promise((done) => {
          let finished = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            pc.removeEventListener("icegatheringstatechange", onIceGathering);
            done();
          };
          const onIceGathering = () => {
            if (pc.iceGatheringState === "complete") finish();
          };
          pc.addEventListener("icegatheringstatechange", onIceGathering);
          setTimeout(finish, 1000);
        });
      }

      const resp = await fetch(`/api/webrtc?src=${encodeURIComponent(sourceId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp", "ngrok-skip-browser-warning": "true" },
        body: pc.localDescription?.sdp || offer.sdp,
      });
      if (!resp.ok) {
        settle(false);
        return;
      }

      const sdp = await resp.text();
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
      startPlayback();
    } catch (e) {
      console.warn(`WebRTC failed for ${sourceId}:`, e);
      settle(false);
    }
  });
}

async function startStream(camId) {
  cleanup(camId);
  const vid = document.getElementById(`vid-${camId}`);
  vid.style.display = "";
  const method = getStreamMethod();
  const cam = CAMERAS.find((camera) => camera.id === camId);
  const sources = cam?.sources?.length ? cam.sources : [camId];
  const autoOrder = ["hls", "mjpeg", "mse", "webrtc"];
  const methodOrder = method === "auto" ? autoOrder : [method];

  for (const sourceId of sources) {
    for (const streamMethod of methodOrder) {
      setStatus(camId, "connecting", streamMethod);
      const isLive =
        streamMethod === "hls"
          ? await tryHLS(camId, sourceId)
          : streamMethod === "mjpeg"
            ? await tryMJPEG(camId, sourceId)
            : streamMethod === "mse"
              ? await tryMSE(camId, sourceId)
              : await tryWebRTC(camId, sourceId);

      if (isLive) {
        state[camId].activeSource = sourceId;
        setStatus(camId, "live", streamMethod);
        return;
      }

      cleanup(camId);
      vid.style.display = "";
    }
  }
  setStatus(camId, "error", null);
}

const fsOverlay = document.getElementById("fsOverlay");
const fsWrap = document.getElementById("fsWrap");
const fsInfo = document.getElementById("fsInfo");
let fsActive = null;
let fsHls = null;

function clearFullscreenMedia() {
  if (fsHls) {
    try {
      fsHls.destroy();
    } catch (e) {}
    fsHls = null;
  }
  const media = fsWrap?.querySelector("video, img.mjpeg");
  if (media) media.remove();
}

function openFullscreen(camId) {
  if (!fsOverlay || !fsWrap || !fsInfo) return;
  const s = state[camId];
  if (s.status !== "live") return;
  fsActive = camId;
  const cam = CAMERAS.find((c) => c.id === camId);

  fsInfo.innerHTML = `<span class="cam-name">${cam.name}</span><span class="badge badge-live">LIVE</span><span class="badge badge-method">${(s.method || "").toUpperCase()}</span>`;

  const tile = document.getElementById(`tile-${camId}`);
  if (!tile) return;
  clearFullscreenMedia();

  const mjpeg = tile.querySelector("img.mjpeg");
  const sourceId = state[camId]?.activeSource || camId;

  if (mjpeg) {
    const img = document.createElement("img");
    img.className = "mjpeg";
    img.src = mjpeg.src;
    fsWrap.appendChild(img);
  } else if (s.method === "hls") {
    const vid = document.createElement("video");
    vid.autoplay = true;
    vid.muted = true;
    vid.playsInline = true;
    fsWrap.appendChild(vid);
    const hlsUrl = `/api/stream.m3u8?src=${encodeURIComponent(sourceId)}`;

    if (typeof window.Hls !== "undefined" && window.Hls.isSupported()) {
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      fsHls = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(vid);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        vid.play().catch(() => {});
      });
      hls.on(window.Hls.Events.ERROR, (event, data) => {
        if (data?.fatal) {
          try {
            hls.destroy();
          } catch (e) {}
          if (fsHls === hls) fsHls = null;
        }
      });
    } else {
      vid.src = hlsUrl;
      vid.play().catch(() => {});
    }
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
    clearFullscreenMedia();
    fsActive = null;
  });
  fsOverlay.addEventListener("click", (e) => {
    if (e.target === fsOverlay) {
      fsClose.click();
    }
  });
}

const streamSelect = document.getElementById("streamMethod");
if (streamSelect) {
  streamSelect.value = getStreamMethod();
  streamSelect.addEventListener("change", () => {
    localStorage.setItem(STREAM_METHOD_KEY, streamSelect.value);
    CAMERAS.forEach((cam) => startStream(cam.id));
  });
}

if (grid) {
  CAMERAS.forEach((cam) => startStream(cam.id));
}
