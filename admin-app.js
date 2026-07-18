import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAb732hZhpSMR877ox2rrud1GHN11FyI1s",
  authDomain: "blood-donation-admin-36846.firebaseapp.com",
  projectId: "blood-donation-admin-36846",
  storageBucket: "blood-donation-admin-36846.firebasestorage.app",
  messagingSenderId: "309452152511",
  appId: "1:309452152511:web:188fa5ea9be30e7c0c300a",
  measurementId: "G-GG1JFNSW9P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Backend API URL (Update this when deploying)
const API_URL = "http://localhost:5000"; // For local dev, use "http://your-domain.com" for production

// DOM Elements
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const donorTableBody = document.getElementById("donorTableBody");
const logoutBtn = document.getElementById("logoutBtn");

// 🔐 Login Logic
function showLoginError(msg) {
  if (loginError) {
    loginError.innerHTML = msg;
    loginError.style.display = "block";
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginError) loginError.style.display = "none";

    const loginBtn = document.getElementById("loginBtn");
    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const password = document.getElementById("loginPassword")?.value || "";

    if (!email || !password) {
      showLoginError("ইমেইল এবং পাসওয়ার্ড উভয়ই দিন।");
      return;
    }

    // Loading state
    if (loginBtn) { loginBtn.textContent = "লন্ডিং..."; loginBtn.disabled = true; }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✔ সফলভাবে লগইন হয়েছে:", userCredential.user.email);
    } catch (error) {
      console.error("লগইন এরর:", error.code, error.message);

      // বিস্তারিত বাংলা error message
      const errorMessages = {
        "auth/invalid-credential":    "ভুল ইমেইল অথবা পাসওয়ার্ড। আবার চেষ্টা করুন।",
        "auth/user-not-found":         "এই ইমেইল দিয়ে কোনো অ্যাডমিন অ্যাকাউন্ট নেই।",
        "auth/wrong-password":         "পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।",
        "auth/invalid-email":          "ইমেইল ফরম্যাট সঠিক নয়।",
        "auth/too-many-requests":      "অনেকবার ভুল পাসওয়ার্ড দেওয়ায় অ্যাকাউন্ট সাময়িকভাবে ব্লক হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।",
        "auth/network-request-failed": "ইন্টারনেট সংযোগ নেই। ইন্টারনেট চেক করে আবার চেষ্টা করুন।",
        "auth/user-disabled":          "এই অ্যাকাউন্ট ব্লক করা হয়েছে।",
      };

      const msg = errorMessages[error.code]
        || `লগইন ব্যর্থ: ${error.code}`;
      showLoginError(msg);
    } finally {
      if (loginBtn) { loginBtn.textContent = "Login"; loginBtn.disabled = false; }
    }
  });
}

// Logout Logic
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        console.log("Logged out successfully");
        location.reload();
      })
      .catch((error) => console.error("Logout error:", error));
  });
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (loginSection) loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "block";
    loadDonors();
    loadPendingRegistrations();
    loadBloodRequests();
    loadContactMessages();
    loadReceipts();
    loadNotices();
  } else {
    if (loginSection) loginSection.style.display = "flex";
    if (dashboardSection) dashboardSection.style.display = "none";
  }
});

// Load Donors from Firestore
async function loadDonors() {
  if (!donorTableBody) return;
  
  donorTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">ডাটা লোড হচ্ছে...</td></tr>';
  
  try {
    const querySnapshot = await getDocs(collection(db, "donors"));
    donorTableBody.innerHTML = '';
    
    if (querySnapshot.empty) {
      donorTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">কোনো অনুমোদিত রক্তদাতা পাওয়া যায়নি।</td></tr>';
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      const isAvailable = data.available !== false;
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(data.name)}</strong></td>
        <td>${escapeHtml(data.phone)}</td>
        <td><span style="color:#dc3545; font-weight:bold;">${escapeHtml(data.bloodGroup)}</span></td>
        <td>${escapeHtml(data.area || data.location || 'N/A')}, ${escapeHtml(data.district || '')}</td>
        <td>
          <span class="status-badge ${isAvailable ? 'status-active' : 'status-inactive'}">
            ${isAvailable ? 'উপলভ্য' : 'অনুপলভ্য'}
          </span>
        </td>
        <td class="action-btns">
          <button class="btn-toggle" onclick="window.toggleStatus('${id}', ${isAvailable})">পরিবর্তন</button>
          <button class="btn-del" onclick="window.deleteDonor('${id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      donorTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading donors:", error);
    donorTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding:20px;">ডাটা লোড করতে ব্যর্থ হয়েছে।</td></tr>';
  }
}

