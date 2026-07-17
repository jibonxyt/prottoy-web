const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Gmail Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'your-gmail@gmail.com',
    pass: process.env.GMAIL_PASSWORD || 'your-app-password' // Use App Password, not regular password
  }
});

// Contact Form Email
app.post('/api/send-contact-email', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate input
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
    }

    // Send email to admin
    const adminMailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'prottoy.nk@gmail.com',
      subject: `নতুন যোগাযোগ বার্তা - ${name}`,
      html: `
        <h2>নতুন যোগাযোগ বার্তা</h2>
        <p><strong>নাম:</strong> ${escapeHtml(name)}</p>
        <p><strong>ইমেইল:</strong> ${escapeHtml(email)}</p>
        <p><strong>বার্তা:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `
    };

    // Send confirmation email to user
    const userMailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'আমরা আপনার বার্তা পেয়েছি - প্রত্যয়',
      html: `
        <h2>আমরা আপনার বার্তা পেয়েছি!</h2>
        <p>আপনার প্রিয় ${name},</p>
        <p>আপনার বার্তা সফলভাবে পাওয়া গেছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
        <p>ধন্যবাদ!</p>
        <hr>
        <p><strong>আপনার বার্তা:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `
    };

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    res.json({ success: true, message: '✔ বার্তা সফলভাবে পাঠানো হয়েছে' });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ error: 'ইমেইল পাঠাতে ব্যর্থ হয়েছে' });
  }
});

// Blood Request Email
app.post('/api/send-blood-request-email', async (req, res) => {
  try {
    const { patientName, bloodGroup, bags, neededDate, hospital, phone, requesterName } = req.body;

    if (!patientName || !bloodGroup || !bags || !neededDate || !hospital || !phone) {
      return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
    }

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'prottoy.nk@gmail.com',
      subject: `জরুরি: ${bloodGroup} রক্তের আবেদন - ${patientName}`,
      html: `
        <h2>🩸 রক্তের জরুরি আবেদন</h2>
        <p><strong>রোগীর নাম:</strong> ${escapeHtml(patientName)}</p>
        <p><strong>রক্তের গ্রুপ:</strong> ${escapeHtml(bloodGroup)}</p>
        <p><strong>ব্যাগ সংখ্যা:</strong> ${bags}</p>
        <p><strong>প্রয়োজনীয় তারিখ:</strong> ${neededDate}</p>
        <p><strong>হাসপাতাল:</strong> ${escapeHtml(hospital)}</p>
        <p><strong>যোগাযোগ নম্বর:</strong> ${escapeHtml(phone)}</p>
        <p><strong>আবেদনকারী:</strong> ${escapeHtml(requesterName || 'অজানা')}</p>
        <hr>
        <p><em>এই আবেদন দ্রুত প্রক্রিয়া করুন এবং উপলব্ধ রক্তদাতাদের সাথে যোগাযোগ করুন।</em></p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: '✔ আবেদন প্রাপ্ত হয়েছে এবং প্রক্রিয়াধীন' });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ error: 'ইমেইল পাঠাতে ব্যর্থ হয়েছে' });
  }
});

// Donor Registration Email
app.post('/api/send-donor-registration-email', async (req, res) => {
  try {
    const { name, bloodGroup, phone, district, upazila, area } = req.body;

    if (!name || !bloodGroup || !phone || !district || !upazila || !area) {
      return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
    }

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'prottoy.nk@gmail.com',
      subject: `নতুন রক্তদাতা নিবন্ধন - ${name} (${bloodGroup})`,
      html: `
        <h2>🩸 নতুন রক্তদাতা নিবন্ধন</h2>
        <p><strong>নাম:</strong> ${escapeHtml(name)}</p>
        <p><strong>রক্তের গ্রুপ:</strong> ${escapeHtml(bloodGroup)}</p>
        <p><strong>মোবাইল:</strong> ${escapeHtml(phone)}</p>
        <p><strong>জেলা:</strong> ${escapeHtml(district)}</p>
        <p><strong>উপজেলা:</strong> ${escapeHtml(upazila)}</p>
        <p><strong>এলাকা:</strong> ${escapeHtml(area)}</p>
        <hr>
        <p><em>এই রক্তদাতাকে সংরক্ষিত তালিকায় যুক্ত করুন এবং যাচাই করুন।</em></p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: '✔ নিবন্ধন সফল' });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ error: 'ইমেইল পাঠাতে ব্যর্থ হয়েছে' });
  }
});

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
