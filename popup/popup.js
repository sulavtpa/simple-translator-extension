import { LANGUAGES } from "./languages.js";

const DEAFULT_SETTINGS = {
  targetLanguage: (navigator.language || "en").split("-")[0],
  theme: "system",
  fontFamily: "system",
  showButton: true,
};

const el = {};

document.addEventListener("DOMContentLoaded", () => {
  el.languageSelect = document.getElementById("targetLanguage");
  el.langSearch = document.getElementById("langSearch");
  el.themeSelect = document.getElementById("theme");
  el.fontSelect = document.getElementById("fontFamily");
  el.showButtonToggle = document.getElementById("showButton");
  el.configShortcut = document.getElementById("configureShortcut");

  // Load and apply settings
  chrome.storage.sync.get("settings", (data) => {
    const stngs = { ...DEAFULT_SETTINGS, ...(data.settings || {}) };

    rndrlang(stngs.targetLanguage);
    el.themeSelect.value = stngs.theme;
    el.fontSelect.value = stngs.fontFamily;
    el.showButtonToggle.checked = stngs.showButton;
    applthm(stngs.theme);
  });

  // Event Listeners
  el.langSearch.addEventListener("input", () => {
    rndrlang(el.languageSelect.value, el.langSearch.value);
  });

  el.languageSelect.addEventListener("change", () => {
    updtset("targetLanguage", el.languageSelect.value);
  });

  el.themeSelect.addEventListener("change", () => {
    const theme = el.themeSelect.value;
    updtset("theme", theme);
    applthm(theme);
  });

  el.fontSelect.addEventListener("change", () => {
    updtset("fontFamily", el.fontSelect.value);
  });

  el.showButtonToggle.addEventListener("change", () => {
    updtset("showButton", el.showButtonToggle.checked);
  });

  el.configShortcut.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });
});

function rndrlang(selectedCode, filter = "") {
  const searchTerm = filter.toLowerCase().trim();
  const filtered = searchTerm
    ? LANGUAGES.filter(
        (l) =>
          l.name.toLowerCase().includes(searchTerm) ||
          l.code.includes(searchTerm),
      )
    : LANGUAGES;

  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();
  filtered.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang.code;
    option.textContent = lang.name;
    if (lang.code === selectedCode) option.selected = true;
    fragment.appendChild(option);
  });

  el.languageSelect.innerHTML = "";
  el.languageSelect.appendChild(fragment);
}

function updtset(key, value) {
  chrome.storage.sync.get("settings", (data) => {
    const settings = { ...(data.settings || {}), [key]: value };
    chrome.storage.sync.set({ settings });
  });
}

function applthm(theme) {
  // Clear existing theme classes but preserve theme-transition
  const themes = ["light", "dark", "black", "gray", "system"];
  themes.forEach((t) => document.body.classList.remove(t));
  document.body.classList.add(theme);
}