// Delete Donor
window.deleteDonor = async (id) => {
  if (confirm("আপনি কি নিশ্চিত যে এই রক্তদাতার ডাটাটি মুছে ফেলতে চান?")) {
    try {
      await deleteDoc(doc(db, "donors", id));
      console.log("Donor deleted");
      loadDonors();
    } catch (error) {
      console.error("Delete error:", error);
      alert("মুছতে ব্যর্থ হয়েছে");
    }
  }
};

// Toggle Donor Status
window.toggleStatus = async (id, currentStatus) => {
  try {
    await updateDoc(doc(db, "donors", id), { available: !currentStatus });
    console.log("Status updated");
    loadDonors();
  } catch (error) {
    console.error("Toggle status error:", error);
    alert("আপডেট করতে ব্যর্থ হয়েছে");
  }
};

// Add Donor Form
const modal = document.getElementById("addDonorModal");
const addForm = document.getElementById("addDonorForm");
const saveBtn = document.getElementById("saveDonorBtn");

if (document.getElementById("openAddModalBtn")) {
  document.getElementById("openAddModalBtn").addEventListener("click", () => {
    if (modal) modal.style.display = "flex";
  });
}

if (document.getElementById("closeModalBtn")) {
  document.getElementById("closeModalBtn").addEventListener("click", () => {
    if (modal) modal.style.display = "none";
    if (addForm) addForm.reset();
  });
}

if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (saveBtn) {
      saveBtn.textContent = "সেভ হচ্ছে...";
      saveBtn.disabled = true;
    }

    const newDonor = {
      name: document.getElementById("donorName")?.value.trim() || "",
      phone: document.getElementById("donorPhone")?.value.trim() || "",
      bloodGroup: document.getElementById("donorBg")?.value.trim() || "",
      district: document.getElementById("donorDistrict")?.value.trim() || "",
      upazila: document.getElementById("donorUpazila")?.value.trim() || "",
      area: document.getElementById("donorArea")?.value.trim() || "",
      available: true,
      addedDate: new Date().toISOString(),
      addedVia: "Admin Panel"
    };

    // Validate
    if (!newDonor.name || !newDonor.phone || !newDonor.bloodGroup || !newDonor.district || !newDonor.area) {
      alert("সব ফিল্ড পূরণ করুন");
      if (saveBtn) {
        saveBtn.textContent = "রক্তদাতা যোগ করুন";
        saveBtn.disabled = false;
      }
      return;
    }

    try {
      await addDoc(collection(db, "donors"), newDonor);
      
      // Send notification email to admin
      try {
        await fetch(`${API_URL}/api/send-donor-registration-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newDonor)
        });
      } catch (emailError) {
        console.warn("Email notification failed:", emailError);
      }

      if (modal) modal.style.display = "none";
      if (addForm) addForm.reset();
      loadDonors();
      alert("✔ রক্তদাতা সফলভাবে যোগ হয়েছে!");
    } catch (error) {
      console.error("Add donor error:", error);
      alert("ডাটা যোগ করা যায়নি।");
    } finally {
      if (saveBtn) {
        saveBtn.textContent = "রক্তদাতা যোগ করুন";
        saveBtn.disabled = false;
      }
    }
  });
}

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

// ===== PENDING REGISTRATION MANAGEMENT =====

// Load Pending Registrations from Firestore
async function loadPendingRegistrations() {
  const pendingTableBody = document.getElementById("pendingTableBody");
  const pendingCount = document.getElementById("pendingCount");
  const noPendingMsg = document.getElementById("noPendingMsg");
  
  if (!pendingTableBody) return;
  
  try {
    const querySnapshot = await getDocs(collection(db, "pendingDonors"));
    pendingTableBody.innerHTML = '';
    
    if (querySnapshot.empty) {
      pendingTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">নতুন নিবন্ধন পেন্ডিং নেই।</td></tr>';
      if (noPendingMsg) noPendingMsg.style.display = 'inline';
      if (pendingCount) pendingCount.textContent = '0';
      return;
    }
    
    if (noPendingMsg) noPendingMsg.style.display = 'none';
    let count = 0;
    
    querySnapshot.forEach((docSnap) => {
      count++;
      const data = docSnap.data();
      const id = docSnap.id;
      const registrationDate = data.registrationDate ? new Date(data.registrationDate).toLocaleDateString('bn-BD') : 'অজানা';
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(data.name)}</strong></td>
        <td>${escapeHtml(data.phone)}</td>
        <td><span style="color:#dc3545; font-weight:bold;">${escapeHtml(data.bloodGroup)}</span></td>
        <td>${escapeHtml(data.area || 'N/A')}, ${escapeHtml(data.district || '')}</td>
        <td>${registrationDate}</td>
        <td class="action-btns">
          <button class="btn-approve" onclick="window.approvePendingDonor('${id}', '${escapeHtml(data.name)}', '${escapeHtml(data.phone)}')" style="background: #28a745; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 13px;">অনুমোদন</button>
          <button class="btn-reject" onclick="window.rejectPendingDonor('${id}')" style="background: #6c757d; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">বাতিল</button>
        </td>
      `;
      pendingTableBody.appendChild(tr);
    });
    
    if (pendingCount) pendingCount.textContent = count;
  } catch (error) {
    console.error("Error loading pending registrations:", error);
    pendingTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding:20px;">ডাটা লোড করতে ব্যর্থ হয়েছে।</td></tr>';
  }
}

