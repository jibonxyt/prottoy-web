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
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (loginError) loginError.style.display = "none";

    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const password = document.getElementById("loginPassword")?.value.trim() || "";

    if (!email || !password) {
      if (loginError) {
        loginError.textContent = "ইমেইল এবং পাসওয়ার্ড উভয়ই প্রয়োজন";
        loginError.style.display = "block";
      }
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log("Successfully logged in:", userCredential.user.email);
      })
      .catch((error) => {
        console.error("Login error:", error);
        if (loginError) {
          loginError.textContent = "ভুল ইমেইল অথবা পাসওয়ার্ড!";
          loginError.style.display = "block";
        }
      });
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
      donorTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">কোনো রক্তদাতার ডাটা পাওয়া যায়নি।</td></tr>';
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

console.log("Admin app loaded");
