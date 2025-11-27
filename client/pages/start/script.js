// i18n – Einzelspieler, Du-Form, „Weiter“-Button
const DICT = {
  de: {
    rules:"Spielregeln",
    title:"Gemeinwohl-Ökonomie Planspiel",
    stepLang:"Sprache auswählen", labelLang:"Sprache", labelCountry:"Land",
    stepFirm:"Firmenname eingeben", labelFirm:"Name der Schokoladen-Fabrik",
    start:"Weiter", rulesTitle:"Spielregeln", gotIt:"Verstanden",
    motivation:"Treffe faire Entscheidungen, stärke das Gemeinwohl und führe dein Unternehmen verantwortungsvoll zum Erfolg!",
    errFirmRequired:"Bitte einen Firmennamen eingeben.",
    rulesList:[
      "Wähle eine Sprache und ein Land aus, damit die Simulation an dein ausgewähltes Land angepasst wird.",
      "Gib deiner Schokoladen-Fabrik einen Namen. Dieser erscheint in der Spielübersicht.",
      "Das Spiel verläuft in Runden. In jeder Runde triffst du Entscheidungen in fünf Bereichen (Zutaten, Strom, Fairer Handel, Löhne, Arbeitsplatzqualität).",
      "Deine Entscheidungen beeinflussen Kosten, Verkaufspreis, Produktionsmenge, Nachfrage und den Gemeinwohl-Index.",
      "Ab Phase II gelten Gemeinwohl-Steuern: Höhere Gemeinwohl-Punkte senken die Mehrwertsteuer, geringe Punkte erhöhen sie.",
      "Gewinn entsteht aus Umsatz minus Kosten und Fixkosten. Achte auf ein ausgewogenes Verhältnis von Markt und Gemeinwohl."
    ]
  },
  en: {
    rules:"Rules",
    title:"Economy for the Common Good – Simulation",
    stepLang:"Choose language", labelLang:"Language", labelCountry:"Country",
    stepFirm:"Enter company name", labelFirm:"Name of the chocolate factory",
    start:"Continue", rulesTitle:"Game rules", gotIt:"Got it",
    motivation:"Make fair choices, strengthen the common good, and lead your company responsibly to success!",
    errFirmRequired:"Please enter a company name.",
    rulesList:[
      "Choose a language and country so the simulation matches your selected context.",
      "Give your chocolate factory a name. It appears in the game overview.",
      "The game runs in rounds. In each round you make decisions in five areas (ingredients, energy, fair trade, wages, workplace quality).",
      "Your decisions affect costs, selling price, production quantity, demand and the Common Good Index.",
      "From Phase II, common-good taxes apply: more points reduce VAT, fewer points increase it.",
      "Profit is revenue minus costs and fixed costs. Aim for a balanced relationship between market and common good."
    ]
  },
  es: {
    rules:"Reglas",
    title:"Economía del Bien Común – Simulación",
    stepLang:"Elegir idioma", labelLang:"Idioma", labelCountry:"País",
    stepFirm:"Introducir nombre de la empresa", labelFirm:"Nombre de la fábrica de chocolate",
    start:"Continuar", rulesTitle:"Reglas del juego", gotIt:"Entendido",
    motivation:"Toma decisiones justas, fortalece el bien común y lleva tu empresa de manera responsable al éxito.",
    errFirmRequired:"Introduce un nombre de empresa.",
    rulesList:[
      "Elige un idioma y un país para que la simulación se adapte al país seleccionado.",
      "Pon un nombre a tu fábrica de chocolate. Aparecerá en la vista general del juego.",
      "El juego se desarrolla en rondas. En cada ronda tomas decisiones en cinco áreas (ingredientes, energía, comercio justo, salarios, calidad del trabajo).",
      "Tus decisiones afectan los costes, el precio de venta, la cantidad de producción, la demanda y el Índice del Bien Común.",
      "A partir de la Fase II se aplican impuestos del bien común: más puntos reducen el IVA, menos puntos lo aumentan.",
      "El beneficio es ingresos menos costes y costes fijos. Busca un equilibrio entre el mercado y el bien común."
    ]
  },
  it: {
    rules:"Regole",
    title:"Economia del Bene Comune – Simulazione",
    stepLang:"Seleziona lingua", labelLang:"Lingua", labelCountry:"Paese",
    stepFirm:"Inserisci il nome dell'azienda", labelFirm:"Nome della fabbrica di cioccolato",
    start:"Continua", rulesTitle:"Regole del gioco", gotIt:"Ho capito",
    motivation:"Prendi decisioni eque, rafforza il bene comune e guida responsabilmente la tua azienda al successo!",
    errFirmRequired:"Inserisci il nome dell'azienda.",
    rulesList:[
      "Seleziona una lingua e un paese affinché la simulazione si adatti al paese selezionato.",
      "Dai un nome alla tua fabbrica di cioccolato. Comparirà nella panoramica del gioco.",
      "Il gioco procede a turni. In ogni turno prendi decisioni in cinque aree (ingredienti, energia, commercio equo, salari, qualità del lavoro).",
      "Le tue decisioni influenzano costi, prezzo di vendita, quantità prodotta, domanda e l’Indice del Bene Comune.",
      "Dalla Fase II si applicano le tasse del bene comune: più punti riducono l'IVA, meno punti la aumentano.",
      "L'utile è ricavi meno costi e costi fissi. Punta a un equilibrio tra mercato e bene comune."
    ]
  },
  fr: {
    rules:"Règles",
    title:"Économie du Bien Commun – Simulation",
    stepLang:"Choisir la langue", labelLang:"Langue", labelCountry:"Pays",
    stepFirm:"Saisir le nom de l'entreprise", labelFirm:"Nom de l'usine de chocolat",
    start:"Continuer", rulesTitle:"Règles du jeu", gotIt:"Compris",
    motivation:"Faites des choix justes, renforcez le bien commun et conduisez votre entreprise de manière responsable vers le succès !",
    errFirmRequired:"Veuillez saisir un nom d’entreprise.",
    rulesList:[
      "Choisissez une langue et un pays afin que la simulation corresponde au pays sélectionné.",
      "Donnez un nom à votre usine de chocolat. Il apparaîtra dans la vue d’ensemble du jeu.",
      "Le jeu se déroule par tours. À chaque tour, vous prenez des décisions dans cinq domaines (ingrédients, énergie, commerce équitable, salaires, qualité du travail).",
      "Vos décisions influencent les coûts, le prix de vente, la quantité produite, la demande et l’Indice du Bien Commun.",
      "À partir de la Phase II, les taxes du bien commun s’appliquent : davantage de points réduisent la TVA, moins de points l’augmentent.",
      "Le profit correspond aux revenus moins les coûts et les coûts fixes. Recherchez un équilibre entre le marché et le bien commun."
    ]
  }
};