// Load Blood Requests from Firestore
async function loadBloodRequests() {
  const requestsTableBody = document.getElementById("requestsTableBody");
  const requestCount = document.getElementById("requestCount");
  const noRequestsMsg = document.getElementById("noRequestsMsg");
  
  if (!requestsTableBody) return;
  
  try {
    const querySnapshot = await getDocs(collection(db, "bloodRequests"));
    requestsTableBody.innerHTML = '';
    
    if (querySnapshot.empty) {
      requestsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">কোনো রক্তের আবেদন নেই।</td></tr>';
      if (noRequestsMsg) noRequestsMsg.style.display = 'inline';
      if (requestCount) requestCount.textContent = '0';
      return;
    }
    
    if (noRequestsMsg) noRequestsMsg.style.display = 'none';
    let count = 0;
    
    querySnapshot.forEach((docSnap) => {
      count++;
      const data = docSnap.data();
      const id = docSnap.id;
      const requestDate = data.neededDate || 'তারিখ নেই';
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(data.patientName)}</strong></td>
        <td><span style="color:#dc3545; font-weight:bold;">${escapeHtml(data.bloodGroup)}</span></td>
        <td>${escapeHtml(data.bags)}</td>
        <td>${escapeHtml(data.hospital)}</td>
        <td>${requestDate}</td>
        <td>
          <div>${escapeHtml(data.phone)}</div>
          <small style="color: var(--text-muted);">${escapeHtml(data.requesterName || '')}</small>
        </td>
        <td class="action-btns">
          <button class="btn-del" onclick="window.deleteBloodRequest('${id}')" style="background: #6c757d; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">মুছুন</button>
        </td>
      `;
      requestsTableBody.appendChild(tr);
    });
    
    if (requestCount) requestCount.textContent = count;
  } catch (error) {
    console.error("Error loading blood requests:", error);
    requestsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">ডাটা লোড করতে ব্যর্থ হয়েছে।</td></tr>';
  }
}

// Approve Pending Donor
window.approvePendingDonor = async (id, name, phone) => {
  if (!confirm(`${name} এর নিবন্ধন অনুমোদন করতে নিশ্চিত?`)) return;
  
  try {
    // Get the pending donor data
    const docSnap = await getDocs(collection(db, "pendingDonors"));
    let pendingData = null;
    let docId = null;
    
    docSnap.forEach(doc => {
      if (doc.id === id) {
        pendingData = doc.data();
        docId = doc.id;
      }
    });
    
    if (!pendingData) {
      alert("নিবন্ধন খুঁজে পাওয়া যায়নি।");
      return;
    }
    
    // Add to approved donors
    const approvedDonor = {
      ...pendingData,
      available: true,
      approvedDate: new Date().toISOString(),
      status: "approved"
    };
    
    await addDoc(collection(db, "donors"), approvedDonor);
    
    // Delete from pending
    await deleteDoc(doc(db, "pendingDonors", id));
    
    // Send approval email to donor
    try {
      await fetch(`${API_URL}/api/send-donor-approval-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: approvedDonor.name,
          phone: approvedDonor.phone,
          email: approvedDonor.email || 'না দেওয়া হয়েছে'
        })
      });
    } catch (emailError) {
      console.warn("Approval email failed:", emailError);
    }
    
    alert("✔ নিবন্ধন অনুমোদিত হয়েছে!");
    loadPendingRegistrations();
    loadDonors();
  } catch (error) {
    console.error("Approve error:", error);
    alert("অনুমোদন করতে ব্যর্থ হয়েছে।");
  }
};

// Reject Pending Donor
window.rejectPendingDonor = async (id) => {
  if (!confirm("এই নিবন্ধন বাতিল করতে নিশ্চিত?")) return;
  
  try {
    await deleteDoc(doc(db, "pendingDonors", id));
    alert("✔ নিবন্ধন বাতিল করা হয়েছে।");
    loadPendingRegistrations();
  } catch (error) {
    console.error("Reject error:", error);
    alert("বাতিল করতে ব্যর্থ হয়েছে।");
  }
};

