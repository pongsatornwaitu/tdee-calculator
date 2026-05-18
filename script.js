// ============================================================
// TDEE Calculator — with profiles, history, and JSON import/export
// ============================================================

const STORAGE_KEY = "tdee-app-v1";
const DATA_VERSION = 1;

// ---------- Default data ----------
function defaultInputs() {
  return {
    sex: "1",
    age: 30,
    weight: 70,
    bodyfat: 15,
    activity: "1.55",
    goal: "maintain",
    goalPct: 15,
    proteinPerKg: 2.0,
    preset: "balanced",
    customCarbPct: 50,
  };
}
function newProfile(name = "ตัวเอง") {
  return {
    id: "p_" + Math.random().toString(36).slice(2, 10),
    name,
    inputs: defaultInputs(),
    history: [], // [{ date: "YYYY-MM-DD", weight, bodyfat }]
  };
}
function defaultState() {
  const p = newProfile();
  return { version: DATA_VERSION, activeProfileId: p.id, profiles: [p] };
}

// ---------- Load / save ----------
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed.profiles || !parsed.profiles.length) return defaultState();
    return parsed;
  } catch (e) {
    console.warn("Failed to load state, using default", e);
    return defaultState();
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function activeProfile() {
  return state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0];
}

// ============================================================
// Theme
// ============================================================
const root = document.documentElement;
const themeBtn = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(savedTheme || (prefersDark ? "dark" : "light"));
themeBtn.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("theme", next);
});
function applyTheme(t) {
  root.setAttribute("data-theme", t);
  themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
}

// ============================================================
// Element refs
// ============================================================
const $ = (id) => document.getElementById(id);
const sexRadios = document.querySelectorAll('input[name="sex"]');
const activityRadios = document.querySelectorAll('input[name="activity"]');
const goalRadios = document.querySelectorAll('input[name="goal"]');
const presetRadios = document.querySelectorAll('input[name="preset"]');

const age = $("age");
const weight = $("weight");
const bodyfat = $("bodyfat");
const goalPct = $("goalPct");
const goalPctVal = $("goalPctVal");
const goalPctWrap = $("goalPctWrap");
const proteinPerKg = $("proteinPerKg");
const proteinPerKgVal = $("proteinPerKgVal");
const customCarbPct = $("customCarbPct");
const customCarbVal = $("customCarbVal");
const customFatVal = $("customFatVal");

