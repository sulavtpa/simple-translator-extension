const getsyslang = () => {
  const lang = (
    chrome.i18n.getUILanguage() ||
    navigator.language ||
    "en"
  ).split("-")[0];
  return lang;
};

const DEAFULT_SETTINGS = {
  targetLanguage: getsyslang(),
  theme: "system",
  fontFamily: "system",
  showButton: true,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("settings", (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({ settings: DEAFULT_SETTINGS });
    }
  });
});

// Context menu - works with both v2 and v3
chrome.contextMenus.create({
  id: "translate-selection",
  title: 'Translate "%s"',
  contexts: ["selection"],
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate-selection" && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      type: "TRANSLATE_SELECTION_CONTEXT",
      text: info.selectionText,
    });
  }
});

// Message handler - works with both v2 and v3
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TRANSLATE_TEXT") {
    trnslttext(request.text, request.lang)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Keyboard shortcut - works with both v2 and v3
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "translate_selection") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TRANSLATE_VIA_SHORTCUT",
      });
    }
  }
});

async function trnslttext(text, targetLang) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data?.[0]) {
      const translatedText = data[0].map((item) => item[0]).join("");
      return { success: true, text: translatedText };
    }

    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Translation error:", error);
    return { success: false, error: error.message };
  }
}
