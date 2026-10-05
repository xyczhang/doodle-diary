"use strict";

const PAPER_COLORS = ["#f7b8c8", "#d9e6a9", "#f7d991", "#c7e0df", "#d8b6dc"];
const MOODS = ["joyful", "good", "okay", "tired", "blue"];

const state = {
  entries: [],
  selected: null,
  strokes: [],
  mood: "okay",
  color: "#3b2438",
  width: 6,
  drawing: false,
  toastTimer: null,
  authMode: "login",
  user: null,
};

const elements = {
  search: document.querySelector("#search-input"),
  newEntry: document.querySelector("#new-entry-button"),
  sectionTitle: document.querySelector("#section-title"),
  entryCount: document.querySelector("#entry-count"),
  entryGrid: document.querySelector("#entry-grid"),
  modal: document.querySelector("#editor-modal"),
  dialog: document.querySelector("#editor-dialog"),
  closeEditor: document.querySelector("#close-editor"),
  cancel: document.querySelector("#cancel-button"),
  form: document.querySelector("#entry-form"),
  editorEyebrow: document.querySelector("#editor-eyebrow"),
  editorHeading: document.querySelector("#editor-heading"),
  entryDate: document.querySelector("#entry-date"),
  title: document.querySelector("#entry-title"),
  content: document.querySelector("#entry-content"),
  gratitude: document.querySelector("#gratitude"),
  deleteButton: document.querySelector("#delete-button"),
  saveButton: document.querySelector("#save-button"),
  canvas: document.querySelector("#doodle-canvas"),
  drawHint: document.querySelector("#draw-hint"),
  undo: document.querySelector("#undo-button"),
  clear: document.querySelector("#clear-button"),
  toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toast-message"),
  summaryWeek: document.querySelector("#summary-week"),
  summaryButton: document.querySelector("#summary-button"),
  summaryOutput: document.querySelector("#summary-output"),
  summaryMeta: document.querySelector("#summary-meta"),
  summaryText: document.querySelector("#summary-text"),
  authButton: document.querySelector("#auth-button"),
  authModal: document.querySelector("#auth-modal"),
  closeAuth: document.querySelector("#close-auth"),
  authSignedOut: document.querySelector("#auth-signed-out"),
  authSignedIn: document.querySelector("#auth-signed-in"),
  authHeading: document.querySelector("#auth-heading"),
  authIntro: document.querySelector("#auth-intro"),
  authForm: document.querySelector("#auth-form"),
  authEmail: document.querySelector("#auth-email"),
  authPassword: document.querySelector("#auth-password"),
  authSubmit: document.querySelector("#auth-submit"),
  authSwitch: document.querySelector("#auth-switch"),
  accountEmail: document.querySelector("#account-email"),
  logoutButton: document.querySelector("#logout-button"),
};

function makeUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function getJournalId() {
  const storageKey = "doodle-diary-id";
  let id = localStorage.getItem(storageKey);
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
    id = makeUuid();
    localStorage.setItem(storageKey, id);
  }
  return id;
}

function today() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function currentIsoWeek() {
  const now = new Date();
  const day = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((day - yearStart) / 86400000) + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function mondayFromIsoWeek(value) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value || "");
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - (januaryFourth.getUTCDay() || 7) + 1 + ((week - 1) * 7));
  return monday.toISOString().slice(0, 10);
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("x-journal-id", getJournalId());
  if (options.body) headers.set("Content-Type", "application/json");

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The journal is temporarily unavailable.");
  return data;
}

function parseStrokes(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function drawStrokes(context, strokes, scale = 1) {
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of strokes) {
    if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) continue;
    context.beginPath();
    context.strokeStyle = stroke.color || "#3b2438";
    context.lineWidth = Number(stroke.width || 5) * scale;
    context.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale);
    for (const point of stroke.points.slice(1)) context.lineTo(point.x * scale, point.y * scale);
    if (stroke.points.length === 1) context.lineTo((stroke.points[0].x + 0.1) * scale, stroke.points[0].y * scale);
    context.stroke();
  }
}

function redrawEditorCanvas() {
  const context = elements.canvas.getContext("2d");
  context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  drawStrokes(context, state.strokes);
  const empty = state.strokes.length === 0;
  elements.drawHint.hidden = !empty;
  elements.undo.disabled = empty;
  elements.clear.disabled = empty;
}

function pointFromEvent(event) {
  const rectangle = elements.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rectangle.left) / rectangle.width) * elements.canvas.width,
    y: ((event.clientY - rectangle.top) / rectangle.height) * elements.canvas.height,
  };
}

