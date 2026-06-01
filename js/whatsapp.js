(function () {
  function cleanPhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.startsWith("55") ? digits : `55${digits}`;
  }

  function buildWhatsAppMessage(quote) {
    return `Olá, ${quote.clientName}!

Seu orçamento para instalação de papel de parede foi realizado com sucesso.

📅 Data: ${window.TonAgenda.formatDate(quote.serviceDate)}
📍 Endereço: ${quote.clientAddress}
🎨 Quantidade de rolos: ${quote.rollQuantity}
💰 Valor: ${window.TonAgenda.formatCurrency(quote.serviceValue)}

Ton Instale agradece seu contato.`;
  }

  function openWhatsApp(quote) {
    const phone = cleanPhone(quote.clientPhone);
    const message = encodeURIComponent(buildWhatsAppMessage(quote));
    const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, "_blank", "noopener");
  }

  window.TonWhatsApp = {
    cleanPhone,
    buildWhatsAppMessage,
    openWhatsApp
  };
})();
