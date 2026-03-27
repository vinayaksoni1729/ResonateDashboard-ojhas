import { NextResponse } from "next/server";
import QRCode from "qrcode";
import nodemailer from "nodemailer";

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

    // Generate QR code
    const qrPayload = { teamId };
    const qrString = JSON.stringify(qrPayload);
    const qrCodeDataUrl = await QRCode.toDataURL(qrString);

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Resonate Hackathon Registration Approved",
      html: `
        <h2>Your team has been approved!</h2>
        <p><strong>Team Name:</strong> ${teamName}</p>
        <p><strong>Team ID:</strong> ${teamId}</p>
        <p>Please use the QR code below for event check-in:</p>
        <img src="${qrCodeDataUrl}" alt="Team QR Code" style="max-width: 300px; margin-top: 20px;" />
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          If you have any questions, please contact the organizers.
        </p>
      `,
    };

    await transporter.sendMail(mailOptions);

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
