// Landing-Logik: Mehrere Firmennamen (1–5) eingeben und speichern
const LS_NAMES = "planspiel_firm_names";
const LS_COUNT = "planspiel_firm_count";
const LS_FORCE = "planspiel_force_new"; // zwingt neuen Start im Spiel

const countSelect = document.getElementById("firmCount") as HTMLSelectElement | null;
const namesWrap = document.getElementById("names") as HTMLDivElement | null;
const startBtn = document.getElementById("start") as HTMLButtonElement | null;
const errCount = document.getElementById("errCount");

function restore() {
  try {
    const ct = localStorage.getItem(LS_COUNT);
    if (ct && countSelect) countSelect.value = String(Math.min(5, Math.max(1, parseInt(ct) || 1)));
  } catch {}
  renderNameInputs();
  try {
    const raw = localStorage.getItem(LS_NAMES);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      const inputs = namesWrap?.querySelectorAll('input[data-firm-index]') as NodeListOf<HTMLInputElement>;
      inputs?.forEach((inp) => {
        const i = parseInt(inp.dataset.firmIndex || "0");
        if (!Number.isNaN(i) && arr[i]) inp.value = arr[i];
      });
    }
  } catch {}
  validate();
}

function currentCount() {
  return Math.min(5, Math.max(1, parseInt(countSelect?.value || "1")));
}

function renderNameInputs() {
  const c = currentCount();
  if (!namesWrap) return;
  namesWrap.innerHTML = "";
  for (let i = 0; i < c; i++) {
    const div = document.createElement("div");
    div.className = "name-item";
    const label = document.createElement("label");
    label.innerHTML = `<span>Firmenname ${i+1}</span>`;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Firma ${i+1}`;
    input.maxLength = 60;
    input.setAttribute("data-firm-index", String(i));
    input.addEventListener("input", validate);
    input.addEventListener("blur", validate);
    label.appendChild(input);
    div.appendChild(label);
    namesWrap.appendChild(div);
  }
}

function validate() {
  const c = currentCount();
  let okCount = c >= 1 && c <= 5;
  if (errCount) errCount.textContent = okCount ? "" : "Bitte 1–5 Firmen wählen.";
  let okNames = true;
  const inputs = namesWrap?.querySelectorAll('input[data-firm-index]') as NodeListOf<HTMLInputElement>;
  inputs?.forEach((inp) => {
    if ((inp.value || "").trim().length < 2) okNames = false;
  });
  if (startBtn) startBtn.disabled = !(okCount && okNames);
  return okCount && okNames;
}

function go() {
  if (!validate()) return;
  const c = currentCount();
  const inputs = namesWrap?.querySelectorAll('input[data-firm-index]') as NodeListOf<HTMLInputElement>;
  const names: string[] = [];
  for (let i = 0; i < c; i++) {
    const v = (inputs[i].value || "").trim();
    names.push(v);
  }
  try {
    localStorage.setItem(LS_COUNT, String(c));
    localStorage.setItem(LS_NAMES, JSON.stringify(names));
    localStorage.setItem(LS_FORCE, "1"); // Signal: neuen Start erzwingen
  } catch {}
  window.location.href = "spiel.html";
}

countSelect?.addEventListener("change", () => {
  renderNameInputs();
  validate();
});

startBtn?.addEventListener("click", go);

restore();
