import { API_BASE } from "../lib/apiBase.js";
const API = API_BASE;
const BASE = `${API}/hiring/public`;
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
async function parse(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.messages?.[0] || data?.message || "\u0421\u0435\u0440\u0432\u0435\u0440 \u043D\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.";
    throw new ApiError(msg, res.status);
  }
  return data;
}
async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body !== void 0 ? { "Content-Type": "application/json" } : void 0,
    body: body !== void 0 ? JSON.stringify(body) : void 0
  });
  return parse(res);
}
function upload(path, form, onProgress, tries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", BASE + path);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        const data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else if (xhr.status >= 500 && left > 1) setTimeout(() => attempt(left - 1), 1500);
        else reject(new ApiError(data?.messages?.[0] || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B.", xhr.status));
      };
      xhr.onerror = () => left > 1 ? setTimeout(() => attempt(left - 1), 2e3) : reject(new ApiError("\u0421\u0432\u044F\u0437\u044C \u043F\u0440\u0435\u0440\u0432\u0430\u043B\u0430\u0441\u044C \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435.", 0));
      xhr.send(form());
    };
    attempt(tries);
  });
}
const c = (token) => `/c/${encodeURIComponent(token)}`;
const api = {
  config: () => call("GET", "/config"),
  start: (src) => call("POST", "/candidates", { src, pdConsent: true }),
  state: (t) => call("GET", c(t)),
  consent: (t) => call("POST", c(t) + "/consent"),
  saveResume: (t, form) => call("PUT", c(t) + "/resume", form),
  resumeFile: (t, file, onP) => upload(c(t) + "/resume-file", () => {
    const f = new FormData();
    f.append("file", file);
    return f;
  }, onP),
  testStart: (t) => call("POST", c(t) + "/test/start"),
  testCurrent: (t) => call("GET", c(t) + "/test"),
  testAnswer: (t, question, picks) => call("PUT", c(t) + "/test/answer", { question, picks }),
  testSubmit: (t) => call("POST", c(t) + "/test/submit"),
  testContinue: (t) => call("POST", c(t) + "/test/continue"),
  open: (t, i) => call("POST", `${c(t)}/interview/${i}/open`),
  answer: (t, i, body) => call("PUT", `${c(t)}/interview/${i}`, body),
  video: (t, i, file, name, seconds, mode, onP) => upload(`${c(t)}/interview/${i}/video`, () => {
    const f = new FormData();
    f.append("file", file, name);
    if (seconds != null) f.append("seconds", String(seconds));
    f.append("mode", mode);
    return f;
  }, onP),
  interviewFinish: (t) => call("POST", c(t) + "/interview/finish"),
  read: (t, i, seconds) => call("POST", `${c(t)}/terms/${i}/read`, { seconds }),
  quiz: (t, answers) => call("POST", c(t) + "/terms/quiz", { answers }),
  sign: (t, signature, consents) => call("POST", c(t) + "/terms/sign", { signature, consents }),
  unsubscribe: (t) => call("POST", c(t) + "/unsubscribe"),
  proctor: (t, events) => fetch(`${BASE}${c(t)}/proctor`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events }), keepalive: true }),
  snapshot: (t, stage, jpeg) => {
    const f = new FormData();
    f.append("stage", stage);
    f.append("file", jpeg, "shot.jpg");
    return fetch(`${BASE}${c(t)}/proctor/snapshot`, { method: "POST", body: f });
  }
};
const TOKEN_KEY = "jts-hiring-token";
function savedToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function saveToken(t) {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
  }
}
export {
  API,
  ApiError,
  TOKEN_KEY,
  api,
  saveToken,
  savedToken,
  upload
};
