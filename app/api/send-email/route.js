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
  <title>Resonate Hackathon 2.0</title>
</head>
<body style="margin:0;padding:0;background-color:#07051a;font-family:Georgia,'Times New Roman',serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:linear-gradient(160deg,#07051a 0%,#130d35 40%,#1a0828 70%,#07051a 100%);padding:48px 16px;">
    <tr>
      <td align="center">

        <!-- Main container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:580px;margin:0 auto;">

          <!-- ═══════════════════════════════════════ -->
          <!-- HEADER                                  -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td align="center" style="padding:0 0 8px 0;">

              <!-- Decorative top line -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent,#b44fff,#00cfff,#b44fff,transparent);font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>

              <!-- Header glow card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:linear-gradient(180deg,rgba(90,20,160,0.35) 0%,rgba(10,5,30,0.0) 100%);border-left:1px solid rgba(180,79,255,0.25);border-right:1px solid rgba(180,79,255,0.25);padding:44px 32px 36px;">
                <tr>
                  <td align="center">

                    <!-- Star/spark icon -->
                    <p style="margin:0 0 18px;font-size:26px;line-height:1;">✦</p>

                    <!-- RESONATE -->
                    <h1 style="margin:0;font-size:46px;font-weight:900;letter-spacing:8px;line-height:1;
                      color:#ffffff;
                      text-shadow:0 0 18px rgba(180,79,255,0.9),0 0 40px rgba(0,207,255,0.5),0 0 80px rgba(180,79,255,0.3);">
                      RESONATE
                    </h1>

                    <!-- HACKATHON 2.0 -->
                    <h2 style="margin:6px 0 0;font-size:22px;font-weight:400;letter-spacing:10px;line-height:1;
                      color:transparent;
                      background:linear-gradient(90deg,#b44fff,#00cfff,#ff4fd8);
                      -webkit-background-clip:text;
                      background-clip:text;">
                      HACKATHON &nbsp;2.0
                    </h2>

                    <!-- Divider dots -->
                    <p style="margin:20px 0 0;font-size:12px;letter-spacing:6px;color:rgba(180,79,255,0.6);">
                      · · · · · · · · · ·
                    </p>

                    <!-- Subtitle -->
                    <p style="margin:16px 0 0;font-size:13px;letter-spacing:3px;font-family:Arial,Helvetica,sans-serif;font-weight:400;
                      color:#a78bda;text-transform:uppercase;">
                      Welcome to Resonate &nbsp;
                    </p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- MAIN CARD                               -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:4px 0 0;">

              <!-- Card outer glow border (simulated via wrapping table) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:linear-gradient(135deg,rgba(180,79,255,0.55),rgba(0,207,255,0.35),rgba(255,79,216,0.4));
                border-radius:20px;padding:1px;">
                <tr>
                  <td>

                    <!-- Card inner -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:linear-gradient(145deg,#110a2a 0%,#0d071f 60%,#130b24 100%);
                      border-radius:19px;padding:36px 32px;">
                      <tr>
                        <td>

                          <!-- Welcome copy -->
                          <p style="margin:0 0 6px;font-size:19px;font-weight:700;letter-spacing:1px;
                            color:#ffffff;font-family:Arial,Helvetica,sans-serif;text-align:center;">
                            Your team has been approved 
                          </p>
                          <p style="margin:0 0 32px;font-size:13px;color:#7c6fa0;line-height:1.7;
                            font-family:Arial,Helvetica,sans-serif;text-align:center;">
                            You're confirmed for Resonate Hackathon 2.0.<br/>
                            Here are your team details and entry pass.
                          </p>

                          <!-- ─── TEAM NAME ─── -->
                          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                            style="margin-bottom:16px;border-radius:10px;
                            background:rgba(255,255,255,0.03);
                            border:1px solid rgba(180,79,255,0.2);">
                            <tr>
                              <td style="padding:16px 20px;">
                                <p style="margin:0 0 4px;font-size:10px;letter-spacing:2.5px;
                                  color:#b44fff;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:700;">
                                  Team Name
                                </p>
                                <p style="margin:0;font-size:17px;color:#f0e8ff;font-weight:700;
                                  font-family:Arial,Helvetica,sans-serif;word-break:break-word;">
                                  ${teamName}
                                </p>
                              </td>
                            </tr>
                          </table>

                          <!-- ─── TEAM ID (hero) ─── -->
                          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                            style="margin-bottom:28px;border-radius:12px;
                            background:linear-gradient(135deg,rgba(180,79,255,0.12),rgba(0,207,255,0.08));
                            border:1.5px solid rgba(0,207,255,0.45);
                            box-shadow:0 0 24px rgba(0,207,255,0.12),inset 0 0 20px rgba(180,79,255,0.05);">
                            <tr>
                              <td style="padding:22px 20px;text-align:center;">
                                <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;
                                  color:#00cfff;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:800;">
                                  ✦ &nbsp;Your Team ID &nbsp;✦
                                </p>
                                <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:3px;
                                  color:#00cfff;font-family:'Courier New',monospace;word-break:break-all;
                                  text-shadow:0 0 12px rgba(0,207,255,0.7),0 0 30px rgba(0,207,255,0.3);">
                                  ${teamId}
                                </p>
                              </td>
                            </tr>
                          </table>

                          <!-- ─── EVENT DETAILS ─── -->
                          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                            style="margin-bottom:8px;border-radius:12px;
                            background:rgba(255,255,255,0.02);
                            border:1px solid rgba(180,79,255,0.15);">
                            <tr>
                              <td style="padding:20px 20px 8px;">
                                <p style="margin:0 0 16px;font-size:10px;letter-spacing:2.5px;
                                  color:#b44fff;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:800;">
                                  📅 &nbsp;Event Details
                                </p>
                              </td>
                            </tr>

                            <!-- Venue row -->
                            <tr>
                              <td style="padding:0 20px 14px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                  style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                  <tr>
                                    <td width="36" valign="middle"
                                      style="font-size:20px;padding-bottom:14px;">📍</td>
                                    <td valign="middle" style="padding-bottom:14px;">
                                      <p style="margin:0 0 2px;font-size:10px;letter-spacing:1.5px;
                                        color:#7c6fa0;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
                                        Venue
                                      </p>
                                      <p style="margin:0;font-size:14px;color:#e8deff;font-weight:600;
                                        font-family:Arial,Helvetica,sans-serif;">
                                        TP Mini Hall 2
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- Date row -->
                            <tr>
                              <td style="padding:0 20px 14px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                  style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                  <tr>
                                    <td width="36" valign="middle"
                                      style="font-size:20px;padding-bottom:14px;">🗓️</td>
                                    <td valign="middle" style="padding-bottom:14px;">
                                      <p style="margin:0 0 2px;font-size:10px;letter-spacing:1.5px;
                                        color:#7c6fa0;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
                                        Date
                                      </p>
                                      <p style="margin:0;font-size:14px;color:#e8deff;font-weight:600;
                                        font-family:Arial,Helvetica,sans-serif;">
                                        3rd – 4th April
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- Reporting time row -->
                            <tr>
                              <td style="padding:0 20px 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td width="36" valign="middle" style="font-size:20px;">⏰</td>
                                    <td valign="middle">
                                      <p style="margin:0 0 2px;font-size:10px;letter-spacing:1.5px;
                                        color:#7c6fa0;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
                                        Reporting Time
                                      </p>
                                      <p style="margin:0;font-size:14px;color:#e8deff;font-weight:600;
                                        font-family:Arial,Helvetica,sans-serif;">
                                        9:00 AM
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                          </table>
                          <!-- end event details -->

                        </td>
                      </tr>
                    </table>
                    <!-- end card inner -->

                  </td>
                </tr>
              </table>
              <!-- end glow border wrapper -->

            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- QR CODE SECTION                         -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;">

              <!-- Section label -->
              <p style="margin:0 0 6px;font-size:10px;letter-spacing:3px;
                color:#00cfff;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:800;">
                ✦ &nbsp;Your Entry QR Code &nbsp;✦
              </p>
              <p style="margin:0 0 20px;font-size:12px;color:#7c6fa0;
                font-family:Arial,Helvetica,sans-serif;">
                Show this at event check-in
              </p>

              <!-- QR glow border wrapper -->
              <table cellpadding="0" cellspacing="0" border="0"
                style="margin:0 auto;
                background:linear-gradient(135deg,rgba(0,207,255,0.7),rgba(180,79,255,0.6),rgba(255,79,216,0.5));
                border-radius:20px;padding:2px;">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0"
                      style="background:#0d071f;border-radius:18px;padding:22px;">
                      <tr>
                        <td align="center">
                          <img src="${qrUrl}"
                            alt="Team Entry QR Code"
                            width="220" height="220"
                            style="display:block;border-radius:10px;
                            border:2px solid rgba(0,207,255,0.25);" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- WHAT'S NEXT SECTION                     -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:28px 0 0;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="border-radius:14px;
                background:linear-gradient(135deg,rgba(255,79,216,0.07),rgba(180,79,255,0.06));
                border:1px solid rgba(255,79,216,0.2);">
                <tr>
                  <td style="padding:24px 28px;">

                    <p style="margin:0 0 16px;font-size:10px;letter-spacing:2.5px;
                      color:#ff4fd8;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:800;">
                      ✅ &nbsp;What's Next?
                    </p>

                    <!-- Item 1 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="margin-bottom:10px;">
                      <tr>
                        <td width="20" valign="top"
                          style="font-size:13px;color:#00cfff;font-family:Arial,Helvetica,sans-serif;
                          font-weight:700;padding-top:1px;">→</td>
                        <td style="font-size:13px;color:#a394c2;line-height:1.6;
                          font-family:Arial,Helvetica,sans-serif;padding-left:8px;">
                          Save this email — your Team ID and QR code are your entry pass
                        </td>
                      </tr>
                    </table>

                    <!-- Item 2 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="margin-bottom:10px;">
                      <tr>
                        <td width="20" valign="top"
                          style="font-size:13px;color:#00cfff;font-family:Arial,Helvetica,sans-serif;
                          font-weight:700;padding-top:1px;">→</td>
                        <td style="font-size:13px;color:#a394c2;line-height:1.6;
                          font-family:Arial,Helvetica,sans-serif;padding-left:8px;">
                          Arrive 30 minutes early for a smooth check-in
                        </td>
                      </tr>
                    </table>

                    <!-- Item 3 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="margin-bottom:10px;">
                      <tr>
                        <td width="20" valign="top"
                          style="font-size:13px;color:#00cfff;font-family:Arial,Helvetica,sans-serif;
                          font-weight:700;padding-top:1px;">→</td>
                        <td style="font-size:13px;color:#a394c2;line-height:1.6;
                          font-family:Arial,Helvetica,sans-serif;padding-left:8px;">
                          Bring your laptops, chargers, and your best ideas
                        </td>
                      </tr>
                    </table>

                    <!-- Item 4 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="20" valign="top"
                          style="font-size:13px;color:#ff4fd8;font-family:Arial,Helvetica,sans-serif;
                          font-weight:700;padding-top:1px;">→</td>
                        <td style="font-size:13px;color:#a394c2;line-height:1.6;
                          font-family:Arial,Helvetica,sans-serif;padding-left:8px;">
                          Get ready for an unforgettable experience 🚀
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ═══════════════════════════════════════ -->
          <!-- FOOTER                                  -->
          <!-- ═══════════════════════════════════════ -->
          <tr>
            <td style="padding:36px 0 0;text-align:center;">

              <!-- Decorative line -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin-bottom:28px;">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent,#b44fff,#00cfff,#b44fff,transparent);
                    font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:15px;color:#e8deff;font-weight:600;
                font-family:Arial,Helvetica,sans-serif;">
                We can't wait to see you at Resonate Hackathon 🎉
              </p>
              <p style="margin:0 0 20px;font-size:12px;color:#7c6fa0;
                font-family:Arial,Helvetica,sans-serif;">
                Questions? We're here for you.
              </p>

              <!-- Contact badge -->
              <table cellpadding="0" cellspacing="0" border="0"
                style="margin:0 auto;border-radius:20px;
                background:rgba(0,207,255,0.07);
                border:1px solid rgba(0,207,255,0.2);
                padding:8px 20px;">
                <tr>
                  <td style="font-size:13px;color:#00cfff;font-family:Arial,Helvetica,sans-serif;
                    font-weight:600;letter-spacing:0.5px;">
                    mlsasrm14@gmail.com
                  </td>
                </tr>
              </table>

              <!-- Copyright -->
              <p style="margin:28px 0 0;font-size:11px;color:#3d3060;
                font-family:Arial,Helvetica,sans-serif;letter-spacing:0.5px;">
                © 2026 Resonate Hackathon &nbsp;·&nbsp; All rights reserved.
              </p>

              <!-- Bottom spark -->
              <p style="margin:12px 0 0;font-size:16px;color:rgba(180,79,255,0.4);">✦</p>

            </td>
          </tr>

        </table>
        <!-- End main container -->

      </td>
    </tr>
  </table>
  <!-- End outer wrapper -->

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