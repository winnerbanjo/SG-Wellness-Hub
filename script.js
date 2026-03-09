/*
  SG Wellness Hub Minoxidil Landing Page Script
  Edit these constants before launch:
  - WHATSAPP_NUMBER: your WhatsApp number in international format (e.g. 2348012345678)
  - PAYSTACK_PUBLIC_KEY: your Paystack public key (leave empty to use WhatsApp fallback)
  - PRODUCT_PRICE: product unit price in Naira
  - SHIPPING_FEE: shipping commitment fee in Naira
  - DELIVERY_CITIES: list of highlighted delivery cities for quick display
*/

const WHATSAPP_NUMBER = "2349162495435";
const SHIPPING_FEE = 1000;
const PRODUCT_PRICE = 18500;
const PAYSTACK_PUBLIC_KEY = "";
const PRODUCT_NAME = "SG Wellness Hub 5% Minoxidil Hair Growth Solution (60ml)";
const DELIVERY_CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Benin City"];
const ORDER_STORAGE_KEY = "sgwellness_orders_v1";
const ADMIN_ACCESS_PIN = "2401";

const orderForm = document.getElementById("orderForm");
const quantityInput = document.getElementById("quantity");
const summaryQuantity = document.getElementById("summaryQuantity");
const summaryProduct = document.getElementById("summaryProduct");
const summaryUnitPrice = document.getElementById("summaryUnitPrice");
const summaryTotal = document.getElementById("summaryTotal");
const summaryShippingFee = document.getElementById("summaryShippingFee");
const deliveryCitiesInline = document.getElementById("deliveryCitiesInline");
const ordersTableBody = document.getElementById("ordersTableBody");
const modal = document.getElementById("statusModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalProceedBtn = document.getElementById("modalProceedBtn");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const orderViaWhatsApp = document.getElementById("orderViaWhatsApp");
const whatsappSupportBtn = document.getElementById("whatsappSupportBtn");
const floatingWhatsapp = document.getElementById("floatingWhatsapp");
const mobileWhatsAppBtn = document.getElementById("mobileWhatsAppBtn");

let modalAction = null;

function formatNaira(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function sanitizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function isValidPhone(value) {
  const phone = sanitizePhone(value);
  return /^((\+?234)|0)[789][01]\d{8}$/.test(phone);
}

function toWhatsAppNumber(number) {
  const digits = String(number).replace(/\D/g, "");
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  if (digits.startsWith("234")) return digits;
  return digits;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

function setConfigText() {
  if (summaryProduct) summaryProduct.textContent = PRODUCT_NAME;
  if (summaryUnitPrice) summaryUnitPrice.textContent = formatNaira(PRODUCT_PRICE);
  if (summaryShippingFee) summaryShippingFee.textContent = formatNaira(SHIPPING_FEE);
  if (deliveryCitiesInline) deliveryCitiesInline.textContent = DELIVERY_CITIES.join(", ");
}

function updateSummary() {
  const qty = Number(quantityInput?.value || 1);
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
  if (summaryQuantity) summaryQuantity.textContent = String(safeQty);
  if (summaryTotal) summaryTotal.textContent = formatNaira(PRODUCT_PRICE * safeQty);
}

function getFormData() {
  const fd = new FormData(orderForm);
  return {
    fullName: String(fd.get("fullName") || "").trim(),
    phoneNumber: String(fd.get("phoneNumber") || "").trim(),
    address: String(fd.get("address") || "").trim(),
    city: String(fd.get("city") || "").trim(),
    landmark: String(fd.get("landmark") || "").trim(),
    quantity: Number(fd.get("quantity") || 1),
    fulfillment: String(fd.get("fulfillment") || "Full Order").trim(),
    notes: String(fd.get("notes") || "").trim(),
  };
}

function setFieldError(name, message) {
  const errorEl = document.getElementById(`${name}Error`);
  if (errorEl) errorEl.textContent = message;
}

function clearErrors() {
  const errors = document.querySelectorAll(".error");
  errors.forEach((el) => {
    el.textContent = "";
  });
}

function validateForm(data) {
  clearErrors();
  let isValid = true;

  if (!data.fullName || data.fullName.length < 3) {
    setFieldError("fullName", "Enter your full name (at least 3 characters).");
    isValid = false;
  }

  if (!isValidPhone(data.phoneNumber)) {
    setFieldError("phoneNumber", "Enter a valid Nigerian phone number.");
    isValid = false;
  }

  if (!data.address || data.address.length < 8) {
    setFieldError("address", "Enter a complete delivery address.");
    isValid = false;
  }

  if (!data.city || data.city.length < 2) {
    setFieldError("city", "Enter delivery city.");
    isValid = false;
  }

  if (!data.landmark || data.landmark.length < 2) {
    setFieldError("landmark", "Enter nearest landmark.");
    isValid = false;
  }

  if (!Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 20) {
    setFieldError("quantity", "Quantity should be between 1 and 20.");
    isValid = false;
  }

  if (!["Full Order", "Pay ₦1,000 Commitment Fee First"].includes(data.fulfillment)) {
    setFieldError("fulfillment", "Select a valid fulfillment option.");
    isValid = false;
  }

  return isValid;
}

function buildWhatsappMessage(data) {
  return `Hello, I want to order ${PRODUCT_NAME}.\n\nFull Name:\n${data.fullName}\nPhone Number:\n${data.phoneNumber}\nAddress:\n${data.address}\nCity:\n${data.city}\nNearest Landmark:\n${data.landmark}\nQuantity:\n${data.quantity}\nFulfillment Option:\n${data.fulfillment}\nAdditional Notes:\n${data.notes || "N/A"}\n\nPlease confirm availability and delivery details.`;
}

function createOrderPayload(data) {
  const now = new Date();
  const productTotal = PRODUCT_PRICE * data.quantity;
  return {
    id: `SG-${now.getTime()}`,
    createdAtISO: now.toISOString(),
    createdAtReadable: now.toLocaleString("en-NG", { hour12: true }),
    productName: PRODUCT_NAME,
    pricing: {
      productPrice: PRODUCT_PRICE,
      quantity: data.quantity,
      productTotal,
      shippingCommitmentFee: SHIPPING_FEE,
    },
    customer: {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      city: data.city,
      landmark: data.landmark,
    },
    fulfillmentOption: data.fulfillment,
    additionalNotes: data.notes,
    status: "NEW",
    source: "landing-page",
  };
}

function getSavedOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
  } catch (_) {
    return [];
  }
}

function saveOrder(payload) {
  const orders = getSavedOrders();
  orders.unshift(payload);
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

function renderOrders() {
  const orders = getSavedOrders();
  if (!ordersTableBody) return;
  if (!orders.length) {
    ordersTableBody.innerHTML = '<tr><td colspan="6">No orders saved yet.</td></tr>';
    return;
  }

  ordersTableBody.innerHTML = orders
    .map(
      (order) => `
      <tr>
        <td>${escapeHtml(order.createdAtReadable || "-")}</td>
        <td>${escapeHtml(order.customer?.fullName || "-")}</td>
        <td>${escapeHtml(order.customer?.phoneNumber || "-")}</td>
        <td>${escapeHtml(order.customer?.city || "-")}</td>
        <td>${escapeHtml(String(order.pricing?.quantity || "-"))}</td>
        <td>${escapeHtml(order.fulfillmentOption || "-")}</td>
      </tr>
    `
    )
    .join("");
}

function openWhatsApp(message) {
  const phone = toWhatsAppNumber(WHATSAPP_NUMBER);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.location.href = url;
}

function showModal({ title, message, onProceed, proceedLabel = "Continue" }) {
  if (!modal || !modalTitle || !modalMessage || !modalProceedBtn) return;
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalProceedBtn.textContent = proceedLabel;
  modalAction = typeof onProceed === "function" ? onProceed : null;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  modalAction = null;
}

function handleCommitmentPayment() {
  const amountInKobo = SHIPPING_FEE * 100;
  const supportMessage = `Hello, I want to pay the ${formatNaira(
    SHIPPING_FEE
  )} commitment fee for ${PRODUCT_NAME}. Please guide me.`;

  if (!PAYSTACK_PUBLIC_KEY || typeof window.PaystackPop === "undefined") {
    showModal({
      title: "Payment Setup Needed",
      message:
        "Commitment fee payment is currently not configured on this page. Please continue via WhatsApp for manual payment support.",
      proceedLabel: "Chat on WhatsApp",
      onProceed: () => openWhatsApp(supportMessage),
    });
    return;
  }

  const customerPhone = sanitizePhone(document.getElementById("phoneNumber")?.value || "");
  const customerName = document.getElementById("fullName")?.value || "Customer";

  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: "customer@sgwellnesshub.ng",
    amount: amountInKobo,
    currency: "NGN",
    metadata: {
      custom_fields: [
        { display_name: "Customer Name", variable_name: "customer_name", value: customerName },
        { display_name: "Phone", variable_name: "phone", value: customerPhone || "N/A" },
        { display_name: "Product", variable_name: "product", value: PRODUCT_NAME },
      ],
    },
    callback(response) {
      showModal({
        title: "Payment Received",
        message: `Payment successful. Ref: ${response.reference}. Continue to WhatsApp so our team can prioritize your dispatch.`,
        proceedLabel: "Send Details",
        onProceed: () => openWhatsApp(`Hello, I just paid ${formatNaira(SHIPPING_FEE)} commitment fee. Ref: ${response.reference}. Please confirm my order for ${PRODUCT_NAME}.`),
      });
    },
    onClose() {
      // Intentionally silent to avoid interrupting users who close checkout.
    },
  });

  handler.openIframe();
}