// Delete Blood Request
window.deleteBloodRequest = async (id) => {
  if (!confirm("এই আবেদন মুছে ফেলতে নিশ্চিত?")) return;
  
  try {
    await deleteDoc(doc(db, "bloodRequests", id));
    alert("✔ আবেদন মুছে ফেলা হয়েছে।");
    loadBloodRequests();
  } catch (error) {
    console.error("Delete error:", error);
    alert("মুছতে ব্যর্থ হয়েছে।");
  }
};

// ===== CONTACT MESSAGES MANAGEMENT =====

// Load Contact Messages from Firestore
async function loadContactMessages() {
  const messagesTableBody = document.getElementById("messagesTableBody");
  const messageCount = document.getElementById("messageCount");
  const noMessagesMsg = document.getElementById("noMessagesMsg");

  if (!messagesTableBody) return;

  try {
    const querySnapshot = await getDocs(collection(db, "contactMessages"));
    const messages = [];
    querySnapshot.forEach((docSnap) => {
      messages.push({ id: docSnap.id, ...docSnap.data() });
    });

    // নতুন বার্তা আগে দেখাবে
    messages.sort((a, b) => (b.messageDate || "").localeCompare(a.messageDate || ""));

    messagesTableBody.innerHTML = '';

    if (!messages.length) {
      messagesTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">কোনো যোগাযোগ বার্তা নেই।</td></tr>';
      if (noMessagesMsg) noMessagesMsg.style.display = 'inline';
      if (messageCount) messageCount.textContent = '0';
      return;
    }

    if (noMessagesMsg) noMessagesMsg.style.display = 'none';
    if (messageCount) messageCount.textContent = messages.length;

    messages.forEach((data) => {
      const messageDate = data.messageDate
        ? new Date(data.messageDate).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })
        : 'অজানা';

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(data.name)}</strong></td>
        <td><a href="mailto:${escapeHtml(data.email)}" style="color: var(--primary);">${escapeHtml(data.email)}</a></td>
        <td>${escapeHtml(data.subject || '—')}</td>
        <td><div class="message-cell">${escapeHtml(data.message)}</div></td>
        <td>${messageDate}</td>
        <td class="action-btns">
          <button class="btn-del" onclick="window.deleteContactMessage('${data.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      messagesTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading contact messages:", error);
    messagesTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding:20px;">ডাটা লোড করতে ব্যর্থ হয়েছে।</td></tr>';
  }
}

// Delete Contact Message
window.deleteContactMessage = async (id) => {
  if (!confirm("এই বার্তাটি মুছে ফেলতে নিশ্চিত?")) return;

  try {
    await deleteDoc(doc(db, "contactMessages", id));
    loadContactMessages();
  } catch (error) {
    console.error("Delete message error:", error);
    alert("মুছতে ব্যর্থ হয়েছে।");
  }
};

// ===== DONATION RECEIPTS MANAGEMENT =====

// প্রতিটি রশিদের নির্দিষ্ট সিরিয়াল নম্বর বের করা
async function getNextReceiptNumber() {
  try {
    const querySnapshot = await getDocs(collection(db, "receipts"));
    let maxNo = 0;
    querySnapshot.forEach((docSnap) => {
      const no = Number(docSnap.data().receiptNo) || 0;
      if (no > maxNo) maxNo = no;
    });
    return maxNo + 1;
  } catch {
    return 1;
  }
}

