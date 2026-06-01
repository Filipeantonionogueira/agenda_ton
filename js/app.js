(function () {
  const state = {
    currentView: "dashboardView",
    deleteId: null,
    isSaving: false
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    applyTheme(window.TonStorage.getTheme());
    loadSettings();
    bindEvents();
    renderAll();
  }

  function cacheElements() {
    [
      "splashScreen", "sidebar", "menuButton", "pageTitle", "newQuoteShortcut", "themeToggle",
      "brandName", "brandLogo", "quoteForm", "quoteId", "clientName",
      "clientPhone", "clientAddress", "serviceDate", "rollQuantity",
      "serviceValue", "serviceStatus", "serviceNotes", "formTitle",
      "clearFormButton", "saveQuoteButton", "whatsAppButton", "calendarButton", "quotesList",
      "quotesCount", "quoteSearch", "metricScheduled", "metricTotal",
      "metricConfirmed", "metricToday", "upcomingList", "upcomingCount",
      "todayList", "todayDateLabel", "agendaClientSearch", "agendaDateSearch",
      "agendaSort", "agendaCards", "agendaTable", "agendaCount", "settingsForm",
      "companyName", "companyPhone", "companyLogo", "logoPreview",
      "exportBackupButton", "importBackupInput", "toast", "confirmModal",
      "cancelDeleteButton", "confirmDeleteButton"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });

    els.navLinks = document.querySelectorAll(".nav-link, .bottom-link");
  }

  function bindEvents() {
    els.navLinks.forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.view));
    });

    els.menuButton.addEventListener("click", () => els.sidebar.classList.toggle("open"));
    els.newQuoteShortcut.addEventListener("click", () => {
      clearForm();
      setView("quotesView");
    });

    els.themeToggle.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
      applyTheme(nextTheme);
      window.TonStorage.saveTheme(nextTheme);
      showToast("Tema atualizado.");
    });

    els.quoteForm.addEventListener("submit", handleSaveQuote);
    els.clientPhone.addEventListener("input", () => {
      els.clientPhone.value = formatPhoneInput(els.clientPhone.value);
    });
    els.companyPhone.addEventListener("input", () => {
      els.companyPhone.value = formatPhoneInput(els.companyPhone.value);
    });
    els.clearFormButton.addEventListener("click", clearForm);
    els.whatsAppButton.addEventListener("click", () => runWithFormQuote(window.TonWhatsApp.openWhatsApp));
    els.calendarButton.addEventListener("click", () => runWithFormQuote(window.TonCalendar.openGoogleCalendar));
    els.quoteSearch.addEventListener("input", renderQuotes);

    ["agendaClientSearch", "agendaDateSearch", "agendaSort"].forEach((id) => {
      els[id].addEventListener("input", renderAgenda);
      els[id].addEventListener("change", renderAgenda);
    });

    els.settingsForm.addEventListener("submit", handleSaveSettings);
    els.companyLogo.addEventListener("change", handleLogoChange);
    els.exportBackupButton.addEventListener("click", exportBackup);
    els.importBackupInput.addEventListener("change", importBackup);

    els.cancelDeleteButton.addEventListener("click", closeDeleteModal);
    els.confirmDeleteButton.addEventListener("click", confirmDelete);
    els.confirmModal.addEventListener("click", (event) => {
      if (event.target === els.confirmModal) closeDeleteModal();
    });

    window.setTimeout(() => {
      if (els.splashScreen) els.splashScreen.classList.add("hide");
    }, 650);
  }

  function setView(viewId) {
    state.currentView = viewId;
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
    els.navLinks.forEach((link) => link.classList.toggle("active", link.dataset.view === viewId));
    els.pageTitle.textContent = {
      dashboardView: "Dashboard",
      quotesView: "Orçamentos",
      agendaView: "Agenda",
      settingsView: "Configurações"
    }[viewId];
    if (els.sidebar) els.sidebar.classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    renderAll();
  }

  function applyTheme(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    els.themeToggle.textContent = theme === "dark" ? "Modo claro" : "Modo escuro";
  }

  function getFormQuote() {
    return {
      id: els.quoteId.value || undefined,
      clientName: cleanInput(els.clientName.value, 90),
      clientPhone: cleanInput(els.clientPhone.value, 30),
      clientAddress: cleanInput(els.clientAddress.value, 180),
      serviceDate: els.serviceDate.value,
      rollQuantity: Number(els.rollQuantity.value || 0),
      serviceValue: Number(els.serviceValue.value || 0),
      status: els.serviceStatus.value,
      notes: cleanInput(els.serviceNotes.value, 500)
    };
  }

  function validateQuote(quote) {
    if (!quote.clientName || !quote.clientPhone || !quote.clientAddress || !quote.serviceDate) {
      showToast("Preencha cliente, telefone, endereço e data.");
      return false;
    }

    if (quote.rollQuantity <= 0 || quote.serviceValue < 0) {
      showToast("Informe quantidade de rolos e valor válidos.");
      return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(quote.serviceDate)) {
      showToast("Informe uma data válida.");
      return false;
    }

    return true;
  }

  function handleSaveQuote(event) {
    event.preventDefault();
    if (state.isSaving) return;
    const quote = getFormQuote();
    if (!validateQuote(quote)) return;

    if (!quote.id && hasDuplicateQuote(quote)) {
      showToast("Já existe um orçamento igual salvo.");
      return;
    }

    try {
      state.isSaving = true;
      els.saveQuoteButton.disabled = true;
      window.TonStorage.upsertQuote(quote);
      clearForm();
      renderAll();
      showToast("Orçamento salvo com sucesso.");
    } catch (error) {
      showToast(error.message || "Não foi possível salvar o orçamento.");
    } finally {
      state.isSaving = false;
      els.saveQuoteButton.disabled = false;
    }
  }

  function runWithFormQuote(callback) {
    const quote = getFormQuote();
    if (!validateQuote(quote)) return;
    callback(quote);
  }

  function clearForm() {
    els.quoteForm.reset();
    els.quoteId.value = "";
    els.serviceStatus.value = "Pendente";
    els.formTitle.textContent = "Novo orçamento";
    els.saveQuoteButton && (els.saveQuoteButton.textContent = "Salvar orçamento");
  }

  function editQuote(id) {
    const quote = window.TonStorage.getQuotes().find((item) => item.id === id);
    if (!quote) return;

    els.quoteId.value = quote.id;
    els.clientName.value = quote.clientName;
    els.clientPhone.value = quote.clientPhone;
    els.clientAddress.value = quote.clientAddress;
    els.serviceDate.value = quote.serviceDate;
    els.rollQuantity.value = quote.rollQuantity;
    els.serviceValue.value = quote.serviceValue;
    els.serviceStatus.value = quote.status || "Pendente";
    els.serviceNotes.value = quote.notes || "";
    els.formTitle.textContent = "Editar orçamento";
    document.getElementById("saveQuoteButton").textContent = "Editar orçamento";
    setView("quotesView");
    els.clientName.focus();
  }

  function requestDelete(id) {
    state.deleteId = id;
    els.confirmModal.classList.add("show");
    els.confirmModal.setAttribute("aria-hidden", "false");
  }

  function closeDeleteModal() {
    state.deleteId = null;
    els.confirmModal.classList.remove("show");
    els.confirmModal.setAttribute("aria-hidden", "true");
  }

  function confirmDelete() {
    if (!state.deleteId) return;
    window.TonStorage.deleteQuote(state.deleteId);
    closeDeleteModal();
    renderAll();
    showToast("Orçamento excluído.");
  }

  function renderAll() {
    renderSettingsBrand();
    renderDashboard();
    renderQuotes();
    renderAgenda();
  }

  function renderDashboard() {
    const quotes = window.TonStorage.getQuotes();
    const today = window.TonAgenda.getTodayKey();
    const scheduled = quotes.filter((quote) => quote.status !== "Cancelado");
    const total = scheduled.reduce((sum, quote) => sum + Number(quote.serviceValue || 0), 0);
    const confirmed = quotes.filter((quote) => quote.status === "Confirmado").length;
    const todayQuotes = scheduled.filter((quote) => quote.serviceDate === today);
    const upcoming = window.TonAgenda.sortByDate(
      scheduled.filter((quote) => quote.serviceDate >= today),
      "asc"
    ).slice(0, 5);

    els.metricScheduled.textContent = scheduled.length;
    els.metricTotal.textContent = window.TonAgenda.formatCurrency(total);
    els.metricConfirmed.textContent = confirmed;
    els.metricToday.textContent = todayQuotes.length;
    els.todayDateLabel.textContent = window.TonAgenda.formatDate(today);
    els.upcomingCount.textContent = `${upcoming.length} itens`;

    els.upcomingList.innerHTML = upcoming.length
      ? upcoming.map(renderServiceCard).join("")
      : emptyState("Nenhum serviço futuro cadastrado.");

    els.todayList.innerHTML = todayQuotes.length
      ? todayQuotes.map(renderServiceCard).join("")
      : emptyState("Nenhum serviço para hoje.");
  }

  function renderQuotes() {
    const term = window.TonAgenda.normalize(els.quoteSearch.value);
    const quotes = window.TonAgenda.sortByDate(window.TonStorage.getQuotes(), "desc").filter((quote) => {
      const content = [quote.clientName, quote.clientPhone, quote.clientAddress, quote.status].join(" ");
      return !term || window.TonAgenda.normalize(content).includes(term);
    });

    els.quotesCount.textContent = `${quotes.length} cadastros`;
    els.quotesList.innerHTML = quotes.length
      ? quotes.map((quote) => renderServiceCard(quote, true)).join("")
      : emptyState("Nenhum orçamento encontrado.");

    bindDynamicActions();
  }

  function renderAgenda() {
    const quotes = window.TonAgenda.filterAgenda(
      window.TonStorage.getQuotes(),
      els.agendaClientSearch.value,
      els.agendaDateSearch.value,
      els.agendaSort.value
    );

    els.agendaCount.textContent = `${quotes.length} serviços`;
    els.agendaCards.innerHTML = quotes.length
      ? quotes.map(renderAgendaCard).join("")
      : emptyState("Nenhum serviço na agenda.");

    els.agendaTable.innerHTML = quotes.length
      ? quotes.map((quote) => `
        <tr>
          <td>${window.TonAgenda.formatDate(quote.serviceDate)}</td>
          <td><strong>${escapeHtml(quote.clientName)}</strong><br><span class="muted">${escapeHtml(quote.clientPhone)}</span></td>
          <td>${escapeHtml(quote.clientAddress)}</td>
          <td>${window.TonAgenda.formatCurrency(quote.serviceValue)}</td>
          <td>${statusBadge(quote.status)}</td>
          <td>
            <div class="card-actions">
              <button class="ghost-button" type="button" data-action="edit" data-id="${escapeAttr(quote.id)}">Editar</button>
              <button class="secondary-button" type="button" data-action="calendar" data-id="${escapeAttr(quote.id)}">Agenda</button>
            </div>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="6">${emptyState("Nenhum serviço na agenda.")}</td></tr>`;

    bindDynamicActions();
  }

  function renderServiceCard(quote, withActions) {
    return `
      <article class="service-card">
        <div class="service-head">
          <div>
            <strong>${escapeHtml(quote.clientName)}</strong>
            <span class="muted">${window.TonAgenda.formatDate(quote.serviceDate)}</span>
          </div>
          ${statusBadge(quote.status)}
        </div>
        <div class="service-meta">
          <span>${escapeHtml(quote.clientAddress)}</span>
          <span>${quote.rollQuantity} rolos • ${window.TonAgenda.formatCurrency(quote.serviceValue)}</span>
          ${quote.notes ? `<span>${escapeHtml(quote.notes)}</span>` : ""}
        </div>
        ${withActions ? `
          <div class="card-actions">
            <button class="ghost-button" type="button" data-action="edit" data-id="${escapeAttr(quote.id)}">Editar</button>
            <button class="whatsapp-button" type="button" data-action="whatsapp" data-id="${escapeAttr(quote.id)}">WhatsApp</button>
            <button class="secondary-button" type="button" data-action="calendar" data-id="${escapeAttr(quote.id)}">Adicionar à Agenda</button>
            <button class="danger-button" type="button" data-action="delete" data-id="${escapeAttr(quote.id)}">Excluir</button>
          </div>
        ` : ""}
      </article>
    `;
  }

  function renderAgendaCard(quote) {
    const date = getDateParts(quote.serviceDate);
    return `
      <article class="agenda-card">
        <div class="agenda-head">
          <div class="agenda-date">
            <span>${date.month}</span>
            <b>${date.day}</b>
          </div>
          <div>
            <strong>${escapeHtml(quote.clientName)}</strong>
            <span class="muted">${escapeHtml(quote.clientPhone)}</span>
          </div>
          ${statusBadge(quote.status)}
        </div>
        <div class="agenda-meta">
          <span>${escapeHtml(quote.clientAddress)}</span>
          <span>${quote.rollQuantity} rolos</span>
          <span class="agenda-value">${window.TonAgenda.formatCurrency(quote.serviceValue)}</span>
        </div>
        <div class="card-actions">
          <button class="ghost-button" type="button" data-action="edit" data-id="${escapeAttr(quote.id)}">Editar</button>
          <button class="secondary-button" type="button" data-action="calendar" data-id="${escapeAttr(quote.id)}">Google Agenda</button>
        </div>
      </article>
    `;
  }

  function bindDynamicActions() {
    document.querySelectorAll("[data-action]").forEach((button) => {
      button.onclick = () => {
        const quote = window.TonStorage.getQuotes().find((item) => item.id === button.dataset.id);
        if (!quote && button.dataset.action !== "delete") return;

        if (button.dataset.action === "edit") editQuote(button.dataset.id);
        if (button.dataset.action === "delete") requestDelete(button.dataset.id);
        if (button.dataset.action === "whatsapp") window.TonWhatsApp.openWhatsApp(quote);
        if (button.dataset.action === "calendar") window.TonCalendar.openGoogleCalendar(quote);
      };
    });
  }

  function statusBadge(status) {
    const value = status || "Pendente";
    const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return `<span class="status status-${slug}">${value}</span>`;
  }

  function emptyState(text) {
    return `<div class="empty-state">${text}</div>`;
  }

  function loadSettings() {
    const settings = window.TonStorage.getSettings();
    els.companyName.value = settings.companyName;
    els.companyPhone.value = formatPhoneInput(settings.companyPhone);
    renderSettingsBrand();
  }

  function renderSettingsBrand() {
    const settings = window.TonStorage.getSettings();
    els.brandName.textContent = settings.companyName || "Ton Instale";
    renderLogo(els.brandLogo, settings.companyLogo, "TI");
    renderLogo(els.logoPreview, settings.companyLogo, "TI");
  }

  function renderLogo(target, logo, fallback) {
    target.innerHTML = logo ? `<img src="${logo}" alt="Logo da empresa">` : fallback;
  }

  function handleSaveSettings(event) {
    event.preventDefault();
    try {
      window.TonStorage.saveSettings({
        companyName: cleanInput(els.companyName.value, 70) || "Ton Instale",
        companyPhone: cleanInput(els.companyPhone.value, 30)
      });
      renderSettingsBrand();
      showToast("Configurações salvas.");
    } catch (error) {
      showToast(error.message || "Não foi possível salvar as configurações.");
    }
  }

  function formatPhoneInput(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function getDateParts(dateString) {
    const date = window.TonAgenda.parseDate(dateString);
    if (!date) return { day: "--", month: "---" };
    return {
      day: String(date.getDate()).padStart(2, "0"),
      month: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
    };
  }

  function handleLogoChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Use logo em PNG, JPG, WebP ou GIF.");
      event.target.value = "";
      return;
    }

    if (file.size > 450000) {
      showToast("Use uma logo menor que 450 KB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        window.TonStorage.saveSettings({ companyLogo: reader.result });
        renderSettingsBrand();
        showToast("Logo salva.");
      } catch (error) {
        showToast(error.message || "Não foi possível salvar a logo.");
      }
    };
    reader.readAsDataURL(file);
  }

  function exportBackup() {
    const data = window.TonStorage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ton-instale-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Backup exportado.");
  }

  function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 1500000) {
      showToast("Backup muito grande para importar.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        window.TonStorage.importData(JSON.parse(reader.result));
        loadSettings();
        applyTheme(window.TonStorage.getTheme());
        renderAll();
        showToast("Backup importado com sucesso.");
      } catch (error) {
        showToast(error.message || "Não foi possível importar o backup.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function cleanInput(value, maxLength) {
    return String(value || "")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function hasDuplicateQuote(quote) {
    const key = duplicateKey(quote);
    return window.TonStorage.getQuotes().some((item) => duplicateKey(item) === key);
  }

  function duplicateKey(quote) {
    return [
      cleanInput(quote.clientName, 90).toLowerCase(),
      String(quote.clientPhone || "").replace(/\D/g, ""),
      cleanInput(quote.clientAddress, 180).toLowerCase(),
      quote.serviceDate
    ].join("|");
  }
})();
