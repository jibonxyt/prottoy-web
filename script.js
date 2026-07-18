/*
  প্রত্যয় ওয়েবসাইট — script.js
  ------------------------------------------------------------------
  বিভাগসমূহ:
    01. ডেটা (রক্তদাতা ও নোটিশ)  — নতুন তথ্য যোগ করতে এই অংশ সম্পাদনা করুন
    02. সাধারণ হেল্পার
    03. নোটিশ বোর্ড
    04. রক্তদাতা তালিকা ও ফিল্টার
    05. ফর্ম ভ্যালিডেশন (রক্তের আবেদন, রক্তদাতা নিবন্ধন, যোগাযোগ)
    06. লগইন / নিবন্ধন (ডেমো — localStorage)
    07. দান রসিদ জেনারেটর (PDF / প্রিন্ট / ছবি / QR)
    08. নেভিগেশন, স্ক্রল-স্পাই, রিভিল অ্যানিমেশন
  গুরুত্বপূর্ণ: রক্তদাতার অনুমতি ছাড়া ব্যক্তিগত ফোন নম্বর প্রকাশ করবেন না।
*/

"use strict";

/* ================================================================
   01. ডেটা
   ================================================================ */

let DONORS = []; // Live Data from Firebase

/* ডিফল্ট নোটিশ — Firebase-এ সংযোগ না হলে ফলব্যাক হিসেবে দেখানো হয়।
   নোটিশ এখন এডমিন প্যানেল (admin.html) থেকে ম্যানেজ করা হয়। */
let NOTICES = [
  {
    id: 1,
    category: "রক্তদান",
    date: "2026-07-01",
    title: "রক্তদাতা নিবন্ধন চলছে",
    description: "নতুন রক্তদাতা হিসেবে যুক্ত হতে ওয়েবসাইটের নিবন্ধন ফর্ম পূরণ করুন। আপনার সম্মতিক্রমেই তথ্য তালিকায় প্রকাশিত হবে।",
    important: true
  },
  {
    id: 2,
    category: "সাংগঠনিক",
    date: "2026-06-15",
    title: "গঠনতন্ত্র ২য় সংস্করণ প্রকাশিত",
    description: "প্রত্যয়ের গঠনতন্ত্রের ২য় সংস্করণ ওয়েবসাইটে PDF আকারে পাওয়া যাচ্ছে। গঠনতন্ত্র সেকশন থেকে পড়ুন বা ডাউনলোড করুন।",
    important: false
  },
  {
    id: 3,
    category: "তথ্য হালনাগাদ",
    date: "2026-06-01",
    title: "রক্তদাতা তালিকা হালনাগাদ",
    description: "তালিকাভুক্ত রক্তদাতাদের উপলভ্যতা ও যোগাযোগের তথ্য হালনাগাদ করা হচ্ছে। ভুল তথ্য চোখে পড়লে যোগাযোগ ফর্মে জানান।",
    important: false
  }
];

/* ================================================================
   02. সাধারণ হেল্পার
   ================================================================ */

const $ = id => document.getElementById(id);

const bnNumber = value => new Intl.NumberFormat("bn-BD").format(value);

const bnMoney = value => `৳ ${new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 2 }).format(value)}`;

const formatDate = dateString => {
  if (!dateString) return "তথ্য নেই";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "তথ্য নেই";
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric" }).format(date);
};

const escapeHTML = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const BD_PHONE = /^01[3-9]\d{8}$/;

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/* বাইরের লাইব্রেরি (jsPDF, html2canvas, QRCode) প্রয়োজনের সময় একবারই লোড হয় */
const scriptCache = {};
function loadScript(src) {
  if (!scriptCache[src]) {
    scriptCache[src] = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = resolve;
      el.onerror = () => {
        delete scriptCache[src];
        reject(new Error(`লোড করা যায়নি: ${src}`));
      };
      document.head.appendChild(el);
    });
  }
  return scriptCache[src];
}

/* ================================================================
   03. নোটিশ বোর্ড
   ================================================================ */