function setMood(mood) {
  state.mood = MOODS.includes(mood) ? mood : "okay";
  document.querySelectorAll(".mood-option").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mood === state.mood));
  });
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toastMessage.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 4500);
}

function updateAuthDisplay() {
  const signedIn = Boolean(state.user);
  elements.authButton.textContent = signedIn ? "Account" : "Sign in";
  elements.authButton.title = signedIn ? `Signed in as ${state.user.email}` : "Sign in or create an account";
  elements.authSignedOut.hidden = signedIn;
  elements.authSignedIn.hidden = !signedIn;
  elements.accountEmail.textContent = signedIn ? state.user.email : "";
}

function setAuthMode(mode) {
  state.authMode = mode === "signup" ? "signup" : "login";
  const creating = state.authMode === "signup";
  elements.authHeading.textContent = creating ? "Make your diary yours" : "Welcome back";
  elements.authIntro.textContent = creating
    ? "Create an account so your pages follow you to any browser or device."
    : "Sign in to find your diary on any browser or device.";
  elements.authSubmit.textContent = creating ? "Create account" : "Sign in";
  elements.authSwitch.textContent = creating ? "Already have an account? Sign in" : "New here? Create an account";
  elements.authPassword.autocomplete = creating ? "new-password" : "current-password";
}

function openAuth() {
  updateAuthDisplay();
  elements.authModal.hidden = false;
  document.body.classList.add("modal-open");
  if (!state.user) {
    setAuthMode("login");
    setTimeout(() => elements.authEmail.focus(), 50);
  }
}

function closeAuth() {
  elements.authModal.hidden = true;
  elements.authForm.reset();
  document.body.classList.remove("modal-open");
}

async function loadAuth() {
  try {
    const data = await api("/api/auth/status");
    state.user = data.signedIn ? data.user : null;
    updateAuthDisplay();
  } catch {
    state.user = null;
    updateAuthDisplay();
  }
}

async function submitAuth(event) {
  event.preventDefault();
  elements.authSubmit.disabled = true;
  elements.authSubmit.textContent = state.authMode === "signup" ? "Creating…" : "Signing in…";
  try {
    const data = await api(`/api/auth/${state.authMode}`, {
      method: "POST",
      body: JSON.stringify({
        email: elements.authEmail.value,
        password: elements.authPassword.value,
      }),
    });
    state.user = data.user;
    updateAuthDisplay();
    await loadEntries();
    closeAuth();
    const moved = Number(data.movedEntries || 0);
    showToast(moved ? `Signed in. ${moved} saved ${moved === 1 ? "page" : "pages"} joined your account.` : "Signed in. Your diary will remember you.");
  } catch (error) {
    showToast(error.message);
    setAuthMode(state.authMode);
  } finally {
    elements.authSubmit.disabled = false;
  }
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
    state.user = null;
    updateAuthDisplay();
    await loadEntries();
    closeAuth();
    showToast("Signed out. Sign in again anytime to see your saved pages.");
  } catch (error) {
    showToast(error.message);
  }
}

function closeEditor() {
  elements.modal.hidden = true;
  document.body.classList.remove("modal-open");
  state.drawing = false;
}

function openNewEntry() {
  state.selected = null;
  state.strokes = [];
  elements.form.reset();
  elements.entryDate.value = today();
  elements.editorEyebrow.textContent = "A new page";
  elements.editorHeading.textContent = "How did today feel?";
  elements.dialog.setAttribute("aria-label", "New journal entry");
  elements.deleteButton.hidden = true;
  elements.saveButton.textContent = "Save entry";
  setMood("okay");
  redrawEditorCanvas();
  elements.modal.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => elements.title.focus(), 50);
}