// Kleine Helfer
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// aktuelle Sprache
function currentLangKey(){
  const val = $("#lang").value;
  return val.startsWith("de") ? "de" : val;
}

// Texte einsetzen
function applyI18n(lang){
  const base = DICT[lang] || DICT.de;
  $$("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if(base[key]) el.textContent = base[key];
  });
  const list = $("#rulesList");
  if (list) {
    list.innerHTML = "";
    base.rulesList.forEach(t => {
      const li = document.createElement("li");
      li.textContent = t;
      list.appendChild(li);
    });
  }
  const mot = $("#rulesMot");
  if (mot) mot.textContent = base.motivation || "";
  document.documentElement.lang = lang;
}
const autoLang = detectBrowserLang();
$("#lang").value = autoLang;    // Dropdown automatisch setzen (falls vorhanden)
applyI18n(autoLang);

// Sprache umschalten
$("#lang").addEventListener("change", ()=> applyI18n(currentLangKey()));

// ---------- Mehrere Firmen: Inputs dynamisch aufbauen ----------
const firmCountSelect = $("#firmCount");
const firmsContainer  = $("#firmsContainer");
const errFirmGlobal   = $("#errFirm");

// erstellt die Eingabefelder entsprechend der Anzahl
function renderFirmInputs(count) {
  if (!firmsContainer) return;
  firmsContainer.innerHTML = "";

  const lang = currentLangKey();
  const base = DICT[lang] || DICT.de;

  for (let i = 0; i < count; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "firm-row";

    const label = document.createElement("label");
    label.className = "firm-label";
    label.setAttribute("for", `firm_${i}`);
    label.textContent = count === 1
      ? base.labelFirm
      : `${base.labelFirm} ${i+1}`;

    const input = document.createElement("input");
    input.type = "text";
    input.id = `firm_${i}`;
    input.className = "firm-input";
    input.autocomplete = "off";

    input.addEventListener("input", validateFirms);

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    firmsContainer.appendChild(wrapper);
  }
}