// Load Donation Receipts from Firestore
async function loadReceipts() {
  const receiptsTableBody = document.getElementById("receiptsTableBody");
  const receiptCount = document.getElementById("receiptCount");
  const totalDonationText = document.getElementById("totalDonationText");

  if (!receiptsTableBody) return;

  receiptsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">ডাটা লোড হচ্ছে...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "receipts"));
    const receipts = [];
    querySnapshot.forEach((docSnap) => {
      receipts.push({ id: docSnap.id, ...docSnap.data() });
    });

    // রশিদ নম্বর অনুযায়ী নতুন থেকে পুরনোর দিকে সাজানো
    receipts.sort((a, b) => (Number(b.receiptNo) || 0) - (Number(a.receiptNo) || 0));

    receiptsTableBody.innerHTML = '';

    if (!receipts.length) {
      receiptsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">কোনো অনুদান রশিদ নেই। শুরু করতে “নতুন রশিদ তৈরি” বাটনে ক্লিক করুন।</td></tr>';
      if (receiptCount) receiptCount.textContent = '0';
      if (totalDonationText) totalDonationText.textContent = '';
      return;
    }

    if (receiptCount) receiptCount.textContent = receipts.length;

    let totalAmount = 0;

    receipts.forEach((data) => {
      totalAmount += Number(data.amount) || 0;
      const receiptDate = data.donationDate
        ? new Date(`${data.donationDate}T00:00:00`).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
        : (data.createdAt ? new Date(data.createdAt).toLocaleDateString('bn-BD', { dateStyle: 'medium' }) : 'অজানা');

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong style="color:var(--primary); font-size:15px;">#${escapeHtml(String(data.receiptNo || '—'))}</strong></td>
        <td>
          <strong>${escapeHtml(data.donorName)}</strong>
          ${data.address ? `<div style="font-size:12px; color:var(--text-muted);">${escapeHtml(data.address)}</div>` : ''}
        </td>
        <td>${escapeHtml(data.phone || '—')}</td>
        <td style="font-weight:700; color: var(--primary); font-size:15px;">৳ ${new Intl.NumberFormat('bn-BD').format(Number(data.amount) || 0)}</td>
        <td><span class="status-badge status-active" style="background:#e8f4fd; color:#0a6bbd;">${escapeHtml(data.paymentMethod || '—')}</span></td>
        <td>${escapeHtml(data.cause || '—')}</td>
        <td>${receiptDate}</td>
        <td class="action-btns">
          <button onclick="window.viewReceipt('${data.id}')" style="background:#17a2b8; color:white; padding:5px 10px; border:none; border-radius:4px; cursor:pointer; font-size:12px; margin-right:4px;" title="বিস্তারিত">বিস্তার</button>
          <button class="btn-del" onclick="window.deleteReceipt('${data.id}')" title="মুছুন"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      receiptsTableBody.appendChild(tr);
    });

    if (totalDonationText) {
      totalDonationText.textContent = `মোট অনুদান: ৳ ${new Intl.NumberFormat('bn-BD').format(totalAmount)} | মোট রশিদ: ${receipts.length}টি`;
    }
  } catch (error) {
    console.error("Error loading receipts:", error);
    receiptsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red; padding:20px;">ডাটা লোড করতে ব্যর্থ হয়েছে।</td></tr>';
  }
}


// Delete Receipt
window.deleteReceipt = async (id) => {
  if (!confirm("এই রশিদের রেকর্ডটি মুছে ফেলতে নিশ্চিত?")) return;

  try {
    await deleteDoc(doc(db, "receipts", id));
    alert("✔ রশিদ মুছে ফেলা হয়েছে।");
    loadReceipts();
  } catch (error) {
    console.error("Delete receipt error:", error);
    alert("মুছতে ব্যর্থ হয়েছে।");
  }
};

// View Receipt Details
window.viewReceipt = (id) => {
  // Future: open a print-preview modal
  alert("রশিদ দেখার সুবিধা শীঘ্রই যোগ হবে।");
};

// ===== RECEIPT MODAL LOGIC =====
const receiptModal = document.getElementById("addReceiptModal");
const addReceiptForm = document.getElementById("addReceiptForm");
const saveReceiptBtn = document.getElementById("saveReceiptBtn");

// Modal খোলার সময় অটো নম্বর সেট
if (document.getElementById("openReceiptModalBtn")) {
  document.getElementById("openReceiptModalBtn").addEventListener("click", async () => {
    if (receiptModal) {
      // আজকের তারিখ ডিফল্ট
      const dateInput = document.getElementById("receiptDate");
      if (dateInput && !dateInput.value) {
        const now = new Date();
        dateInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }
      // পরবর্তী রশিদ নম্বর দেখানো
      const nextNo = await getNextReceiptNumber();
      const display = document.getElementById("receiptNoDisplay");
      if (display) display.value = `PRT-${String(nextNo).padStart(4, '0')}`;
      receiptModal.style.display = "flex";
    }
  });
}

if (document.getElementById("closeReceiptModalBtn")) {
  document.getElementById("closeReceiptModalBtn").addEventListener("click", () => {
    if (receiptModal) receiptModal.style.display = "none";
    if (addReceiptForm) addReceiptForm.reset();
  });
}

