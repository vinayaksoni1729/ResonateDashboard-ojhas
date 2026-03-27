"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

export default function ScannerPage() {
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [message, setMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);

  // Initialize QR code scanner on demand
  const startScanner = async () => {
    setIsStarting(true);
    setMessage("");

    // Wait for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if element exists
    const element = document.getElementById("qr-reader");
    if (!element) {
      console.error("qr-reader element not found");
      setMessage("❌ Scanner element not found in DOM");
      setIsStarting(false);
      return;
    }

    try {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        },
        false
      );

      const onScanSuccess = async (decodedText) => {
        // Prevent multiple simultaneous scans
        if (isScanningRef.current) return;
        isScanningRef.current = true;
        setIsScanning(true);

        try {
          // Parse QR code JSON
          const qrData = JSON.parse(decodedText);
          const scannedTeamId = qrData.teamId;

          if (!scannedTeamId) {
            setMessage("❌ Invalid QR code format");
            isScanningRef.current = false;
            setIsScanning(false);
            return;
          }

          // Query Firestore for the team
          const registrationsRef = collection(db, "registrations");
          const q = query(registrationsRef, where("teamId", "==", scannedTeamId));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            setMessage(`❌ Team ${scannedTeamId} not found`);
            isScanningRef.current = false;
            setIsScanning(false);
            return;
          }

          // Get the registration document
          const registrationDoc = querySnapshot.docs[0];
          const registrationData = registrationDoc.data();

          // Check if already checked in
          if (registrationData.checkIn === true) {
            setMessage(`⚠️  Team ${scannedTeamId} already checked in`);
            isScanningRef.current = false;
            setIsScanning(false);
            return;
          }

          // Update Firestore: mark as checked in
          const registrationRef = doc(db, "registrations", registrationDoc.id);
          await updateDoc(registrationRef, {
            checkIn: true,
          });

          setMessage(`✅ Check-in successful for team ${scannedTeamId}`);
        } catch (error) {
          console.error("Scan error:", error);
          
          // Check if it's a JSON parse error
          if (error instanceof SyntaxError) {
            setMessage("❌ Invalid QR code format");
          } else {
            setMessage(`❌ Error: ${error.message}`);
          }
        } finally {
          // Re-enable scanning after a delay
          setTimeout(() => {
            isScanningRef.current = false;
            setIsScanning(false);
          }, 2000);
        }
      };

      const onScanFailure = (error) => {
        // Silently handle scan failures (camera scanning continuously)
        console.debug("Scan attempt:", error);
      };

      try {
        console.log("Starting scanner.render()...");
        // Render returns a promise, so we await it
        await scanner.render(onScanSuccess, onScanFailure);
        console.log("Scanner rendered successfully");
        setScannerInitialized(true);
        scannerRef.current = scanner;
        setIsStarting(false);
      } catch (renderErr) {
        console.error("Scanner render error:", renderErr);
        setMessage("❌ Failed to initialize camera. Please check camera permissions.");
        setIsStarting(false);
      }
    } catch (err) {
      console.error("Scanner initialization error:", err);
      setMessage("❌ Could not initialize camera");
      setIsStarting(false);
    }
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.debug("Error clearing scanner:", e);
        }
      }
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Team Check-In Scanner</h1>
        <p style={styles.subtitle}>Point camera at QR code to check in team</p>
      </div>

      {!scannerInitialized && (
        <div style={styles.loading}>
          {!isStarting ? (
            <>
              <p style={{ marginBottom: "20px", fontSize: "16px" }}>Click the button below to start the scanner</p>
              <button
                onClick={startScanner}
                style={styles.startButton}
                disabled={isStarting}
              >
                🎥 Start Scanner
              </button>
              <p style={styles.permissionHint}>You will be asked to allow camera access</p>
            </>
          ) : (
            <>
              <div style={{
                ...styles.spinner,
                animation: "spin 1s linear infinite"
              }}></div>
              <p>Initializing camera...</p>
              <p style={styles.permissionHint}>Please allow camera access when prompted</p>
            </>
          )}
          {message && <p style={{ color: "#d32f2f", marginTop: "20px" }}>{message}</p>}
        </div>
      )}

      <div
        id="qr-reader"
        style={{
          width: "100%",
          maxWidth: "500px",
          margin: "0 auto",
          display: scannerInitialized ? "block" : "none",
        }}
      />

      {message && scannerInitialized && (
        <div style={styles.messageBox}>
          <p style={styles.messageText}>{message}</p>
          <button
            onClick={() => setMessage("")}
            style={styles.closeButton}
          >
            ✕
          </button>
        </div>
      )}

      {scannerInitialized && (
        <div style={styles.info}>
          <p>Status: {isScanning ? "🔍 Scanning..." : "✓ Ready"}</p>
        </div>
      )}
    </div>
  );
}

// Inline styles for simplicity
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#333",
    margin: "0 0 10px 0",
  },
  subtitle: {
    fontSize: "16px",
    color: "#666",
    margin: "0",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    color: "#666",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #f0f0f0",
    borderTop: "4px solid #0891b2",
    borderRadius: "50%",
    margin: "0 auto 20px",
    animation: "spin 1s linear infinite",
  },
  permissionHint: {
    fontSize: "12px",
    color: "#999",
    marginTop: "10px",
  },
  startButton: {
    backgroundColor: "#0891b2",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    marginBottom: "15px",
  },
  messageBox: {
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "#fff",
    border: "2px solid #ddd",
    borderRadius: "8px",
    maxWidth: "500px",
    margin: "30px auto 0",
    position: "relative",
  },
  messageText: {
    fontSize: "18px",
    fontWeight: "500",
    color: "#333",
    margin: "0",
    paddingRight: "30px",
  },
  closeButton: {
    position: "absolute",
    right: "15px",
    top: "15px",
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#999",
    padding: "0",
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    textAlign: "center",
    marginTop: "20px",
    color: "#666",
    fontSize: "14px",
  },
};

// Add global animation styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;
  document.head.appendChild(styleSheet);
}
