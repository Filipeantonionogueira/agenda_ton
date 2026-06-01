(function () {
  const KEYS = {
    quotes: "tonInstale.quotes",
    settings: "tonInstale.settings",
    theme: "tonInstale.theme"
  };

  const defaultSettings = {
    companyName: "Ton Instale",
    companyPhone: "",
    companyLogo: ""
  };

  const validStatuses = ["Pendente", "Confirmado", "Concluído", "Cancelado"];

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("Erro ao ler localStorage", error);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Erro ao salvar no localStorage", error);
      throw new Error("Não foi possível salvar. Verifique o espaço disponível no navegador.");
    }
  }

  function getQuotes() {
    const quotes = read(KEYS.quotes, []);
    return Array.isArray(quotes) ? quotes.map(normalizeQuote).filter(Boolean) : [];
  }

  function saveQuotes(quotes) {
    const cleanQuotes = Array.isArray(quotes)
      ? quotes.map(normalizeQuote).filter(Boolean).map((quote) => ({ ...quote, id: quote.id || createId() }))
      : [];
    write(KEYS.quotes, cleanQuotes);
  }

  function upsertQuote(quote) {
    const quotes = getQuotes();
    const normalizedQuote = normalizeQuote(quote);

    if (!normalizedQuote) {
      throw new Error("Orçamento inválido.");
    }

    const index = quotes.findIndex((item) => item.id === normalizedQuote.id);

    if (index >= 0) {
      quotes[index] = { ...quotes[index], ...normalizedQuote, updatedAt: new Date().toISOString() };
    } else {
      quotes.push({
        ...normalizedQuote,
        id: normalizedQuote.id || createId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    saveQuotes(quotes);
    return quotes;
  }

  function deleteQuote(id) {
    saveQuotes(getQuotes().filter((quote) => quote.id !== id));
  }

  function getSettings() {
    return normalizeSettings(read(KEYS.settings, defaultSettings));
  }

  function saveSettings(settings) {
    write(KEYS.settings, normalizeSettings({ ...getSettings(), ...settings }));
  }

  function getTheme() {
    try {
      const theme = localStorage.getItem(KEYS.theme) || "dark";
      return theme === "light" ? "light" : "dark";
    } catch (error) {
      return "dark";
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(KEYS.theme, theme === "light" ? "light" : "dark");
    } catch (error) {
      throw new Error("Não foi possível salvar o tema.");
    }
  }

  function exportData() {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      quotes: getQuotes(),
      settings: getSettings(),
      theme: getTheme()
    };
  }

  function importData(data) {
    if (!data || !Array.isArray(data.quotes)) {
      throw new Error("Arquivo de backup inválido.");
    }

    const previousData = exportData();
    const quotes = data.quotes.map(normalizeQuote).filter(Boolean);
    if (quotes.length !== data.quotes.length) {
      throw new Error("O backup possui orçamentos incompletos ou inválidos.");
    }

    try {
      const uniqueQuotes = removeDuplicateQuotes(quotes).map((quote) => ({ ...quote, id: quote.id || createId() }));
      saveQuotes(uniqueQuotes);
      if (data.settings) saveSettings(data.settings);
      if (data.theme) saveTheme(data.theme);
    } catch (error) {
      saveQuotes(previousData.quotes);
      saveSettings(previousData.settings);
      saveTheme(previousData.theme);
      throw error;
    }
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `quote-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function cleanText(value, maxLength) {
    return String(value || "")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function cleanDate(value) {
    const date = cleanText(value, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  }

  function normalizeQuote(quote) {
    if (!quote || typeof quote !== "object") return null;

    const normalized = {
      id: cleanText(quote.id, 80),
      clientName: cleanText(quote.clientName, 90),
      clientPhone: cleanText(quote.clientPhone, 30),
      clientAddress: cleanText(quote.clientAddress, 180),
      serviceDate: cleanDate(quote.serviceDate),
      rollQuantity: Math.max(0, Math.min(999, Number.parseInt(quote.rollQuantity, 10) || 0)),
      serviceValue: Math.max(0, Math.min(9999999, Number(quote.serviceValue) || 0)),
      status: validStatuses.includes(quote.status) ? quote.status : "Pendente",
      notes: cleanText(quote.notes, 500),
      createdAt: cleanText(quote.createdAt, 40),
      updatedAt: cleanText(quote.updatedAt, 40)
    };

    if (!normalized.clientName || !normalized.clientPhone || !normalized.clientAddress || !normalized.serviceDate) {
      return null;
    }

    return normalized;
  }

  function normalizeSettings(settings) {
    const companyLogo = String(settings?.companyLogo || "").trim();
    const isSafeLogo = companyLogo.length <= 600000 && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(companyLogo);
    return {
      ...defaultSettings,
      companyName: cleanText(settings?.companyName || defaultSettings.companyName, 70),
      companyPhone: cleanText(settings?.companyPhone, 30),
      companyLogo: isSafeLogo ? companyLogo : ""
    };
  }

  function removeDuplicateQuotes(quotes) {
    const seen = new Set();
    return quotes.filter((quote) => {
      const key = quote.id || [
        quote.clientName.toLowerCase(),
        quote.clientPhone.replace(/\D/g, ""),
        quote.clientAddress.toLowerCase(),
        quote.serviceDate
      ].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  window.TonStorage = {
    getQuotes,
    saveQuotes,
    upsertQuote,
    deleteQuote,
    getSettings,
    saveSettings,
    getTheme,
    saveTheme,
    exportData,
    importData
  };
})();
