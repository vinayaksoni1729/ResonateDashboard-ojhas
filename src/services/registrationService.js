import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export async function getRegistrations() {
  try {
    const registrationsQuery = query(collection(db, "registrations"));
    const snapshot = await getDocs(registrationsQuery);

    return snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        teamName: data.teamName,
        trackChoice: data.trackChoice,
        numberOfMembers: data.numberOfMembers,
        members: data.members,
        leaderEmail: data.leaderEmail,
        paymentProofUrl: data.paymentProofUrl,
        submittedAt: data.submittedAt,
        reviewedAt: data.reviewedAt,
        reviewedBy: data.reviewedBy,
        status: data.status ?? data.approvalStatus ?? "pending",
        approvalStatus: data.approvalStatus,
        checkIn: data.checkIn === true
      };
    });
  } catch (error) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "";

    if (errorCode === "permission-denied") {
      throw new Error("ACCESS_DENIED");
    }

    console.error(error);
    throw error;
  }
}

export async function testFirestoreConnection() {
  const testQuery = query(collection(db, "registrations"), limit(1));
  const snapshot = await getDocs(testQuery);

  if (snapshot.docs.length > 0) {
    console.log("Firestore read success");
    console.log(snapshot.docs[0].id);
  }
}

export async function updateRegistrationStatus(id, status, teamId) {
  if (!auth.currentUser) {
    throw new Error("Not authenticated");
  }

  const allowedStatuses = ["approved", "pending", "hold"];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid approval status: ${status}. Allowed values: approved, pending, hold`
    );
  }

  try {
    const registrationRef = doc(db, "registrations", id);
    const beforeSnapshot = await getDoc(registrationRef);

    if (!beforeSnapshot.exists()) {
      throw new Error(`Registration document not found: ${id}`);
    }

    const beforeData = beforeSnapshot.data();
    const hasTeamName = Object.prototype.hasOwnProperty.call(beforeData, "teamName");
    const hasMembers = Object.prototype.hasOwnProperty.call(beforeData, "members");
    const hasPaymentProofUrl = Object.prototype.hasOwnProperty.call(
      beforeData,
      "paymentProofUrl"
    );

    if (!hasTeamName || !hasMembers || !hasPaymentProofUrl) {
      throw new Error("Missing required fields. Update aborted.");
    }

    const updateData = {
      status,
      reviewedAt: serverTimestamp()
    };

    if (teamId) {
      updateData.teamId = teamId;
    }

    await updateDoc(registrationRef, updateData);

    console.log("Status updated safely");
  } catch (error) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "";

    if (errorCode === "permission-denied") {
      throw new Error("PERMISSION_DENIED");
    }

    throw error;
  }
}

export async function testApprovalUpdate() {
  const testQuery = query(collection(db, "registrations"), limit(1));
  const snapshot = await getDocs(testQuery);

  if (snapshot.docs.length === 0) {
    throw new Error("No registration documents found for approval update test");
  }

  const firstDoc = snapshot.docs[0];
  const originalKeys = Object.keys(firstDoc.data());

  await updateRegistrationStatus(firstDoc.id, "pending");

  const updatedSnapshot = await getDoc(doc(db, "registrations", firstDoc.id));

  if (!updatedSnapshot.exists()) {
    throw new Error("Document missing after approval update test");
  }

  const updatedKeys = Object.keys(updatedSnapshot.data());
  const noKeysRemoved = originalKeys.every((key) => updatedKeys.includes(key));

  if (!noKeysRemoved) {
    throw new Error("Schema integrity check failed: one or more keys were removed");
  }

  console.log("Schema integrity maintained");
}