// ============================================================
// Calculations
// ============================================================
const PRESETS = {
  balanced: { carb: 60, fat: 40 },
  lowcarb:  { carb: 25, fat: 75 },
  highcarb: { carb: 75, fat: 25 },
};
function setRadio(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}
function getSelected(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

function calcAll() {
  const sex = parseInt(getSelected("sex"), 10);
  const a = parseFloat(age.value);
  const w = parseFloat(weight.value);
  const bf = parseFloat(bodyfat.value);
  const activity = parseFloat(getSelected("activity"));
  const goal = getSelected("goal");
  const pct = parseFloat(goalPct.value) / 100;
  const gPerKg = parseFloat(proteinPerKg.value);
  const preset = getSelected("preset");

  const valid =
    !isNaN(sex) && a >= 10 && a <= 100 &&
    w > 0 && bf >= 3 && bf <= 60 &&
    !isNaN(activity);

  const fm = w * bf / 100;
  const lbm = w - fm;
  $("fmOut").textContent = isFinite(fm) ? fm.toFixed(2) : "—";
  $("lbmOut").textContent = isFinite(lbm) ? lbm.toFixed(2) : "—";

  if (!valid) {
    $("bmrOut").textContent = "—";
    $("tdeeOut").textContent = "—";
    $("targetOut").textContent = "—";
    persistInputs();
    return;
  }

  const bmr = (13.587 * lbm) + (9.613 * fm) + (198 * sex) - (3.351 * a) + 674;
  const tdee = bmr * activity;

  $("bmrOut").textContent = Math.round(bmr).toLocaleString();
  $("tdeeOut").textContent = Math.round(tdee).toLocaleString();
  $("formulaDetail").textContent =
    `BMR = (13.587 × ${lbm.toFixed(2)}) + (9.613 × ${fm.toFixed(2)}) ` +
    `+ (198 × ${sex}) − (3.351 × ${a}) + 674 = ${bmr.toFixed(1)} kcal\n` +
    `TDEE = ${bmr.toFixed(1)} × ${activity} = ${tdee.toFixed(1)} kcal`;

  let target = tdee, delta = 0;
  if (goal === "deficit") { target = tdee * (1 - pct); delta = -tdee * pct; }
  else if (goal === "surplus") { target = tdee * (1 + pct); delta = +tdee * pct; }
  $("targetOut").textContent = Math.round(target).toLocaleString();
  $("targetDelta").textContent = goal === "maintain"
    ? "คงที่ — เท่ากับ TDEE"
    : `${delta >= 0 ? "+" : ""}${Math.round(delta).toLocaleString()} kcal จาก TDEE`;
  goalPctWrap.classList.toggle("hidden", goal === "maintain");

  const pG = w * gPerKg;
  const pKcal = pG * 4;
  const remainKcal = Math.max(0, target - pKcal);
  $("proteinG").textContent = pG.toFixed(1);
  $("proteinKcal").textContent = Math.round(pKcal).toLocaleString();
  $("remainKcal").textContent = Math.round(remainKcal).toLocaleString();

  let carbRatio, fatRatio;
  if (preset === "custom") {
    carbRatio = parseFloat(customCarbPct.value);
    fatRatio = 100 - carbRatio;
    customCarbPct.disabled = false;
  } else {
    const p = PRESETS[preset];
    carbRatio = p.carb; fatRatio = p.fat;
    customCarbPct.disabled = true;
  }
  customCarbVal.textContent = carbRatio;
  customFatVal.textContent = fatRatio;

  const carbKcal = remainKcal * carbRatio / 100;
  const fatKcal = remainKcal * fatRatio / 100;
  const carbG = carbKcal / 4;
  const fatG = fatKcal / 9;
  const totalKcal = pKcal + carbKcal + fatKcal;

  $("finalPg").textContent = pG.toFixed(0);
  $("finalCg").textContent = carbG.toFixed(0);
  $("finalFg").textContent = fatG.toFixed(0);
  $("finalPkcal").textContent = Math.round(pKcal).toLocaleString();
  $("finalCkcal").textContent = Math.round(carbKcal).toLocaleString();
  $("finalFkcal").textContent = Math.round(fatKcal).toLocaleString();
  $("finalPpct").textContent = totalKcal ? Math.round(pKcal / totalKcal * 100) : 0;
  $("finalCpct").textContent = totalKcal ? Math.round(carbKcal / totalKcal * 100) : 0;
  $("finalFpct").textContent = totalKcal ? Math.round(fatKcal / totalKcal * 100) : 0;
  $("finalTotal").textContent = Math.round(totalKcal).toLocaleString();

  persistInputs();
}

// ============================================================
// Persistence: write current form values into active profile
// ============================================================
function persistInputs() {
  const p = activeProfile();
  if (!p) return;
  p.inputs = {
    sex: getSelected("sex"),
    age: parseFloat(age.value) || 0,
    weight: parseFloat(weight.value) || 0,
    bodyfat: parseFloat(bodyfat.value) || 0,
    activity: getSelected("activity"),
    goal: getSelected("goal"),
    goalPct: parseFloat(goalPct.value) || 15,
    proteinPerKg: parseFloat(proteinPerKg.value) || 2.0,
    preset: getSelected("preset"),
    customCarbPct: parseFloat(customCarbPct.value) || 50,
  };
  saveState();
}

function loadInputsIntoForm() {
  const p = activeProfile();
  if (!p) return;
  const i = p.inputs;
  setRadio("sex", i.sex);
  age.value = i.age;
  weight.value = i.weight;
  bodyfat.value = i.bodyfat;
  setRadio("activity", i.activity);
  setRadio("goal", i.goal);
  goalPct.value = i.goalPct;
  goalPctVal.textContent = i.goalPct;
  proteinPerKg.value = i.proteinPerKg;
  proteinPerKgVal.textContent = parseFloat(i.proteinPerKg).toFixed(1);
  setRadio("preset", i.preset);
  customCarbPct.value = i.customCarbPct;
}

// ============================================================
// Profile management
// ============================================================
function renderProfileSelect() {
  const sel = $("profileSelect");
  sel.innerHTML = "";
  for (const p of state.profiles) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === state.activeProfileId) opt.selected = true;
    sel.appendChild(opt);
  }
}
function switchProfile(id) {
  if (!state.profiles.find(p => p.id === id)) return;
  state.activeProfileId = id;
  saveState();
  loadInputsIntoForm();
  calcAll();
  renderHistory();
}
function addProfile() {
  const name = prompt("ชื่อ Profile ใหม่:", "Profile " + (state.profiles.length + 1));
  if (!name) return;
  const p = newProfile(name.trim());
  state.profiles.push(p);
  state.activeProfileId = p.id;
  saveState();
  renderProfileSelect();
  loadInputsIntoForm();
  calcAll();
  renderHistory();
}
function renameProfile() {
  const p = activeProfile();
  const name = prompt("เปลี่ยนชื่อ Profile:", p.name);
  if (!name) return;
  p.name = name.trim();
  saveState();
  renderProfileSelect();
}
function deleteProfile() {
  if (state.profiles.length === 1) {
    alert("ต้องมีอย่างน้อย 1 profile — ลบไม่ได้");
    return;
  }
  const p = activeProfile();
  if (!confirm(`ลบ profile "${p.name}" และประวัติทั้งหมด?\n(ทำแล้วย้อนไม่ได้)`)) return;
  state.profiles = state.profiles.filter(x => x.id !== p.id);
  state.activeProfileId = state.profiles[0].id;
  saveState();
  renderProfileSelect();
  loadInputsIntoForm();
  calcAll();
  renderHistory();
}