// Automatische Standardbrowserspracherkennung
function detectBrowserLang() {
  const raw = (navigator.language || navigator.userLanguage || "de").toLowerCase();

  // Nur Sprachcode extrahieren
  const short = raw.split("-")[0];

  // Unterstützte Sprachen:
  const supported = ["de", "en", "es", "it", "fr"];

  return supported.includes(short) ? short : "de";
}

// Standsprache wieder auf DE setzen, falls keine passenden Sprachen gefunden wurden
function currentLangKey(){
  const val = $("#lang").value.toLowerCase();
  const short = val.split("-")[0];
  return DICT[short] ? short : "de";
}

// aktuelle Anzahl aus Select auslesen
function currentFirmCount() {
  if (!firmCountSelect) return 1;
  const n = parseInt(firmCountSelect.value, 10);
  return Number.isNaN(n) ? 1 : Math.max(1, Math.min(5, n));
}

// beim Laden einmal initial aufbauen
renderFirmInputs(currentFirmCount());

// wenn Anzahl geändert wird → Felder neu
if (firmCountSelect) {
  firmCountSelect.addEventListener("change", () => {
    renderFirmInputs(currentFirmCount());
    validateFirms(); // Fehlerzustand zurücksetzen
  });
}

// ---------- Validierung aller Firmennamen ----------
function validateFirms() {
  const lang = currentLangKey();
  const inputs = $$(".firm-input");
  let ok = true;

  inputs.forEach(inp => {
    const val = inp.value.trim();
    if (!val) {
      ok = false;
      inp.classList.add("error-field");
    } else {
      inp.classList.remove("error-field");
    }
  });

  if (!ok && errFirmGlobal) {
    errFirmGlobal.textContent = DICT[lang].errFirmRequired;
  } else if (errFirmGlobal) {
    errFirmGlobal.textContent = "";
  }

  return ok;
}

// ---------- Weiter: Daten speichern und zum Spiel weiterleiten ----------
$("#startBtn").addEventListener("click", () => {
  if (!validateFirms()) {
    const first = $(".firm-input.error-field") || $(".firm-input");
    if (first) first.focus();
    return;
  }

  const lang    = $("#lang").value;
  const country = $("#country").value;

  // alle Firmennamen einsammeln
  const firmNames = $$(".firm-input")
    .map(inp => inp.value.trim())
    .filter(Boolean);

  try {
    // Firmennamen so speichern, wie das React-Spiel sie erwartet
    localStorage.setItem("planspiel_firm_names", JSON.stringify(firmNames));

    // Sprache & Land optional für späteres Backend merken
    localStorage.setItem("planspiel_lang", lang);
    localStorage.setItem("planspiel_country", country);

    // Spiel erzwingen, neu zu starten (kein alter Spielstand)
    localStorage.setItem("planspiel_force_new", "1");
  } catch (e) {
    console.error("Konnte localStorage nicht schreiben:", e);
  }

// Weiter zur React-Spielseite im Projekt-Root
window.location.href = "../../../index.html";

});

// ---------- Regeln-Modal ----------
const rulesModal = $("#rulesModal");
$("#btnRules")?.addEventListener("click", ()=> rulesModal?.showModal());
$("#closeRules")?.addEventListener("click", ()=> rulesModal?.close());
$("#gotIt")?.addEventListener("click", ()=> rulesModal?.close());