if (addReceiptForm) {
  addReceiptForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (saveReceiptBtn) {
      saveReceiptBtn.textContent = "সংরক্ষণ হচ্ছে...";
      saveReceiptBtn.disabled = true;
    }

    try {
      // চূড়ান্ত নম্বর নির্ধারণ (ডুপ্লিকেট এড়াতে)
      const nextNo = await getNextReceiptNumber();
      const receiptNoStr = `PRT-${String(nextNo).padStart(4, '0')}`;

      const newReceipt = {
        receiptNo: nextNo,
        receiptNoDisplay: receiptNoStr,
        donorName: document.getElementById("receiptDonorName")?.value.trim() || "",
        phone: document.getElementById("receiptPhone")?.value.trim() || "",
        email: document.getElementById("receiptEmail")?.value.trim() || "",
        address: document.getElementById("receiptAddress")?.value.trim() || "",
        amount: Number(document.getElementById("receiptAmount")?.value) || 0,
        paymentMethod: document.getElementById("receiptPaymentMethod")?.value || "",
        transactionId: document.getElementById("receiptTransactionId")?.value.trim() || "",
        donationDate: document.getElementById("receiptDate")?.value || "",
        cause: document.getElementById("receiptCause")?.value || "",
        note: document.getElementById("receiptNote")?.value.trim() || "",
        createdAt: new Date().toISOString(),
        addedVia: "Admin Panel"
      };

      // Validate
      if (!newReceipt.donorName || !newReceipt.phone || !newReceipt.amount || !newReceipt.paymentMethod || !newReceipt.cause || !newReceipt.donationDate) {
        alert("স্টার (*) চিহ্নিত সব ফিল্ড পূরণ করুন");
        return;
      }

      await addDoc(collection(db, "receipts"), newReceipt);

      if (receiptModal) receiptModal.style.display = "none";
      addReceiptForm.reset();
      loadReceipts();
      alert(`✔ রশিদ ${receiptNoStr} সফলভাবে সংরক্ষিত হয়েছে!`);
    } catch (error) {
      console.error("Add receipt error:", error);
      alert("রশিদ যোগ করা যায়নি।");
    } finally {
      if (saveReceiptBtn) {
        saveReceiptBtn.innerHTML = '<i class="fa-solid fa-save"></i> রশিদ সংরক্ষণ করুন';
        saveReceiptBtn.disabled = false;
      }
    }
  });
}


// ===== NOTICES MANAGEMENT =====

// ওয়েবসাইটে আগে হার্ডকোড করা ডিফল্ট নোটিশ — প্রথমবার Firestore খালি থাকলে ইম্পোর্ট হবে
const DEFAULT_NOTICES = [
  {
    category: "রক্তদান",
    date: "2026-07-01",
    title: "রক্তদাতা নিবন্ধন চলছে",
    description: "নতুন রক্তদাতা হিসেবে যুক্ত হতে ওয়েবসাইটের নিবন্ধন ফর্ম পূরণ করুন। আপনার সম্মতিক্রমেই তথ্য তালিকায় প্রকাশিত হবে।",
    important: true
  },
  {
    category: "সাংগঠনিক",
    date: "2026-06-15",
    title: "গঠনতন্ত্র ২য় সংস্করণ প্রকাশিত",
    description: "প্রত্যয়ের গঠনতন্ত্রের ২য় সংস্করণ ওয়েবসাইটে PDF আকারে পাওয়া যাচ্ছে। গঠনতন্ত্র সেকশন থেকে পড়ুন বা ডাউনলোড করুন।",
    important: false
  },
  {
    category: "তথ্য হালনাগাদ",
    date: "2026-06-01",
    title: "রক্তদাতা তালিকা হালনাগাদ",
    description: "তালিকাভুক্ত রক্তদাতাদের উপলভ্যতা ও যোগাযোগের তথ্য হালনাগাদ করা হচ্ছে। ভুল তথ্য চোখে পড়লে যোগাযোগ ফর্মে জানান।",
    important: false
  }
];

let noticesSeeded = false; // একবারের বেশি সিড না করার গার্ড