function renderNotices() {
  const sorted = [...NOTICES].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (!sorted.length) {
    $("noticeGrid").innerHTML = `
      <p style="grid-column:1/-1; text-align:center; color:var(--muted, #666); padding:30px 10px;">
        এই মুহূর্তে কোনো নোটিশ নেই।
      </p>`;
    $("noticeCount").textContent = bnNumber(0);
    return;
  }

  $("noticeGrid").innerHTML = sorted.map(notice => `
    <article class="notice-card ${notice.important ? "important" : ""}">
      <div class="notice-meta">
        <span class="notice-category">${escapeHTML(notice.category)}</span>
        <time class="notice-date" datetime="${escapeHTML(notice.date)}">${formatDate(notice.date)}</time>
      </div>
      <h3>${escapeHTML(notice.title)}</h3>
      <p>${escapeHTML(notice.description)}</p>
      ${notice.important ? '<span class="important-tag">● গুরুত্বপূর্ণ</span>' : ""}
    </article>
  `).join("");

  $("noticeCount").textContent = bnNumber(sorted.length);
}

/* ================================================================
   04. রক্তদাতা তালিকা ও ফিল্টার
   ================================================================ */

/* নিবন্ধন ফর্ম থেকে যুক্ত রক্তদাতারা এখন শুধুমাত্র অনুমোদিত দাতারা দেখা যায় */
function getRegisteredDonors() {
  // এখন localStorage থেকে নয়, সরাসরি DONORS থেকে আসে যা Firebase থেকে অনুমোদিত দাতা নিয়ে আসে
  return [];
}

function getAllDonors() {
  return DONORS.concat(getRegisteredDonors());
}