// ============================================================
// History
// ============================================================
function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function logToday() {
  const w = parseFloat(weight.value);
  const bf = parseFloat(bodyfat.value);
  if (!(w > 0) || !(bf >= 3 && bf <= 60)) {
    showLogFeedback("กรอกน้ำหนัก / %ไขมัน ให้ถูกต้องก่อนบันทึก", true);
    return;
  }
  const p = activeProfile();
  const date = todayISO();
  // Upsert: replace today's entry if exists
  p.history = p.history.filter(h => h.date !== date);
  p.history.push({ date, weight: w, bodyfat: bf });
  p.history.sort((a, b) => a.date.localeCompare(b.date));
  saveState();
  renderHistory();
  showLogFeedback(`✅ บันทึก ${date}: ${w} kg, ${bf}% ลงประวัติแล้ว`);
}
function deleteHistoryEntry(date) {
  const p = activeProfile();
  p.history = p.history.filter(h => h.date !== date);
  saveState();
  renderHistory();
}
function showLogFeedback(text, isError = false) {
  const el = $("logFeedback");
  el.textContent = text;
  el.classList.remove("hidden");
  el.style.borderLeftColor = isError ? "var(--danger)" : "var(--success)";
  el.style.background = isError
    ? "color-mix(in srgb, var(--danger) 15%, transparent)"
    : "color-mix(in srgb, var(--success) 15%, transparent)";
  clearTimeout(showLogFeedback._t);
  showLogFeedback._t = setTimeout(() => el.classList.add("hidden"), 3500);
}

