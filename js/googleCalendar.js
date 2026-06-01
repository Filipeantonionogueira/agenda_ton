(function () {
  function toCalendarDate(dateString) {
    if (!dateString) return "";
    return dateString.replace(/-/g, "");
  }

  function toNextCalendarDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("");
  }

  function buildCalendarUrl(quote) {
    const date = toCalendarDate(quote.serviceDate);
    const endDate = toNextCalendarDate(quote.serviceDate);
    const title = `Instalação de Papel de Parede - ${quote.clientName}`;
    const details = [
      `Cliente: ${quote.clientName}`,
      `Telefone: ${quote.clientPhone}`,
      `Quantidade de rolos: ${quote.rollQuantity}`,
      `Valor: ${window.TonAgenda.formatCurrency(quote.serviceValue)}`
    ].join("\n");

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      details,
      location: quote.clientAddress,
      dates: `${date}/${endDate}`
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function openGoogleCalendar(quote) {
    window.open(buildCalendarUrl(quote), "_blank", "noopener");
  }

  window.TonCalendar = {
    buildCalendarUrl,
    openGoogleCalendar
  };
})();