function populateLocationFilters() {
  const donors = getAllDonors();
  const fill = (selectId, values, allLabel) => {
    const select = $(selectId);
    const current = select.value;
    select.innerHTML = `<option value="">${allLabel}</option>` +
      values.map(v => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");
    select.value = values.includes(current) ? current : "";
  };

  const unique = key => [...new Set(donors.map(d => d[key]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "bn"));

  fill("districtFilter", unique("district"), "সব জেলা");
  fill("upazilaFilter", unique("upazila"), "সব উপজেলা");
}

function getFilteredDonors() {
  const term = $("searchInput").value.trim().toLocaleLowerCase("bn");
  const bloodGroup = $("bloodFilter").value;
  const district = $("districtFilter").value;
  const upazila = $("upazilaFilter").value;
  const availableOnly = $("availableOnly").checked;

  return getAllDonors().filter(donor => {
    const searchable = [donor.name, donor.district, donor.upazila, donor.area]
      .join(" ")
      .toLocaleLowerCase("bn");

    return (!term || searchable.includes(term)) &&
      (!bloodGroup || donor.bloodGroup === bloodGroup) &&
      (!district || donor.district === district) &&
      (!upazila || donor.upazila === upazila) &&
      (!availableOnly || donor.available);
  });
}

function renderDonors() {
  const filtered = getFilteredDonors();

  $("donorGrid").innerHTML = filtered.map(donor => {
    const realPhone = Boolean(donor.phone) && !donor.phone.includes("X");
    const callable = realPhone && donor.available;
    return `
      <article class="donor-card">
        <div class="donor-head">
          <div>
            <h3>${escapeHTML(donor.name)}</h3>
            <p class="donor-location">${escapeHTML(donor.area)}${donor.upazila ? `, ${escapeHTML(donor.upazila)}` : ""}</p>
            <span class="status ${donor.available ? "available" : "unavailable"}">
              ${donor.available ? "বর্তমানে উপলভ্য" : "বর্তমানে অনুপলভ্য"}
            </span>
          </div>
          <span class="blood-badge">${escapeHTML(donor.bloodGroup)}</span>
        </div>
        <div class="donor-info">
          <div><span>জেলা</span><strong>${escapeHTML(donor.district || "তথ্য নেই")}</strong></div>
          <div><span>শেষ রক্তদান</span><strong>${formatDate(donor.lastDonation)}</strong></div>
          <div><span>যোগাযোগ</span><strong>${escapeHTML(donor.phone || "প্রকাশিত নয়")}</strong></div>
        </div>
        ${callable
          ? `<a class="phone-link" href="tel:${donor.phone.replace(/\D/g, "")}">কল করুন</a>`
          : '<span class="phone-link disabled" aria-disabled="true">যোগাযোগ নম্বর প্রকাশিত নয়</span>'}
      </article>
    `;
  }).join("");

  $("emptyState").hidden = filtered.length !== 0;
  $("resultCount").textContent = bnNumber(filtered.length);
  $("donorCount").textContent = bnNumber(getAllDonors().length);

  const labels = [];
  if ($("bloodFilter").value) labels.push($("bloodFilter").value);
  if ($("districtFilter").value) labels.push($("districtFilter").value);
  if ($("upazilaFilter").value) labels.push($("upazilaFilter").value);
  const term = $("searchInput").value.trim();
  if (term) labels.push(`“${term}”`);
  if ($("availableOnly").checked) labels.push("উপলভ্য");

  $("activeFilterText").textContent = labels.length ? labels.join(" • ") : "সকল রক্তদাতা";
}

function bindFilters() {
  ["searchInput", "bloodFilter", "districtFilter", "upazilaFilter", "availableOnly"].forEach(id => {
    $(id).addEventListener(id === "searchInput" ? "input" : "change", renderDonors);
  });

  $("resetFilters").addEventListener("click", () => {
    $("searchInput").value = "";
    $("bloodFilter").value = "";
    $("districtFilter").value = "";
    $("upazilaFilter").value = "";
    $("availableOnly").checked = false;
    renderDonors();
  });
}

/* ================================================================
   05. ফর্ম ভ্যালিডেশন
   ================================================================ */

function setFieldError(input, message) {
  const field = input.closest(".field");
  if (!field) return;
  const errorEl = field.querySelector(".field-error");
  field.classList.toggle("has-error", Boolean(message));
  if (errorEl) {
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  }
}

/*
  rules: { fieldName: [{ test(value, form) => boolean, message }] }
  সব নিয়ম পাস করলে true, নাহলে প্রথম ভুল ফিল্ডে ফোকাস দিয়ে false।
*/
function validateForm(form, rules) {
  let firstInvalid = null;

  Object.entries(rules).forEach(([name, checks]) => {
    const input = form.elements[name];
    if (!input) return;
    const value = input.type === "checkbox" ? input.checked : input.value.trim();
    const failed = checks.find(check => !check.test(value, form));
    setFieldError(input, failed ? failed.message : "");
    if (failed && !firstInvalid) firstInvalid = input;
  });

  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

function bindLiveValidation(form) {
  form.addEventListener("input", event => {
    if (event.target.closest(".field")) setFieldError(event.target, "");
  });
}

function showSuccess(el, message) {
  el.textContent = message;
  el.hidden = false;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.hidden = true; }, 6000);
}

const required = message => ({ test: v => v !== "" && v !== false, message });
const phoneRule = { test: v => !v || BD_PHONE.test(v), message: "সঠিক মোবাইল নম্বর লিখুন (যেমন: 01712345678)" };

function setupRequestForm() {
  const form = $("requestForm");
  bindLiveValidation(form);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const ok = validateForm(form, {
      patientName: [required("রোগীর নাম লিখুন")],
      bloodGroup: [required("রক্তের গ্রুপ নির্বাচন করুন")],
      bags: [
        required("ব্যাগ সংখ্যা লিখুন"),
        { test: v => Number(v) >= 1 && Number(v) <= 10, message: "১ থেকে ১০ ব্যাগের মধ্যে লিখুন" }
      ],
      neededDate: [
        required("তারিখ নির্বাচন করুন"),
        { test: v => v >= getLocalDateString(), message: "অতীতের তারিখ দেওয়া যাবে না" }
      ],
      hospital: [required("হাসপাতাল বা স্থানের নাম লিখুন")],
      phone: [required("যোগাযোগ নম্বর লিখুন"), phoneRule]
    });
    if (!ok) return;

    // Get form data
    const patientName = form.elements.patientName.value.trim();
    const bloodGroup = form.elements.bloodGroup.value;
    const bags = form.elements.bags.value;
    const neededDate = form.elements.neededDate.value;
    const hospital = form.elements.hospital.value.trim();
    const phone = form.elements.phone.value.trim();
    const requesterName = form.elements.requesterName?.value.trim() || "";

    const requestData = {
      patientName,
      bloodGroup,
      bags,
      neededDate,
      hospital,
      phone,
      requesterName,
      requestDate: new Date().toISOString(),
      status: "pending"
    };

    // Save to Firestore and send email
    try {
      // Save to Firebase bloodRequests collection
      if (window.firebaseDb && window.firebaseAddDoc && window.firebaseCollection) {
        await window.firebaseAddDoc(
          window.firebaseCollection(window.firebaseDb, "bloodRequests"),
          requestData
        );
      }
      
      // Send email notification to admin
      try {
        await fetch("http://localhost:5000/api/send-blood-request-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData)
        });
      } catch (error) {
        console.warn("Email notification failed:", error);
      }

      form.reset();
      showSuccess($("requestSuccess"), "✔ আবেদন গৃহীত হয়েছে এবং আমাদের এডমিন টিমকে জানানো হয়েছে। আমাদের স্বেচ্ছাসেবকরা দ্রুত যোগাযোগ করবেন।");
    } catch (error) {
      console.error("Blood request error:", error);
      form.reset();
      showSuccess($("requestSuccess"), "✔ আবেদন গৃহীত হয়েছে। আমাদের স্বেচ্ছাসেবকরা দ্রুত যোগাযোগ করবেন।");
    }
  });
}

