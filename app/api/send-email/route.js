import { NextResponse } from "next/server";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes } from "firebase/storage";

// Initialize Firebase for storage
const firebaseConfig = {
  apiKey: "AIzaSyB2hCxFiapbCFN2JtB2Qfc9ScdLHw4D48k",
  authDomain: "resonate-hackathon.firebaseapp.com",
  projectId: "resonate-hackathon",
  storageBucket: "resonate-hackathon.firebasestorage.app",
  messagingSenderId: "816217422154",
  appId: "1:816217422154:web:dd95af6f5f1193b2ca69b3"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function uploadQRCodeToStorage(teamId, qrBuffer) {
  try {
    const qrFileName = `qr-codes/${teamId}.png`;
    const qrRef = ref(storage, qrFileName);

    await uploadBytes(qrRef, qrBuffer, { contentType: "image/png" });

    // Generate public URL
    const qrUrl = `https://firebasestorage.googleapis.com/v0/b/resonate-hackathon.firebasestorage.app/o/${encodeURIComponent(
      qrFileName
    )}?alt=media`;

    console.log(`QR code uploaded to Firebase Storage: ${qrUrl}`);
    return qrUrl;
  } catch (error) {
    console.error("Error uploading QR code to storage:", error);
    throw error;
  }
}

export async function POST(request) {
  try {
    const { email, teamId, teamName } = await request.json();

    // Validate inputs
    if (!email || !teamId || !teamName) {
      return NextResponse.json(
        { error: "Missing required fields: email, teamId, teamName" },
        { status: 400 }
      );
    }

    // Generate QR code as buffer
    const qrPayload = { teamId };
    const qrString = JSON.stringify(qrPayload);
    const qrBuffer = await QRCode.toBuffer(qrString, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff"
      }
    });

    console.log("QR Code generated successfully as buffer");

    // Upload QR code to Firebase Storage and get public URL
    const qrUrl = await uploadQRCodeToStorage(teamId, qrBuffer);

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email with QR code URL
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "🎉 Welcome to Resonate Hackathon! Your Entry Approved",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 20px;
              text-align: center;
              color: white;
            }
            .header h1 {
              font-size: 32px;
              margin-bottom: 10px;
              font-weight: 700;
            }
            .header p {
              font-size: 14px;
              opacity: 0.9;
              font-weight: 500;
            }
            .content {
              padding: 40px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #333;
              margin-bottom: 10px;
            }
            .subtext {
              font-size: 14px;
              color: #666;
              margin-bottom: 30px;
              line-height: 1.6;
            }
            .team-card {
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              padding: 20px;
              border-radius: 12px;
              margin-bottom: 30px;
              border-left: 4px solid #667eea;
            }
            .team-card h3 {
              color: #667eea;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 8px;
              font-weight: 700;
            }
            .team-card p {
              color: #333;
              font-size: 16px;
              font-weight: 600;
              word-break: break-all;
            }
            .event-details {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 12px;
              margin-bottom: 30px;
            }
            .event-title {
              font-size: 14px;
              text-transform: uppercase;
              color: #667eea;
              font-weight: 700;
              letter-spacing: 1px;
              margin-bottom: 15px;
            }
            .event-item {
              display: flex;
              align-items: flex-start;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 1px solid #e9ecef;
            }
            .event-item:last-child {
              border-bottom: none;
              margin-bottom: 0;
              padding-bottom: 0;
            }
            .event-icon {
              font-size: 20px;
              margin-right: 12px;
              min-width: 24px;
            }
            .event-content {
              flex: 1;
            }
            .event-label {
              font-size: 12px;
              color: #999;
              text-transform: uppercase;
              font-weight: 600;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .event-value {
              font-size: 15px;
              color: #333;
              font-weight: 600;
            }
            .qr-section {
              text-align: center;
              padding: 30px 0;
              border-top: 2px dashed #e9ecef;
              border-bottom: 2px dashed #e9ecef;
              margin-bottom: 30px;
            }
            .qr-title {
              font-size: 12px;
              text-transform: uppercase;
              color: #667eea;
              font-weight: 700;
              letter-spacing: 1px;
              margin-bottom: 15px;
            }
            .qr-code {
              background: white;
              padding: 15px;
              border-radius: 8px;
              display: inline-block;
              border: 2px solid #667eea;
            }
            .qr-code img {
              max-width: 280px;
              height: auto;
              display: block;
            }
            .qr-subtitle {
              font-size: 12px;
              color: #999;
              margin-top: 12px;
            }
            .instructions {
              background: #e7f3ff;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #667eea;
              margin-bottom: 30px;
            }
            .instructions-title {
              font-size: 14px;
              font-weight: 700;
              color: #0066cc;
              margin-bottom: 10px;
            }
            .instructions-list {
              font-size: 13px;
              color: #333;
              line-height: 1.8;
            }
            .instructions-list li {
              margin-bottom: 8px;
            }
            .footer {
              padding: 30px 40px;
              background: #f8f9fa;
              text-align: center;
              border-top: 1px solid #e9ecef;
            }
            .footer-text {
              font-size: 12px;
              color: #999;
              line-height: 1.6;
            }
            .footer-text strong {
              color: #667eea;
            }
            .social-links {
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #e9ecef;
            }
            .social-links a {
              color: #667eea;
              text-decoration: none;
              font-size: 12px;
              margin: 0 10px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>🎉 Welcome to Resonate!</h1>
              <p>Your team has been approved for the hackathon</p>
            </div>

            <!-- Content -->
            <div class="content">
              <div class="greeting">Congratulations! 🚀</div>
              <div class="subtext">
                Your team registration has been approved and you're all set to participate in the Resonate Hackathon. Below are your team details and event information.
              </div>

              <!-- Team Card -->
              <div class="team-card">
                <h3>Your Team ID</h3>
                <p>${teamId}</p>
              </div>

              <!-- Event Details -->
              <div class="event-details">
                <div class="event-title">📅 Event Details</div>
                
                <div class="event-item">
                  <div class="event-icon">📍</div>
                  <div class="event-content">
                    <div class="event-label">Venue</div>
                    <div class="event-value">Mini Hall 2</div>
                  </div>
                </div>

                <div class="event-item">
                  <div class="event-icon">🗓️</div>
                  <div class="event-content">
                    <div class="event-label">Date</div>
                    <div class="event-value">3 & 4 April</div>
                  </div>
                </div>

                <div class="event-item">
                  <div class="event-icon">👥</div>
                  <div class="event-content">
                    <div class="event-label">Team Size</div>
                    <div class="event-value">2-4 members</div>
                  </div>
                </div>

                <div class="event-item">
                  <div class="event-icon">👤</div>
                  <div class="event-content">
                    <div class="event-label">Team Name</div>
                    <div class="event-value">${teamName}</div>
                  </div>
                </div>
              </div>

              <!-- QR Code Section -->
              <div class="qr-section">
                <div class="qr-title">Your Entry QR Code</div>
                <div class="qr-code">
                  <img src="${qrUrl}" alt="Team Entry QR Code" />
                </div>
                <div class="qr-subtitle">Scan this QR code at the event check-in desk</div>
              </div>

              <!-- Instructions -->
              <div class="instructions">
                <div class="instructions-title">✅ What's Next?</div>
                <ul class="instructions-list">
                  <li><strong>Save this email</strong> - Keep your Team ID and QR code handy</li>
                  <li><strong>Arrive early</strong> - Check-in opens 30 minutes before the event</li>
                  <li><strong>Bring your devices</strong> - Make sure all team members have their laptops</li>
                  <li><strong>Have fun</strong> - Looking forward to seeing your amazing ideas! 🚀</li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-text">
                For any questions or concerns, please reach out to the organizing team.<br>
                <strong>Email:</strong> contact@resonate.com<br>
                <br>
                We can't wait to see you at Resonate Hackathon! 🎊
              </div>
              <div class="social-links">
                <a href="#">Website</a>
                <a href="#">Twitter</a>
                <a href="#">Instagram</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`Email sent successfully to ${email} for team ${teamId}`);

    return NextResponse.json(
      { message: "Email sent successfully", teamId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
