(function () {
  function parseDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDate(dateString) {
    const date = parseDate(dateString);
    if (!date) return "";
    return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function sortByDate(quotes, direction) {
    return [...quotes].sort((a, b) => {
      const aTime = parseDate(a.serviceDate)?.getTime() || 0;
      const bTime = parseDate(b.serviceDate)?.getTime() || 0;
      return direction === "desc" ? bTime - aTime : aTime - bTime;
    });
  }

  function filterAgenda(quotes, clientSearch, dateSearch, direction) {
    const term = normalize(clientSearch);
    return sortByDate(quotes, direction).filter((quote) => {
      const matchesClient = !term || normalize(quote.clientName).includes(term);
      const matchesDate = !dateSearch || quote.serviceDate === dateSearch;
      return matchesClient && matchesDate;
    });
  }

  function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  window.TonAgenda = {
    parseDate,
    formatDate,
    formatCurrency,
    normalize,
    sortByDate,
    filterAgenda,
    getTodayKey
  };
})();