function setupDonorForm() {
  const form = $("donorForm");
  bindLiveValidation(form);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const ok = validateForm(form, {
      name: [required("আপনার নাম লিখুন")],
      bloodGroup: [required("রক্তের গ্রুপ নির্বাচন করুন")],
      phone: [required("মোবাইল নম্বর লিখুন"), phoneRule],
      district: [required("জেলার নাম লিখুন")],
      upazila: [required("উপজেলার নাম লিখুন")],
      area: [required("এলাকা বা গ্রামের নাম লিখুন")],
      lastDonation: [{ test: v => !v || v <= getLocalDateString(), message: "ভবিষ্যতের তারিখ দেওয়া যাবে না" }],
      consent: [required("তথ্য প্রকাশে সম্মতি দিতে হবে")]
    });
    if (!ok) return;

    const donorData = {
      name: form.elements.name.value.trim(),
      bloodGroup: form.elements.bloodGroup.value,
      district: form.elements.district.value.trim(),
      upazila: form.elements.upazila.value.trim(),
      area: form.elements.area.value.trim(),
      phone: form.elements.phone.value.trim(),
      available: true,
      lastDonation: form.elements.lastDonation.value,
      registrationDate: new Date().toISOString(),
      status: "pending"
    };

    try {
      // Save to Firebase pendingDonors collection (requires admin approval)
      if (window.firebaseDb && window.firebaseAddDoc && window.firebaseCollection) {
        await window.firebaseAddDoc(
          window.firebaseCollection(window.firebaseDb, "pendingDonors"),
          donorData
        );
        
        // Send email notification to admin
        try {
          await fetch("http://localhost:5000/api/send-donor-registration-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(donorData)
          });
        } catch (error) {
          console.warn("Email notification failed:", error);
        }

        form.reset();
        showSuccess($("donorSuccess"), "✔ নিবন্ধন সফল! আমাদের প্রশাসক দল যাচাই করার পরে আপনার নাম তালিকায় দেখা যাবে। ধন্যবাদ!");
      } else {
        throw new Error("Firebase not initialized");
      }
    } catch (error) {
      console.error("Registration error:", error);
      showSuccess($("donorSuccess"), "⚠ নিবন্ধনে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।");
    }
  });
}