function openEntry(entry) {
  state.selected = entry;
  state.strokes = parseStrokes(entry.doodle);
  elements.entryDate.value = entry.entryDate;
  elements.title.value = entry.title;
  elements.content.value = entry.content;
  elements.gratitude.value = entry.gratitude || "";
  elements.editorEyebrow.textContent = "Open page";
  elements.editorHeading.textContent = "Keep shaping this memory.";
  elements.dialog.setAttribute("aria-label", "Edit journal entry");
  elements.deleteButton.hidden = false;
  elements.saveButton.textContent = "Save changes";
  setMood(entry.mood || "okay");
  redrawEditorCanvas();
  elements.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function makeEmptyState(title, message, includeButton) {
  const box = document.createElement("div");
  box.className = "empty-state";
  const symbol = document.createElement("span");
  symbol.className = "icon-text";
  symbol.textContent = "□";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const copy = document.createElement("p");
  copy.textContent = message;
  box.append(symbol, heading, copy);
  if (includeButton) {
    const button = document.createElement("button");
    button.className = "new-button";
    button.type = "button";
    button.textContent = "+  Create first entry";
    button.addEventListener("click", openNewEntry);
    box.append(button);
  }
  return box;
}

function createEntryCard(entry, index) {
  const moodIndex = Math.max(0, MOODS.indexOf(entry.mood));
  const card = document.createElement("button");
  card.className = "entry-card";
  card.type = "button";
  card.style.setProperty("--paper", PAPER_COLORS[index % PAPER_COLORS.length]);
  card.addEventListener("click", () => openEntry(entry));

  const cover = document.createElement("div");
  cover.className = "cover";
  const canvas = document.createElement("canvas");
  canvas.className = "mini-canvas";
  canvas.width = 320;
  canvas.height = 200;
  canvas.setAttribute("aria-label", "Doodle cover");
  drawStrokes(canvas.getContext("2d"), parseStrokes(entry.doodle), 0.5);
  const tape = document.createElement("span");
  tape.className = "tape";
  const sticker = document.createElement("span");
  sticker.className = "mood-sticker";
  const face = document.createElement("span");
  face.className = `mood-face mood-face-${moodIndex}`;
  sticker.append(face);
  cover.append(canvas, tape, sticker);

  const copy = document.createElement("div");
  copy.className = "card-copy";
  const date = document.createElement("time");
  date.dateTime = entry.entryDate;
  date.textContent = new Date(`${entry.entryDate}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const title = document.createElement("h3");
  title.textContent = entry.title;
  const content = document.createElement("p");
  content.textContent = entry.content;
  copy.append(date, title, content);
  if (entry.gratitude) {
    const gratitude = document.createElement("small");
    gratitude.className = "gratitude-preview";
    gratitude.textContent = `♡ ${entry.gratitude}`;
    copy.append(gratitude);
  }

  card.append(cover, copy);
  return card;
}

function createAddCard() {
  const card = document.createElement("button");
  card.className = "entry-card add-card";
  card.type = "button";
  const plus = document.createElement("span");
  plus.textContent = "+";
  const title = document.createElement("strong");
  title.textContent = "Draw today’s cover";
  const copy = document.createElement("small");
  copy.textContent = "Start a fresh page";
  card.append(plus, title, copy);
  card.addEventListener("click", openNewEntry);
  return card;
}

function renderEntries() {
  const query = elements.search.value.trim().toLowerCase();
  const filtered = state.entries.filter((entry) => {
    const searchable = `${entry.title} ${entry.content} ${entry.gratitude || ""}`.toLowerCase();
    return searchable.includes(query);
  });

  elements.sectionTitle.textContent = query ? "Search results" : "Recent pages";
  elements.entryCount.textContent = `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`;
  elements.entryGrid.classList.remove("loading");
  elements.entryGrid.replaceChildren();

  if (filtered.length === 0) {
    elements.entryGrid.append(
      query
        ? makeEmptyState("No pages match that search", "Try a different word or phrase.", false)
        : makeEmptyState("Your first page is waiting", "Make a doodle, write a few lines, and begin.", true),
    );
    return;
  }

  filtered.forEach((entry, index) => elements.entryGrid.append(createEntryCard(entry, index)));
  if (!query) elements.entryGrid.append(createAddCard());
}

async function loadEntries() {
  try {
    const data = await api("/api/entries");
    state.entries = data.entries || [];
    renderEntries();
  } catch (error) {
    elements.entryGrid.classList.remove("loading");
    elements.entryGrid.replaceChildren(makeEmptyState("The journal could not open", error.message, false));
    showToast(error.message);
  }
}

async function saveEntry(event) {
  event.preventDefault();
  if (!elements.title.value.trim() || !elements.content.value.trim()) {
    showToast("Add a title and a few words before saving.");
    return;
  }

  elements.saveButton.disabled = true;
  elements.saveButton.textContent = "Saving…";
  try {
    const path = state.selected ? `/api/entries/${state.selected.id}` : "/api/entries";
    await api(path, {
      method: state.selected ? "PUT" : "POST",
      body: JSON.stringify({
        title: elements.title.value,
        content: elements.content.value,
        entryDate: elements.entryDate.value,
        mood: state.mood,
        gratitude: elements.gratitude.value,
        doodle: state.strokes,
      }),
    });
    const message = state.selected ? "Entry updated." : "Entry tucked safely into your journal.";
    await loadEntries();
    closeEditor();
    showToast(message);
  } catch (error) {
    showToast(error.message);
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = state.selected ? "Save changes" : "Save entry";
  }
}

async function deleteEntry() {
  if (!state.selected || !confirm("Delete this journal entry?")) return;
  try {
    await api(`/api/entries/${state.selected.id}`, { method: "DELETE" });
    await loadEntries();
    closeEditor();
    showToast("Entry deleted.");
  } catch (error) {
    showToast(error.message);
  }
}

async function makeWeeklySummary() {
  const weekStart = mondayFromIsoWeek(elements.summaryWeek.value);
  if (!weekStart) {
    showToast("Choose a week first.");
    return;
  }

  elements.summaryButton.disabled = true;
  elements.summaryButton.textContent = "Remembering…";
  try {
    const data = await api("/api/weekly-summary", {
      method: "POST",
      body: JSON.stringify({ weekStart }),
    });
    elements.summaryMeta.textContent = `${data.entryCount} ${data.entryCount === 1 ? "entry" : "entries"} · ${data.weekStart} to ${data.weekEnd}`;
    elements.summaryText.textContent = data.summary;
    elements.summaryOutput.hidden = false;
  } catch (error) {
    elements.summaryOutput.hidden = true;
    showToast(error.message);
  } finally {
    elements.summaryButton.disabled = false;
    elements.summaryButton.textContent = "Make my reflection";
  }
}

elements.canvas.addEventListener("pointerdown", (event) => {
  state.drawing = true;
  elements.canvas.setPointerCapture(event.pointerId);
  state.strokes.push({ color: state.color, width: state.width, points: [pointFromEvent(event)] });
  redrawEditorCanvas();
});

elements.canvas.addEventListener("pointermove", (event) => {
  if (!state.drawing || state.strokes.length === 0) return;
  state.strokes[state.strokes.length - 1].points.push(pointFromEvent(event));
  redrawEditorCanvas();
});

function stopDrawing() {
  state.drawing = false;
}

elements.canvas.addEventListener("pointerup", stopDrawing);
elements.canvas.addEventListener("pointercancel", stopDrawing);
elements.canvas.addEventListener("pointerleave", stopDrawing);

document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => {
    state.color = button.dataset.color;
    document.querySelectorAll(".swatch").forEach((item) => item.classList.toggle("active", item === button));
  });
});

document.querySelectorAll(".size").forEach((button) => {
  button.addEventListener("click", () => {
    state.width = Number(button.dataset.width);
    document.querySelectorAll(".size").forEach((item) => item.classList.toggle("active", item === button));
  });
});

document.querySelectorAll(".mood-option").forEach((button) => {
  button.addEventListener("click", () => setMood(button.dataset.mood));
});

elements.undo.addEventListener("click", () => {
  state.strokes = state.strokes.slice(0, -1);
  redrawEditorCanvas();
});
elements.clear.addEventListener("click", () => {
  state.strokes = [];
  redrawEditorCanvas();
});
elements.search.addEventListener("input", renderEntries);
elements.newEntry.addEventListener("click", openNewEntry);
elements.closeEditor.addEventListener("click", closeEditor);
elements.cancel.addEventListener("click", closeEditor);
elements.form.addEventListener("submit", saveEntry);
elements.deleteButton.addEventListener("click", deleteEntry);
elements.authButton.addEventListener("click", openAuth);
elements.closeAuth.addEventListener("click", closeAuth);
elements.authForm.addEventListener("submit", submitAuth);
elements.authSwitch.addEventListener("click", () => {
  setAuthMode(state.authMode === "login" ? "signup" : "login");
});
elements.logoutButton.addEventListener("click", logout);
elements.summaryButton.addEventListener("click", makeWeeklySummary);
elements.summaryWeek.addEventListener("change", () => {
  elements.summaryOutput.hidden = true;
});
elements.toast.addEventListener("click", () => {
  clearTimeout(state.toastTimer);
  elements.toast.hidden = true;
});
elements.modal.addEventListener("pointerdown", (event) => {
  if (event.target === elements.modal) closeEditor();
});
elements.authModal.addEventListener("pointerdown", (event) => {
  if (event.target === elements.authModal) closeAuth();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.modal.hidden) closeEditor();
  if (event.key === "Escape" && !elements.authModal.hidden) closeAuth();
});

elements.entryDate.value = today();
elements.summaryWeek.value = currentIsoWeek();
redrawEditorCanvas();
loadAuth();
loadEntries();
