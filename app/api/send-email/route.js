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
      subject: "Resonate Hackathon Registration Approved",
      html: `
        <h2>Your team has been approved!</h2>
        <p><strong>Team Name:</strong> ${teamName}</p>
        <p><strong>Team ID:</strong> ${teamId}</p>
        <p>Please use the QR code below for event check-in:</p>
        <img src="${qrUrl}" alt="Team QR Code" style="max-width: 300px; margin-top: 20px; border: 1px solid #ddd; padding: 10px;" />
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          If you have any questions, please contact the organizers.
        </p>
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