function setupContactForm() {
  const form = $("contactForm");
  bindLiveValidation(form);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const ok = validateForm(form, {
      name: [required("আপনার নাম লিখুন")],
      email: [
        required("ইমেইল ঠিকানা লিখুন"),
        { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: "সঠিক ইমেইল ঠিকানা লিখুন" }
      ],
      message: [
        required("বার্তা লিখুন"),
        { test: v => v.length >= 10, message: "বার্তাটি কমপক্ষে ১০ অক্ষরের হতে হবে" }
      ]
    });
    if (!ok) return;

    // Get form data
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const subject = form.elements.subject.value.trim();
    const message = form.elements.message.value.trim();

    const contactData = {
      name,
      email,
      subject,
      message,
      messageDate: new Date().toISOString(),
      status: "new"
    };

    showSuccess($("contactSuccess"), "বার্তা পাঠানো হচ্ছে...");

    try {
      // Save to Firebase contactMessages collection
      if (window.firebaseDb && window.firebaseAddDoc && window.firebaseCollection) {
        await window.firebaseAddDoc(
          window.firebaseCollection(window.firebaseDb, "contactMessages"),
          contactData
        );
      }
      
      // Also send email notification to admin
      try {
        await fetch("http://localhost:5000/api/send-contact-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactData)
        });
      } catch (error) {
        console.warn("Email notification failed:", error);
      }

      form.reset();
      showSuccess($("contactSuccess"), "✔ বার্তা সফলভাবে পাঠানো হয়েছে। ধন্যবাদ!");
    } catch (error) {
      console.error("Contact form error:", error);
      showSuccess($("contactSuccess"), "⚠ বার্তা পাঠাতে ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।");
    }
  });
}

/* ================================================================
   06. লগইন / নিবন্ধন (ডেমো — শুধু এই ব্রাউজারে localStorage-এ থাকে)
   ================================================================ */

function getUsers() {
  try {
    const users = JSON.parse(localStorage.getItem("prottoy-users")) ?? [];
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function setupAuth() {
  const modal = $("authModal");
  const loginBtn = $("loginBtn");
  const loginForm = $("loginForm");
  const registerForm = $("registerForm");

  const currentUser = () => localStorage.getItem("prottoy-session");

  const refreshLoginBtn = () => {
    const user = currentUser();
    loginBtn.textContent = user ? "লগআউট" : "লগইন";
    loginBtn.title = user ? `লগইন করা আছে: ${user}` : "";
  };

  const openModal = () => {
    modal.hidden = false;
    document.body.classList.add("modal-open");
    loginForm.elements.phone.focus();
  };
  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  };

  loginBtn.addEventListener("click", () => {
    if (currentUser()) {
      localStorage.removeItem("prottoy-session");
      refreshLoginBtn();
    } else {
      openModal();
    }
  });

  $("authClose").addEventListener("click", closeModal);
  modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });

  const switchTab = showLogin => {
    $("tabLogin").classList.toggle("active", showLogin);
    $("tabRegister").classList.toggle("active", !showLogin);
    $("tabLogin").setAttribute("aria-selected", String(showLogin));
    $("tabRegister").setAttribute("aria-selected", String(!showLogin));
    loginForm.hidden = !showLogin;
    registerForm.hidden = showLogin;
  };
  $("tabLogin").addEventListener("click", () => switchTab(true));
  $("tabRegister").addEventListener("click", () => switchTab(false));

  bindLiveValidation(loginForm);
  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const ok = validateForm(loginForm, {
      phone: [required("মোবাইল নম্বর লিখুন"), phoneRule],
      password: [required("পাসওয়ার্ড লিখুন")]
    });
    if (!ok) return;

    const phone = loginForm.elements.phone.value.trim();
    const password = loginForm.elements.password.value;
    const user = getUsers().find(u => u.phone === phone && u.password === password);

    if (!user) {
      setFieldError(loginForm.elements.password, "মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়");
      return;
    }

    localStorage.setItem("prottoy-session", user.name);
    loginForm.reset();
    refreshLoginBtn();
    showSuccess($("loginMsg"), `✔ স্বাগতম, ${user.name}!`);
    setTimeout(closeModal, 1200);
  });

  bindLiveValidation(registerForm);
  registerForm.addEventListener("submit", event => {
    event.preventDefault();
    const ok = validateForm(registerForm, {
      name: [required("আপনার নাম লিখুন")],
      phone: [
        required("মোবাইল নম্বর লিখুন"),
        phoneRule,
        { test: v => !getUsers().some(u => u.phone === v), message: "এই নম্বরে আগে থেকেই অ্যাকাউন্ট রয়েছে" }
      ],
      password: [
        required("পাসওয়ার্ড লিখুন"),
        { test: v => v.length >= 6, message: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে" }
      ],
      confirm: [
        required("পাসওয়ার্ড আবার লিখুন"),
        { test: (v, f) => v === f.elements.password.value, message: "দুটি পাসওয়ার্ড মিলছে না" }
      ]
    });
    if (!ok) return;

    const users = getUsers();
    users.push({
      name: registerForm.elements.name.value.trim(),
      phone: registerForm.elements.phone.value.trim(),
      password: registerForm.elements.password.value
    });
    localStorage.setItem("prottoy-users", JSON.stringify(users));

    registerForm.reset();
    showSuccess($("registerMsg"), "✔ নিবন্ধন সম্পন্ন! এবার লগইন করুন।");
    setTimeout(() => switchTab(true), 1200);
  });

  refreshLoginBtn();
}

