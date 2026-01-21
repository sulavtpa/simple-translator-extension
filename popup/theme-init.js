// Theme initialization script to prevent flicker
(function () {
  chrome.storage.sync.get("settings", (data) => {
    const theme = (data.settings && data.settings.theme) || "system";

    if (theme !== "system") {
      document.body.classList.remove("system");
      document.body.classList.add(theme);
    }
    setTimeout(() => {
      document.body.classList.add("theme-transition");
    }, 100);
  });
})();