function renderHistory() {
  const p = activeProfile();
  const tbody = $("historyBody");
  const table = $("historyTable");
  const empty = $("historyEmpty");
  const chartWrap = $("chartWrap");
  tbody.innerHTML = "";

  if (!p.history.length) {
    table.classList.add("hidden");
    chartWrap.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  table.classList.remove("hidden");

  // Newest first in table
  const sorted = [...p.history].sort((a, b) => b.date.localeCompare(a.date));
  for (const h of sorted) {
    const fm = h.weight * h.bodyfat / 100;
    const lbm = h.weight - fm;
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${h.date}</td>` +
      `<td>${h.weight.toFixed(1)}</td>` +
      `<td>${h.bodyfat.toFixed(1)}%</td>` +
      `<td>${fm.toFixed(1)}</td>` +
      `<td>${lbm.toFixed(1)}</td>` +
      `<td><button class="delete-row" data-date="${h.date}" title="ลบ">✕</button></td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll(".delete-row").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm(`ลบรายการวันที่ ${btn.dataset.date}?`)) deleteHistoryEntry(btn.dataset.date);
    });
  });

  // Chart (requires >= 2 entries to be meaningful)
  if (p.history.length >= 2) {
    chartWrap.classList.remove("hidden");
    drawChart(p.history);
  } else {
    chartWrap.classList.add("hidden");
  }
}

// ============================================================
// Mini SVG chart — dual line (weight + bf%)
// ============================================================
function drawChart(history) {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const W = 600, H = 200, PAD_L = 36, PAD_R = 36, PAD_T = 12, PAD_B = 24;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = sorted.length;

  const weights = sorted.map(h => h.weight);
  const bfs = sorted.map(h => h.bodyfat);
  const wMin = Math.min(...weights), wMax = Math.max(...weights);
  const bMin = Math.min(...bfs), bMax = Math.max(...bfs);
  const wPad = Math.max(0.5, (wMax - wMin) * 0.1);
  const bPad = Math.max(0.5, (bMax - bMin) * 0.1);
  const wLo = wMin - wPad, wHi = wMax + wPad;
  const bLo = bMin - bPad, bHi = bMax + bPad;

  const x = i => PAD_L + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yW = v => PAD_T + (1 - (v - wLo) / (wHi - wLo || 1)) * innerH;
  const yB = v => PAD_T + (1 - (v - bLo) / (bHi - bLo || 1)) * innerH;

  const pathW = sorted.map((h, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yW(h.weight).toFixed(1)}`).join(" ");
  const pathB = sorted.map((h, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yB(h.bodyfat).toFixed(1)}`).join(" ");

  const accent = getComputedStyle(root).getPropertyValue("--accent").trim() || "#3b82f6";
  const warning = getComputedStyle(root).getPropertyValue("--warning").trim() || "#f59e0b";
  const soft = getComputedStyle(root).getPropertyValue("--text-soft").trim() || "#666";
  const border = getComputedStyle(root).getPropertyValue("--border").trim() || "#ccc";

  let pts = "";
  sorted.forEach((h, i) => {
    pts += `<circle cx="${x(i)}" cy="${yW(h.weight)}" r="3" fill="${accent}"/>`;
    pts += `<circle cx="${x(i)}" cy="${yB(h.bodyfat)}" r="3" fill="${warning}"/>`;
  });

  // Axis labels: weight on left, bf on right; first/last date on bottom
  const firstDate = sorted[0].date.slice(5);
  const lastDate = sorted[n - 1].date.slice(5);

  $("chart").innerHTML = `
    <line x1="${PAD_L}" y1="${H - PAD_B}" x2="${W - PAD_R}" y2="${H - PAD_B}" stroke="${border}"/>
    <text x="${PAD_L - 6}" y="${PAD_T + 8}" font-size="10" text-anchor="end" fill="${soft}">${wHi.toFixed(1)}</text>
    <text x="${PAD_L - 6}" y="${H - PAD_B}" font-size="10" text-anchor="end" fill="${soft}">${wLo.toFixed(1)}</text>
    <text x="${W - PAD_R + 6}" y="${PAD_T + 8}" font-size="10" text-anchor="start" fill="${soft}">${bHi.toFixed(1)}%</text>
    <text x="${W - PAD_R + 6}" y="${H - PAD_B}" font-size="10" text-anchor="start" fill="${soft}">${bLo.toFixed(1)}%</text>
    <text x="${PAD_L}" y="${H - 6}" font-size="10" text-anchor="start" fill="${soft}">${firstDate}</text>
    <text x="${W - PAD_R}" y="${H - 6}" font-size="10" text-anchor="end" fill="${soft}">${lastDate}</text>
    <path d="${pathW}" fill="none" stroke="${accent}" stroke-width="2"/>
    <path d="${pathB}" fill="none" stroke="${warning}" stroke-width="2" stroke-dasharray="4 3"/>
    ${pts}
  `;
}