function setupCommitmentButtons() {
  const payButtons = document.querySelectorAll(".js-pay-commitment");
  payButtons.forEach((btn) => {
    btn.addEventListener("click", handleCommitmentPayment);
  });
}

function setupFaq() {
  const buttons = document.querySelectorAll(".faq-question");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      const answer = btn.nextElementSibling;
      btn.setAttribute("aria-expanded", String(!expanded));
      if (answer) answer.hidden = expanded;
    });

    btn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        btn.click();
      }
    });
  });
}

function setupGallery() {
  const mainImage = document.getElementById("galleryMain");
  const thumbs = document.querySelectorAll(".thumb");
  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const image = thumb.getAttribute("data-image");
      const alt = thumb.getAttribute("data-alt") || "Product image";
      if (mainImage && image) {
        mainImage.src = image;
        mainImage.alt = alt;
      }
      thumbs.forEach((item) => item.classList.remove("active"));
      thumb.classList.add("active");
    });
  });
}

function attachImageFallbacks() {
  const allImages = document.querySelectorAll("img");
  allImages.forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        if (img.dataset.fallbackApplied === "true") return;
        const label = img.dataset.fallbackLabel || "Image Placeholder";
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'><rect width='100%' height='100%' fill='%23eef2ef'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%236b7570' font-family='Arial' font-size='26'>${label}</text></svg>`;
        img.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
        img.classList.add("image-fallback");
        img.dataset.fallbackApplied = "true";
      },
      { once: true }
    );
  });
}

function setupNav() {
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.querySelector(".site-nav");
  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = siteNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        siteNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }
}

function guardAdminAccess() {
  const isAdminPage = document.body?.dataset?.page === "admin";
  if (!isAdminPage) return true;

  const pin = window.prompt("Enter admin PIN to view orders:");
  if (pin === ADMIN_ACCESS_PIN) return true;

  document.body.innerHTML = `
    <main style="font-family:Manrope,sans-serif;padding:2rem;color:#1f2523">
      <h1 style="margin:0 0 .6rem">Access Denied</h1>
      <p>Invalid PIN. Reload and try again.</p>
    </main>
  `;
  return false;
}

function setupRevealAnimations() {
  const revealEls = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealEls.forEach((el) => observer.observe(el));
}

function bindWhatsAppButtons() {
  const genericMessage = `Hello, I want to order ${PRODUCT_NAME}. Please confirm price, stock, and delivery details.`;
  const clickHandler = (event) => {
    event.preventDefault();
    openWhatsApp(genericMessage);
  };

  const quickBtns = document.querySelectorAll(".js-whatsapp-generic");
  quickBtns.forEach((btn) => btn.addEventListener("click", clickHandler));

  if (whatsappSupportBtn) whatsappSupportBtn.addEventListener("click", clickHandler);
  if (floatingWhatsapp) floatingWhatsapp.addEventListener("click", clickHandler);
  if (mobileWhatsAppBtn) mobileWhatsAppBtn.addEventListener("click", clickHandler);
}

function handleOrderSubmit(event) {
  event.preventDefault();
  const data = getFormData();
  if (!validateForm(data)) return;

  const payload = createOrderPayload(data);
  saveOrder(payload);
  renderOrders();

  const whatsappMessage = buildWhatsappMessage(data);

  showModal({
    title: "Order Submitted",
    message: "Your order details have been prepared and saved. Continue to WhatsApp now so we can confirm dispatch.",
    proceedLabel: "Continue to WhatsApp",
    onProceed: () => openWhatsApp(whatsappMessage),
  });
}

function handleOrderViaWhatsApp() {
  const data = getFormData();
  if (!validateForm(data)) return;
  const payload = createOrderPayload(data);
  saveOrder(payload);
  renderOrders();
  const whatsappMessage = buildWhatsappMessage(data);

  showModal({
    title: "Details Ready",
    message: "We have prepared your order details. Continue to WhatsApp to complete confirmation.",
    proceedLabel: "Open WhatsApp",
    onProceed: () => openWhatsApp(whatsappMessage),
  });
}

function setupDashboardActions() {
  const exportBtn = document.getElementById("exportOrders");
  const clearBtn = document.getElementById("clearOrders");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const orders = getSavedOrders();
      const blob = new Blob([JSON.stringify(orders, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sg-wellness-orders.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const confirmed = window.confirm("Clear all saved orders on this device?");
      if (!confirmed) return;
      localStorage.removeItem(ORDER_STORAGE_KEY);
      renderOrders();
    });
  }
}

function setupModalActions() {
  if (modalProceedBtn) {
    modalProceedBtn.addEventListener("click", () => {
      const action = modalAction;
      closeModal();
      if (action) action();
    });
  }
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  }
}

function init() {
  if (!guardAdminAccess()) return;
  setYear();
  setConfigText();
  attachImageFallbacks();
  setupNav();
  setupGallery();
  setupFaq();
  setupRevealAnimations();
  bindWhatsAppButtons();
  setupCommitmentButtons();
  setupDashboardActions();
  setupModalActions();
  renderOrders();
  updateSummary();

  if (quantityInput) {
    quantityInput.addEventListener("input", updateSummary);
    quantityInput.addEventListener("change", updateSummary);
  }

  if (orderForm) orderForm.addEventListener("submit", handleOrderSubmit);
  if (orderViaWhatsApp) orderViaWhatsApp.addEventListener("click", handleOrderViaWhatsApp);
}

document.addEventListener("DOMContentLoaded", init);
