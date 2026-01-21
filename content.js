class Translator {
  constructor() {
    this.btn = null;
    this.pop = null;
    this.poptime = 0;
    this.btntime = 0;
    this.stngs = {
      targetLanguage: (navigator.language || "en").split("-")[0],
      theme: "system",
      fontFamily: "system",
      showButton: true,
    };

    chrome.storage.sync.get("settings", (data) => {
      if (data.settings) this.stngs = { ...this.stngs, ...data.settings };
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings) {
        this.stngs = { ...this.stngs, ...changes.settings.newValue };
        if (this.pop) this.applstyles();
      }
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "TRANSLATE_SELECTION_CONTEXT" && msg.text) {
        this.shwtrnsltcntrl(msg.text);
      } else if (msg.type === "TRANSLATE_VIA_SHORTCUT") {
        const seltext = window.getSelection().toString().trim();
        if (seltext) this.shwtrnsltcntrl(seltext);
      }
    });

    this.initlz();
  }

  initlz() {
    document.addEventListener("mouseup", (e) => this.hndlsel(e));

    document.addEventListener("click", (e) => {
      // Don't close if we just opened the popup or showed the button
      if (Date.now() - this.poptime < 400 || Date.now() - this.btntime < 100)
        return;

      const isInside =
        (this.btn && this.btn.contains(e.target)) ||
        (this.pop && this.pop.contains(e.target));

      if (!isInside) {
        this.hdpop();
        this.hdbtn();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hdpop();
        this.hdbtn();
      }
    });
  }

  hndlsel(e) {
    if (this.pop?.contains(e.target) || this.btn?.contains(e.target)) return;

    if (this.seltimeout) clearTimeout(this.seltimeout);
    this.seltimeout = setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length > 0 && this.stngs.showButton) {
        this.shwbtn(selection);
      } else {
        this.hdbtn();
      }
    }, 50);
  }

  crtbtn() {
    if (this.btn) return;
    this.btn = document.createElement("button");
    this.btn.className = "translation-icon-btn";
    this.btn.innerHTML = `
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    `;
    this.btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = window.getSelection().toString().trim();
      if (text) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const rect = selection.getRangeAt(0).getBoundingClientRect();
          this.trnslt(text, rect);
        }
      }
    });
  }

  shwbtn(selection) {
    if (!this.btn) this.crtbtn();
    this.hdpop();

    if (selection.rangeCount === 0) return;
    const rect = selection.getRangeAt(0).getBoundingClientRect();

    const themeClass = this.stngs.theme || "system";
    this.btn.className = `translation-icon-btn ${themeClass}`;
    this.btn.style.top = `${window.scrollY + rect.top - 40}px`;
    this.btn.style.left = `${window.scrollX + rect.right}px`;
    this.btn.style.display = "flex";
    this.btntime = Date.now();

    if (!this.btn.parentNode) document.body.appendChild(this.btn);
  }

  hdbtn() {
    if (this.btn) this.btn.style.display = "none";
  }

  crtpop() {
    if (this.pop) return;
    this.pop = document.createElement("div");
    this.pop.className = "simple-translate-popup";
    this.pop.innerHTML = `<div class="translate-content"></div>`;
    this.pop.addEventListener("click", (e) => e.stopPropagation());
  }

  shwpop(rect, initialText) {
    if (!this.pop) this.crtpop();
    this.hdbtn();

    this.applstyles();
    this.updtcnt(initialText, false, true);

    this.pop.style.top = `${window.scrollY + rect.bottom + 10}px`;
    this.pop.style.left = `${window.scrollX + rect.left}px`;

    requestAnimationFrame(() => {
      this.pop.classList.add("visible");
    });

    this.poptime = Date.now();
    if (!this.pop.parentNode) document.body.appendChild(this.pop);
  }

  hdpop() {
    if (this.pop) {
      this.pop.classList.remove("visible");
    }
  }

  async trnslt(text, rect) {
    this.shwpop(rect, "Translating...");

    try {
      const response = await chrome.runtime.sendMessage({
        type: "TRANSLATE_TEXT",
        text: text,
        lang: this.stngs.targetLanguage,
      });

      if (response?.success) {
        this.updtcnt(response.text);
      } else {
        this.updtcnt("Translation failed. Please try again.", true);
      }
    } catch (err) {
      this.updtcnt("Error connecting to service.", true);
    }
  }

  shwtrnsltcntrl(text) {
    const rect = {
      bottom: window.innerHeight / 2 - 50,
      left: window.innerWidth / 2 - 160,
    };
    this.trnslt(text, rect);
  }

  updtcnt(text, isError = false, isLoading = false) {
    if (!this.pop) return;
    const content = this.pop.querySelector(".translate-content");

    if (isLoading) {
      content.classList.add("loading");
      content.innerHTML = `<div class="translate-loading">${text}</div>`;
    } else {
      content.classList.remove("loading");
      if (isError) {
        content.innerHTML = `<div class="translate-error">${text}</div>`;
      } else {
        content.textContent = text;
      }
    }
  }

  applstyles() {
    if (!this.pop) return;
    const fontClass =
      this.stngs.fontFamily !== "system" ? "font-" + this.stngs.fontFamily : "";
    const themeClass = this.stngs.theme || "system";
    this.pop.className =
      `simple-translate-popup ${themeClass} ${fontClass} ${this.pop.classList.contains("visible") ? "visible" : ""}`.trim();
    if (this.btn) {
      this.btn.className = `translation-icon-btn ${themeClass}`;
    }
  }
}

window.trnsltrex = new Translator();
