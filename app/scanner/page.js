"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

export default function ScannerPage() {
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [message, setMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);

  // Initialize QR code scanner
  useEffect(() => {
    const initializeScanner = async () => {
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

        const onScanFailure = () => {
          // Silently handle scan failures (camera scanning continuously)
        };

        // Render returns a promise, so we await it
        await scanner.render(onScanSuccess, onScanFailure);
        setScannerInitialized(true);
        scannerRef.current = scanner;
      } catch (err) {
        console.error("Scanner initialization error:", err);
        setMessage("❌ Could not initialize camera");
      }
    };

    initializeScanner();

    // Cleanup scanner on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
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
          <p>Initializing camera...</p>
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

      {message && (
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

      <div style={styles.info}>
        <p>Status: {isScanning ? "Scanning..." : "Ready"}</p>
      </div>
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