// Load Notices from Firestore
async function loadNotices() {
  const noticesTableBody = document.getElementById("noticesTableBody");
  if (!noticesTableBody) return;

  try {
    const querySnapshot = await getDocs(collection(db, "notices"));
    const notices = [];
    querySnapshot.forEach((docSnap) => {
      notices.push({ id: docSnap.id, ...docSnap.data() });
    });

    // প্রথমবার খালি থাকলে ডিফল্ট নোটিশগুলো ইম্পোর্ট করা হয়
    if (!notices.length && !noticesSeeded) {
      noticesSeeded = true;
      for (const n of DEFAULT_NOTICES) {
        await addDoc(collection(db, "notices"), { ...n, createdAt: new Date().toISOString() });
      }
      return loadNotices();
    }

    // নতুন তারিখ আগে দেখাবে
    notices.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    noticesTableBody.innerHTML = '';

    if (!notices.length) {
      noticesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">কোনো নোটিশ নেই। "নতুন নোটিশ" বাটনে ক্লিক করে যোগ করুন।</td></tr>';
      return;
    }

    notices.forEach((data) => {
      const noticeDate = data.date
        ? new Date(`${data.date}T00:00:00`).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'তারিখ নেই';

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${escapeHtml(data.title)}</strong>
          <div class="message-cell" style="color: var(--text-muted); margin-top: 4px;">${escapeHtml(data.description)}</div>
        </td>
        <td>${escapeHtml(data.category || '—')}</td>
        <td>${noticeDate}</td>
        <td>
          <span class="status-badge ${data.important ? 'status-inactive' : 'status-active'}">
            ${data.important ? 'গুরুত্বপূর্ণ' : 'সাধারণ'}
          </span>
        </td>
        <td class="action-btns">
          <button class="btn-del" onclick="window.deleteNotice('${data.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      noticesTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading notices:", error);
    noticesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">ডাটা লোড করতে ব্যর্থ হয়েছে।</td></tr>';
  }
}

// Delete Notice
window.deleteNotice = async (id) => {
  if (!confirm("এই নোটিশটি মুছে ফেলতে নিশ্চিত? ওয়েবসাইট থেকেও মুছে যাবে।")) return;

  try {
    await deleteDoc(doc(db, "notices", id));
    alert("✔ নোটিশ মুছে ফেলা হয়েছে।");
    loadNotices();
  } catch (error) {
    console.error("Delete notice error:", error);
    alert("মুছতে ব্যর্থ হয়েছে।");
  }
};

// Add Notice Modal
const noticeModal = document.getElementById("addNoticeModal");
const addNoticeForm = document.getElementById("addNoticeForm");
const saveNoticeBtn = document.getElementById("saveNoticeBtn");

if (document.getElementById("openNoticeModalBtn")) {
  document.getElementById("openNoticeModalBtn").addEventListener("click", () => {
    if (noticeModal) {
      // তারিখের ঘরে ডিফল্ট আজকের তারিখ
      const dateInput = document.getElementById("noticeDate");
      if (dateInput && !dateInput.value) {
        const now = new Date();
        dateInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }
      noticeModal.style.display = "flex";
    }
  });
}

if (document.getElementById("closeNoticeModalBtn")) {
  document.getElementById("closeNoticeModalBtn").addEventListener("click", () => {
    if (noticeModal) noticeModal.style.display = "none";
    if (addNoticeForm) addNoticeForm.reset();
  });
}

if (addNoticeForm) {
  addNoticeForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newNotice = {
      title: document.getElementById("noticeTitle")?.value.trim() || "",
      category: document.getElementById("noticeCategory")?.value.trim() || "",
      date: document.getElementById("noticeDate")?.value || "",
      description: document.getElementById("noticeDescription")?.value.trim() || "",
      important: document.getElementById("noticeImportant")?.checked || false,
      createdAt: new Date().toISOString()
    };

    if (!newNotice.title || !newNotice.category || !newNotice.date || !newNotice.description) {
      alert("সব ফিল্ড পূরণ করুন");
      return;
    }

    if (saveNoticeBtn) {
      saveNoticeBtn.textContent = "প্রকাশ হচ্ছে...";
      saveNoticeBtn.disabled = true;
    }

    try {
      await addDoc(collection(db, "notices"), newNotice);
      if (noticeModal) noticeModal.style.display = "none";
      addNoticeForm.reset();
      loadNotices();
      alert("✔ নোটিশ সফলভাবে প্রকাশিত হয়েছে! ওয়েবসাইটে এখন দেখা যাবে।");
    } catch (error) {
      console.error("Add notice error:", error);
      alert("নোটিশ যোগ করা যায়নি।");
    } finally {
      if (saveNoticeBtn) {
        saveNoticeBtn.textContent = "নোটিশ প্রকাশ করুন";
        saveNoticeBtn.disabled = false;
      }
    }
  });
}

// ===== TAB SWITCHING (Generic) =====

const TAB_LOADERS = {
  approvedSection: loadDonors,
  pendingSection: loadPendingRegistrations,
  requestsSection: loadBloodRequests,
  messagesSection: loadContactMessages,
  receiptsSection: loadReceipts,
  receiptGeneratorSection: null,
  noticesSection: loadNotices
};

const tabButtons = document.querySelectorAll(".tab-btn");
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.tab;

    // সব সেকশন লুকিয়ে টার্গেট সেকশন দেখানো
    Object.keys(TAB_LOADERS).forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) section.style.display = sectionId === targetId ? "block" : "none";
    });

    // অ্যাক্টিভ ট্যাব হাইলাইট
    tabButtons.forEach((b) => b.classList.toggle("active", b === btn));

    // সংশ্লিষ্ট ডেটা রিফ্রেশ
    if (TAB_LOADERS[targetId]) TAB_LOADERS[targetId]();
  });
});

