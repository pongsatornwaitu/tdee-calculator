// ===== Theme toggle =====
const root = document.documentElement;
const themeBtn = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
applyTheme(initialTheme);

themeBtn.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("theme", next);
});

function applyTheme(t) {
  root.setAttribute("data-theme", t);
  themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
}

// ===== Element refs =====
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

// ===== Calculations =====
const PRESETS = {
  balanced: { carb: 60, fat: 40 },
  lowcarb:  { carb: 25, fat: 75 },
  highcarb: { carb: 75, fat: 25 },
  // custom is read from slider at runtime
};

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

  // Validate
  const valid =
    !isNaN(sex) && a >= 10 && a <= 100 &&
    w > 0 && bf >= 3 && bf <= 60 &&
    !isNaN(activity);

  // FM / LBM
  const fm = w * bf / 100;
  const lbm = w - fm;
  $("fmOut").textContent = fm.toFixed(2);
  $("lbmOut").textContent = lbm.toFixed(2);

  if (!valid) {
    $("bmrOut").textContent = "—";
    $("tdeeOut").textContent = "—";
    $("targetOut").textContent = "—";
    return;
  }

  // BMR (Müller)
  const bmr = (13.587 * lbm) + (9.613 * fm) + (198 * sex) - (3.351 * a) + 674;
  const tdee = bmr * activity;

  $("bmrOut").textContent = Math.round(bmr).toLocaleString();
  $("tdeeOut").textContent = Math.round(tdee).toLocaleString();
  $("formulaDetail").textContent =
    `BMR = (13.587 × ${lbm.toFixed(2)}) + (9.613 × ${fm.toFixed(2)}) ` +
    `+ (198 × ${sex}) − (3.351 × ${a}) + 674 = ${bmr.toFixed(1)} kcal\n` +
    `TDEE = ${bmr.toFixed(1)} × ${activity} = ${tdee.toFixed(1)} kcal`;

  // Goal target
  let target = tdee;
  let delta = 0;
  if (goal === "deficit") { target = tdee * (1 - pct); delta = -tdee * pct; }
  else if (goal === "surplus") { target = tdee * (1 + pct); delta = +tdee * pct; }

  $("targetOut").textContent = Math.round(target).toLocaleString();
  $("targetDelta").textContent = goal === "maintain"
    ? "คงที่ — เท่ากับ TDEE"
    : `${delta >= 0 ? "+" : ""}${Math.round(delta).toLocaleString()} kcal จาก TDEE`;

  goalPctWrap.classList.toggle("hidden", goal === "maintain");

  // Protein
  const pG = w * gPerKg;
  const pKcal = pG * 4;
  const remainKcal = Math.max(0, target - pKcal);

  $("proteinG").textContent = pG.toFixed(1);
  $("proteinKcal").textContent = Math.round(pKcal).toLocaleString();
  $("remainKcal").textContent = Math.round(remainKcal).toLocaleString();

  // Macro split
  let carbRatio, fatRatio;
  if (preset === "custom") {
    carbRatio = parseFloat(customCarbPct.value);
    fatRatio = 100 - carbRatio;
    customCarbPct.disabled = false;
  } else {
    const p = PRESETS[preset];
    carbRatio = p.carb;
    fatRatio = p.fat;
    customCarbPct.disabled = true;
  }
  customCarbVal.textContent = carbRatio;
  customFatVal.textContent = fatRatio;

  const carbKcal = remainKcal * carbRatio / 100;
  const fatKcal = remainKcal * fatRatio / 100;
  const carbG = carbKcal / 4;   // 1g carb = 4 kcal
  const fatG = fatKcal / 9;     // 1g fat = 9 kcal

  const totalKcal = pKcal + carbKcal + fatKcal;
  const pPct = (pKcal / totalKcal) * 100;
  const cPct = (carbKcal / totalKcal) * 100;
  const fPct = (fatKcal / totalKcal) * 100;

  $("finalPg").textContent = pG.toFixed(0);
  $("finalCg").textContent = carbG.toFixed(0);
  $("finalFg").textContent = fatG.toFixed(0);
  $("finalPkcal").textContent = Math.round(pKcal).toLocaleString();
  $("finalCkcal").textContent = Math.round(carbKcal).toLocaleString();
  $("finalFkcal").textContent = Math.round(fatKcal).toLocaleString();
  $("finalPpct").textContent = pPct.toFixed(0);
  $("finalCpct").textContent = cPct.toFixed(0);
  $("finalFpct").textContent = fPct.toFixed(0);
  $("finalTotal").textContent = Math.round(totalKcal).toLocaleString();
}

// ===== Event wiring =====
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

// Protein info popover toggle
$("proteinInfoBtn").addEventListener("click", () => {
  $("proteinInfo").classList.toggle("hidden");
});

// Lightbox
const lightbox = $("lightbox");
$("bfImage").addEventListener("click", () => {
  lightbox.classList.remove("hidden");
});
$("lightboxClose").addEventListener("click", () => {
  lightbox.classList.add("hidden");
});
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) lightbox.classList.add("hidden");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") lightbox.classList.add("hidden");
});

// Initial render
calcAll();