/* ================================================================
   07. দান রসিদ জেনারেটর
   ================================================================ */

const CDN = {
  html2canvas: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  qrcode: "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
};

function nextReceiptNumber() {
  const key = "prottoy-receipt-serial";
  const serial = (parseInt(localStorage.getItem(key), 10) || 0) + 1;
  localStorage.setItem(key, String(serial));
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `PRT-${ymd}-${String(serial).padStart(4, "0")}`;
}

async function updateReceiptPreview(form) {
  const receiptNo = nextReceiptNumber();
  const today = new Date();
  const name = form.elements.donorName.value.trim();
  const amount = Number(form.elements.amount.value);
  const cause = form.elements.cause.value;
  const signatory = form.elements.signatory.value.trim();
  const withQr = form.elements.withQr.checked;

  $("rcNumber").textContent = receiptNo;
  $("rcDate").textContent = new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric" }).format(today);
  $("rcName").textContent = name;
  $("rcCause").textContent = cause;
  $("rcAmount").textContent = bnMoney(amount);
  $("rcSignatory").textContent = signatory ? `${signatory} — অনুমোদিত স্বাক্ষর` : "অনুমোদিত স্বাক্ষর";

  const qrBox = $("rcQr");
  qrBox.innerHTML = "";
  if (withQr) {
    try {
      await loadScript(CDN.qrcode);
      new QRCode(qrBox, {
        text: `Prottoy Donation Receipt\nNo: ${receiptNo}\nName: ${name}\nAmount: ${amount} BDT\nCause: ${cause}\nDate: ${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
        width: 74,
        height: 74,
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch {
      /* QR ঐচ্ছিক — লাইব্রেরি লোড না হলে রসিদ QR ছাড়াই তৈরি হবে */
    }
  }
  return receiptNo;
}

async function receiptToCanvas() {
  await loadScript(CDN.html2canvas);
  return html2canvas($("receiptPaper"), { scale: 2, backgroundColor: "#ffffff", useCORS: true });
}

/* রসিদের তথ্য Firebase-এর "receipts" কালেকশনে সেভ হয় — এডমিন প্যানেল থেকে দেখা যায় */
async function saveReceiptRecord(record) {
  try {
    if (window.firebaseDb && window.firebaseAddDoc && window.firebaseCollection) {
      await window.firebaseAddDoc(
        window.firebaseCollection(window.firebaseDb, "receipts"),
        record
      );
    }
  } catch (error) {
    console.warn("Receipt save to Firebase failed:", error);
  }
}

function setupReceiptGenerator() {
  const form = $("receiptForm");
  const statusEl = $("receiptStatus");
  bindLiveValidation(form);
  let action = "pdf";

  form.querySelectorAll("button[data-action]").forEach(button => {
    button.addEventListener("click", () => { action = button.dataset.action; });
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const ok = validateForm(form, {
      donorName: [required("দাতার নাম লিখুন")],
      amount: [
        required("পরিমাণ লিখুন"),
        { test: v => Number(v) > 0, message: "পরিমাণ শূন্যের বেশি হতে হবে" }
      ],
      cause: [required("খাত নির্বাচন করুন")]
    });
    if (!ok) return;

    try {
      showSuccess(statusEl, "রসিদ তৈরি হচ্ছে…");
      const receiptNo = await updateReceiptPreview(form);

      // রসিদের রেকর্ড এডমিন প্যানেলের জন্য Firebase-এ সেভ (ব্যর্থ হলেও রসিদ তৈরি চলবে)
      saveReceiptRecord({
        receiptNo,
        donorName: form.elements.donorName.value.trim(),
        amount: Number(form.elements.amount.value),
        cause: form.elements.cause.value,
        signatory: form.elements.signatory.value.trim(),
        method: action,
        createdAt: new Date().toISOString()
      });

      if (action === "print") {
        showSuccess(statusEl, "✔ প্রিন্ট ডায়ালগ খোলা হয়েছে।");
        window.print();
        return;
      }

      const canvas = await receiptToCanvas();

      if (action === "image") {
        const link = document.createElement("a");
        link.download = `${receiptNo}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        showSuccess(statusEl, "✔ রসিদ ছবি হিসেবে ডাউনলোড হয়েছে।");
        return;
      }

      await loadScript(CDN.jspdf);
      const pdf = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, imgWidth, imgHeight);
      pdf.save(`${receiptNo}.pdf`);
      showSuccess(statusEl, "✔ রসিদ PDF হিসেবে ডাউনলোড হয়েছে।");
    } catch (error) {
      showSuccess(statusEl, "⚠ রসিদ তৈরি করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।");
      console.warn("Receipt generation failed:", error.message);
    }
  });
}