// ===== VISUAL RECEIPT GENERATOR =====

const CDN = {
  html2canvas: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  qrcode: "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function updateReceiptPreview(form) {
  const nextNo = await getNextReceiptNumber();
  const receiptNo = `PRT-${String(nextNo).padStart(4, "0")}`;
  const today = new Date();
  
  const name = form.elements.donorName.value.trim();
  const amount = Number(form.elements.amount.value);
  const cause = form.elements.cause.value;
  const signatory = form.elements.signatory.value.trim();
  const withQr = form.elements.withQr.checked;

  document.getElementById("rcNumber").textContent = receiptNo;
  document.getElementById("rcDate").textContent = new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric" }).format(today);
  document.getElementById("rcName").textContent = name;
  document.getElementById("rcCause").textContent = cause;
  document.getElementById("rcAmount").textContent = `৳ ${new Intl.NumberFormat('bn-BD').format(amount)}`;
  document.getElementById("rcSignatory").textContent = signatory ? `${signatory} — অনুমোদিত স্বাক্ষর` : "অনুমোদিত স্বাক্ষর";

  const qrBox = document.getElementById("rcQr");
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
      console.warn("QR code generation failed");
    }
  }
  return { nextNo, receiptNoStr: receiptNo };
}

async function receiptToCanvas() {
  await loadScript(CDN.html2canvas);
  return html2canvas(document.getElementById("receiptPaper"), { scale: 2, backgroundColor: "#ffffff", useCORS: true });
}

function setupVisualReceiptGenerator() {
  const form = document.getElementById("receiptForm");
  const statusEl = document.getElementById("receiptStatus");
  if (!form) return;

  let action = "pdf";
  form.querySelectorAll("button[data-action]").forEach(button => {
    button.addEventListener("click", () => { action = button.dataset.action; });
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    
    if (!form.elements.donorName.value.trim() || !form.elements.amount.value || !form.elements.cause.value || !form.elements.paymentMethod.value) {
      alert("স্টার (*) চিহ্নিত সব ফিল্ড পূরণ করুন");
      return;
    }

    try {
      statusEl.textContent = "রসিদ তৈরি হচ্ছে…";
      statusEl.hidden = false;
      
      const { nextNo, receiptNoStr } = await updateReceiptPreview(form);

      // Save to Firebase
      try {
        const newReceipt = {
          receiptNo: nextNo,
          receiptNoDisplay: receiptNoStr,
          donorName: form.elements.donorName.value.trim(),
          amount: Number(form.elements.amount.value),
          paymentMethod: form.elements.paymentMethod.value,
          cause: form.elements.cause.value,
          signatory: form.elements.signatory.value.trim(),
          donationDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          addedVia: "Visual Generator"
        };
        await addDoc(collection(db, "receipts"), newReceipt);
        loadReceipts();
      } catch (err) {
        console.error("Firebase save failed:", err);
      }

      // Generate output based on action
      if (action === "print") {
        statusEl.textContent = "✔ প্রিন্ট ডায়ালগ খোলা হয়েছে।";
        window.print();
        setTimeout(() => { 
          form.reset(); 
          // Switch to receipts tab
          const receiptTabBtn = document.querySelector('.tab-btn[data-tab="receiptsSection"]');
          if (receiptTabBtn) receiptTabBtn.click();
        }, 1000);
        return;
      }

      const canvas = await receiptToCanvas();

      if (action === "image") {
        const link = document.createElement("a");
        link.download = `${receiptNoStr}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        statusEl.textContent = "✔ রসিদ ছবি হিসেবে ডাউনলোড হয়েছে।";
      } else {
        await loadScript(CDN.jspdf);
        const pdf = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 10;
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, imgWidth, imgHeight);
        pdf.save(`${receiptNoStr}.pdf`);
        statusEl.textContent = "✔ রসিদ PDF হিসেবে ডাউনলোড হয়েছে।";
      }
      
      setTimeout(() => { 
        form.reset(); 
        statusEl.hidden = true; 
        // Switch to receipts tab
        const receiptTabBtn = document.querySelector('.tab-btn[data-tab="receiptsSection"]');
        if (receiptTabBtn) receiptTabBtn.click();
      }, 3000);

    } catch (error) {
      statusEl.textContent = "⚠ রসিদ তৈরি করা যায়নি।";
      console.warn("Receipt generation failed:", error);
    }
  });
}

setupVisualReceiptGenerator();

console.log("Admin app loaded");