// ============================================================
// Export / Import JSON
// ============================================================
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tdee-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.profiles || !Array.isArray(parsed.profiles) || !parsed.profiles.length) {
        throw new Error("Invalid format");
      }
      if (!confirm("Import จะแทนที่ข้อมูลทั้งหมด แน่ใจ?")) return;
      state = parsed;
      if (!state.activeProfileId || !state.profiles.find(p => p.id === state.activeProfileId)) {
        state.activeProfileId = state.profiles[0].id;
      }
      saveState();
      renderProfileSelect();
      loadInputsIntoForm();
      calcAll();
      renderHistory();
      alert("✅ Import สำเร็จ");
    } catch (err) {
      alert("❌ Import ไม่สำเร็จ: ไฟล์ไม่ถูกต้อง\n" + err.message);
    }
  };
  reader.readAsText(file);
}

// ============================================================
// Event wiring
// ============================================================
[age, weight, bodyfat].forEach(el => el.addEventListener("input", calcAll));
[...sexRadios, ...activityRadios, ...goalRadios, ...presetRadios]
  .forEach(el => el.addEventListener("change", calcAll));

goalPct.addEventListener("input", () => {
  goalPctVal.textContent = goalPct.value;
  calcAll();
});
proteinPerKg.addEventListener("input", () => {
  proteinPerKgVal.textContent = parseFloat(proteinPerKg.value).toFixed(1);
  calcAll();
});
customCarbPct.addEventListener("input", () => {
  customCarbVal.textContent = customCarbPct.value;
  customFatVal.textContent = 100 - parseInt(customCarbPct.value, 10);
  calcAll();
});

$("proteinInfoBtn").addEventListener("click", () => {
  $("proteinInfo").classList.toggle("hidden");
});

// Lightbox
const lightbox = $("lightbox");
$("bfImage").addEventListener("click", () => lightbox.classList.remove("hidden"));
$("lightboxClose").addEventListener("click", () => lightbox.classList.add("hidden"));
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.classList.add("hidden"); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") lightbox.classList.add("hidden"); });

// Profile select + menu
$("profileSelect").addEventListener("change", (e) => switchProfile(e.target.value));

const profileMenu = $("profileMenu");
$("profileMenuBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  profileMenu.classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
  if (!profileMenu.contains(e.target) && e.target !== $("profileMenuBtn")) {
    profileMenu.classList.add("hidden");
  }
});
profileMenu.addEventListener("click", (e) => {
  const action = e.target.dataset?.action;
  if (!action) return;
  profileMenu.classList.add("hidden");
  if (action === "add-profile") addProfile();
  else if (action === "rename-profile") renameProfile();
  else if (action === "delete-profile") deleteProfile();
  else if (action === "export") exportData();
  else if (action === "import") $("importFile").click();
});
$("importFile").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) importData(f);
  e.target.value = "";
});

// History log
$("logToday").addEventListener("click", logToday);

// ============================================================
// Initial render
// ============================================================
renderProfileSelect();
loadInputsIntoForm();
calcAll();
renderHistory();
