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

    if (!email || !teamId || !teamName) {
      return NextResponse.json(
        { error: "Missing required fields: email, teamId, teamName" },
        { status: 400 }
      );
    }

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

    const qrUrl = await uploadQRCodeToStorage(teamId, qrBuffer);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "🚀 RESONATE HACKATHON 2.0 - Welcome Aboard!",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're in — Resonate Hackathon 2.0</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
  </style>
  <!--[if mso]><style>*{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;-webkit-text-size-adjust:100%;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <!-- Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;margin:0 auto;">

          <!-- ━━━ TOP STRIP (dark header) ━━━ -->
          <tr>
            <td style="background:#1c1c1e;border-radius:16px 16px 0 0;padding:28px 32px 24px;">

              <!-- Logo + brand row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="44" valign="middle">
                    <img
                      src="https://media.licdn.com/dms/image/v2/D560BAQHoDXuEAmRm8g/company-logo_200_200/B56ZoM_bA_G4AI-/0/1761154555959/mlsa_srm_logo?e=2147483647&v=beta&t=DNfPHmmcztLQvmnmjwwgFGEYg06BeiTXmIXZ7IFtJtE"
                      alt="MLSA SRM"
                      width="36" height="36"
                      style="display:block;border-radius:50%;"
                    />
                  </td>
                  <td valign="middle">
                    <p style="margin:0;font-size:11px;color:#a1a1aa;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;">
                      MSA SRM Presents
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:4px 10px;border-radius:100px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.2);">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:5px;line-height:1;">
                                <img src="https://api.iconify.design/lucide:circle-check.svg?color=%2322c55e&width=12&height=12" alt="" width="12" height="12" style="display:block;" />
                              </td>
                              <td style="font-size:11px;font-weight:600;color:#22c55e;">Approved</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Event title -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-top:24px;">
                <tr>
                  <td>
                    <h1 style="margin:0 0 4px;font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;line-height:1.15;">
                      RESONATE
                    </h1>
                    <p style="margin:0;font-family:'Space Mono','Courier New',monospace;font-size:14px;font-weight:400;color:#71717a;letter-spacing:3px;">
                      HACKATHON 2.0
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ━━━ PERFORATED TEAR LINE ━━━ -->
          <tr>
            <td style="background:#1c1c1e;padding:0;height:20px;position:relative;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- Left notch -->
                  <td width="16" style="background:#f4f4f5;border-radius:0 50% 50% 0;height:20px;"></td>
                  <!-- Dashed line -->
                  <td style="border-bottom:2px dashed #3f3f46;height:20px;"></td>
                  <!-- Right notch -->
                  <td width="16" style="background:#f4f4f5;border-radius:50% 0 0 50%;height:20px;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ━━━ TICKET BODY (white) ━━━ -->
          <tr>
            <td style="background:#ffffff;padding:28px 32px 0;">

              <!-- Event details row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <!-- Date block -->
                  <td width="50%" valign="top" style="padding-right:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
                      <tr>
                        <td style="padding-right:6px;line-height:1;">
                          <img src="https://api.iconify.design/lucide:calendar-days.svg?color=%23a1a1aa&width=14&height=14" alt="" width="14" height="14" style="display:block;" />
                        </td>
                        <td style="font-size:10px;color:#a1a1aa;font-weight:500;text-transform:uppercase;letter-spacing:1px;">When</td>
                      </tr>
                    </table>
                    <p style="margin:0 0 2px;font-size:15px;color:#1c1c1e;font-weight:600;">3 – 4 April</p>
                    <p style="margin:0;font-size:12px;color:#a1a1aa;">Report by 9:00 AM</p>
                  </td>
                  <!-- Venue block -->
                  <td width="50%" valign="top" style="padding-left:12px;border-left:1px solid #e4e4e7;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
                      <tr>
                        <td style="padding-right:6px;line-height:1;">
                          <img src="https://api.iconify.design/lucide:map-pin.svg?color=%23a1a1aa&width=14&height=14" alt="" width="14" height="14" style="display:block;" />
                        </td>
                        <td style="font-size:10px;color:#a1a1aa;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Where</td>
                      </tr>
                    </table>
                    <p style="margin:0;font-size:15px;color:#1c1c1e;font-weight:600;">Mini Hall 2</p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr><td style="height:1px;background:#f4f4f5;font-size:1px;line-height:1px;">&nbsp;</td></tr>
              </table>

              <!-- Team details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <!-- Team name -->
                  <td width="50%" valign="top" style="padding-right:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
                      <tr>
                        <td style="padding-right:6px;line-height:1;">
                          <img src="https://api.iconify.design/lucide:users.svg?color=%23a1a1aa&width=14&height=14" alt="" width="14" height="14" style="display:block;" />
                        </td>
                        <td style="font-size:10px;color:#a1a1aa;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Team</td>
                      </tr>
                    </table>
                    <p style="margin:0;font-size:15px;color:#1c1c1e;font-weight:600;word-break:break-word;">
                      ${teamName}
                    </p>
                  </td>
                  <!-- Team ID -->
                  <td width="50%" valign="top" style="padding-left:12px;border-left:1px solid #e4e4e7;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
                      <tr>
                        <td style="padding-right:6px;line-height:1;">
                          <img src="https://api.iconify.design/lucide:hash.svg?color=%23a1a1aa&width=14&height=14" alt="" width="14" height="14" style="display:block;" />
                        </td>
                        <td style="font-size:10px;color:#a1a1aa;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Team ID</td>
                      </tr>
                    </table>
                    <p style="margin:0;font-size:14px;color:#1c1c1e;font-weight:700;font-family:'Space Mono','Courier New',monospace;letter-spacing:0.8px;word-break:break-all;">
                      ${teamId}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr><td style="height:1px;background:#f4f4f5;font-size:1px;line-height:1px;">&nbsp;</td></tr>
              </table>

              <!-- QR Code centered -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
                      <tr>
                        <td style="padding-right:6px;line-height:1;">
                          <img src="https://api.iconify.design/lucide:scan-line.svg?color=%23a1a1aa&width=14&height=14" alt="" width="14" height="14" style="display:block;" />
                        </td>
                        <td style="font-size:10px;color:#a1a1aa;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Entry Pass</td>
                      </tr>
                    </table>
                    <p style="margin:0 0 16px;font-size:12px;color:#a1a1aa;">
                      Scan at check-in
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td style="padding:10px;border-radius:10px;border:1px solid #e4e4e7;background:#fafafa;">
                          <img src="${qrUrl}"
                            alt="Entry QR"
                            width="160" height="160"
                            style="display:block;border-radius:4px;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ━━━ SECOND PERFORATED LINE ━━━ -->
          <tr>
            <td style="background:#ffffff;padding:0;height:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="16" style="background:#f4f4f5;border-radius:0 50% 50% 0;height:20px;"></td>
                  <td style="border-bottom:2px dashed #e4e4e7;height:20px;"></td>
                  <td width="16" style="background:#f4f4f5;border-radius:50% 0 0 50%;height:20px;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ━━━ TICKET STUB (bottom section) ━━━ -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px 32px 28px;">

              <p style="margin:0 0 16px;font-size:10px;color:#a1a1aa;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;">
                Before you arrive
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <tr>
                  <td style="padding:6px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="24" valign="top" style="padding-top:2px;">
                          <img src="https://api.iconify.design/lucide:bookmark.svg?color=%231c1c1e&width=14&height=14" alt="" width="14" height="14" style="display:block;" />
                        </td>
                        <td style="font-size:13px;color:#52525b;line-height:1.5;">
                          Save this email — your Team ID and QR are your entry pass
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:6px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="24" valign="top" style="padding-top:2px;">
                          <img src="https://api.iconify.design/lucide:clock.svg?color=%231c1c1e&width=14&height=14" alt="" width="14" height="14" style="display:block;" />
                        </td>
                        <td style="font-size:13px;color:#52525b;line-height:1.5;">
                          Arrive 30 minutes early for smooth check-in
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:6px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="24" valign="top" style="padding-top:2px;">
                          <img src="https://api.iconify.design/lucide:laptop.svg?color=%231c1c1e&width=14&height=14" alt="" width="14" height="14" style="display:block;" />
                        </td>
                        <td style="font-size:13px;color:#52525b;line-height:1.5;">
                          Bring laptops, chargers, and your best ideas
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>

            </td>
          </tr>

          <!-- ━━━ FOOTER ━━━ -->
          <tr>
            <td align="center" style="padding:28px 0 8px;">
              <p style="margin:0 0 4px;font-size:12px;color:#a1a1aa;">
                Questions? Reach out at
              </p>
              <a href="mailto:mlsasrm14@gmail.com" style="font-size:12px;color:#1c1c1e;text-decoration:underline;font-weight:500;">
                mlsasrm14@gmail.com
              </a>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:16px 0 8px;">
              <p style="margin:0;font-size:10px;color:#d4d4d8;letter-spacing:0.3px;">
                &copy; 2026 Resonate &middot; MSA SRM
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

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