/* ================================================================
   08. নেভিগেশন, স্ক্রল-স্পাই ও রিভিল অ্যানিমেশন
   ================================================================ */

function setupNavigation() {
  const button = $("menuToggle");
  const nav = $("mainNav");

  button.addEventListener("click", event => {
    event.stopPropagation();
    const open = nav.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
  });

  nav.addEventListener("click", event => {
    if (event.target.tagName === "A" || event.target.id === "loginBtn") {
      nav.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("click", event => {
    if (!nav.contains(event.target) && !button.contains(event.target)) {
      if (nav.classList.contains("open")) {
        nav.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
      }
    }
  });
}

function setupScrollSpy() {
  const links = [...document.querySelectorAll(".main-nav a[href^='#']")];
  const sections = links
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link =>
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`)
      );
    });
  }, { rootMargin: "-40% 0px -55% 0px" });

  sections.forEach(section => spy.observe(section));
}

function setupRevealAnimations() {
  const targets = document.querySelectorAll(
    ".section-heading, .activity-card, .notice-card, .donor-card, .principles-grid article, .about-main-card, .form-card, .receipt-preview-wrap, .constitution-card, .stats-grid article"
  );
  targets.forEach(el => el.classList.add("reveal"));

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach(el => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(el => observer.observe(el));
}

function setupBackToTop() {
  const button = $("backToTop");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      button.classList.toggle("show", window.scrollY > 700);
      ticking = false;
    });
  }, { passive: true });
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ================================================================
   09. Firebase ও অনলাইন ফর্ম
   ================================================================ */

async function initFirebaseAndFetchDonors() {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getFirestore, collection, getDocs, addDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    const firebaseConfig = {
      apiKey: "AIzaSyAb732hZhpSMR877ox2rrud1GHN11FyI1s",
      authDomain: "blood-donation-admin-36846.firebaseapp.com",
      projectId: "blood-donation-admin-36846",
      storageBucket: "blood-donation-admin-36846.firebasestorage.app",
      messagingSenderId: "309452152511",
      appId: "1:309452152511:web:188fa5ea9be30e7c0c300a",
      measurementId: "G-GG1JFNSW9P"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Make Firebase globally available for forms
    window.firebaseDb = db;
    window.firebaseAddDoc = addDoc;
    window.firebaseCollection = collection;

    // রক্তদাতা লোড
    try {
      const querySnapshot = await getDocs(collection(db, "donors"));
      const fetchedDonors = [];
      querySnapshot.forEach((doc) => {
        fetchedDonors.push({ id: doc.id, ...doc.data() });
      });

      DONORS = fetchedDonors;
      populateLocationFilters();
      renderDonors();
    } catch (error) {
      console.error("Error fetching donors from Firestore: ", error);
    }

    // নোটিশ লোড — এডমিন প্যানেল থেকে ম্যানেজ করা নোটিশগুলো "notices" কালেকশনে থাকে
    try {
      const noticeSnapshot = await getDocs(collection(db, "notices"));
      const fetchedNotices = [];
      noticeSnapshot.forEach((doc) => {
        fetchedNotices.push({ id: doc.id, ...doc.data() });
      });

      NOTICES = fetchedNotices;
      renderNotices();
    } catch (error) {
      console.warn("Notices fetch failed, showing default notices:", error);
    }
  } catch (error) {
    console.error("Firebase init error: ", error);
  }
}

function injectGoogleFormsSection() {
  const formsData = [
    { title: "টিউবওয়েল আবেদন", icon: "fa-solid fa-tint", link: "https://forms.gle/qJJN9jSNS6PbxrVt6", color: "#08bfe7" },
    { title: "শীতবস্ত্র আবেদন", icon: "fa-solid fa-snowflake", link: "https://forms.gle/kb5ozmsSGzrXQFmZ8", color: "#087b3e" },
    { title: "সদস্য ফর্ম", icon: "fa-solid fa-users", link: "https://forms.gle/FKyNoSisCo4jXYbj9", color: "#f79009" },
    { title: "ঘর নির্মাণ আবেদন", icon: "fa-solid fa-house-damage", link: "https://forms.gle/bqZFdhKyJe4bS5fU7", color: "#ed1c24" },
    { title: "প্রত্যয় চিকিৎসা সহায়তা", icon: "fa-solid fa-stethoscope", link: "https://forms.gle/gMu9eK76CmSQtLFp6", color: "#607267" },
    { title: "তেল-মশলা বিতরণ", icon: "fa-solid fa-box-open", link: "https://forms.gle/7Ayqh2TZijWuuNfb9", color: "#84f000" }
  ];

  if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement("link");
    faLink.rel = "stylesheet";
    faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    document.head.appendChild(faLink);
  }

  const sectionHtml = `
    <section class="section soft-section" id="online-forms">
      <div class="container">
        <div class="section-heading center-heading reveal">
          <span class="eyebrow">অনলাইন সেবা</span>
          <h2>প্রয়োজনীয় আবেদন ফর্মসমূহ</h2>
          <p>যেকোনো সেবার জন্য সরাসরি নিচের ফর্মগুলো পূরণ করুন।</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 30px;">
          ${formsData.map(form => `
            <a href="${form.link}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 15px; padding: 20px; border-radius: 16px; background: #fff; border: 1px solid var(--line); box-shadow: 0 10px 30px rgba(16,61,38,.04); text-decoration: none; color: inherit; transition: transform 0.3s ease, box-shadow 0.3s ease;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 15px 40px rgba(16,61,38,.12)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 10px 30px rgba(16,61,38,.04)';">
              <div style="width: 54px; height: 54px; border-radius: 14px; background: ${form.color}15; display: flex; align-items: center; justify-content: center; color: ${form.color}; font-size: 1.5rem; flex-shrink: 0;">
                <i class="${form.icon}"></i>
              </div>
              <h3 style="margin: 0; font-size: 1.1rem; color: var(--ink); font-weight: 700;">${form.title}</h3>
              <i class="fa-solid fa-arrow-right" style="margin-left: auto; color: var(--muted); font-size: 0.9rem;"></i>
            </a>
          `).join('')}
        </div>
      </div>
    </section>
  `;

  const activitiesSection = document.getElementById('activities');
  if (activitiesSection) {
    activitiesSection.insertAdjacentHTML('afterend', sectionHtml);
  } else {
    document.querySelector('main').insertAdjacentHTML('beforeend', sectionHtml);
  }
}

/* ================================================================
   চালু করা
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  $("currentYear").textContent = bnNumber(new Date().getFullYear());

  renderNotices();
  
  // Initialize Firebase and Fetch Donors
  initFirebaseAndFetchDonors();
  
  // Inject Google Forms section
  injectGoogleFormsSection();

  populateLocationFilters();
  bindFilters();
  renderDonors();

  setupRequestForm();
  setupDonorForm();
  setupContactForm();
  setupAuth();
  setupReceiptGenerator();

  setupNavigation();
  setupScrollSpy();
  setupRevealAnimations();
  setupBackToTop();
});
