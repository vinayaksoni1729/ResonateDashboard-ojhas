"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { User } from "firebase/auth";
import { collection, getDocs, limit, query } from "firebase/firestore";
import {
  getRegistrations,
  updateRegistrationStatus
} from "../src/services/registrationService";
import {
  listenToAuthState,
  signInWithGoogle,
  signOutUser
} from "../src/services/authService";
import { db } from "../src/lib/firebase";
import styles from "./page.module.css";

const READ_ONLY_MODE = false;
type StatusFilter = "all" | "pending" | "approved" | "hold";
type PendingAction = {
  id: string;
  teamName: string;
  status: "approved" | "hold";
};

type RegistrationMember = {
  name?: string;
  memberName?: string;
  registerNumber?: string;
  registrationNumber?: string;
  email?: string;
};

type Registration = {
  id: string;
  teamName: string;
  trackChoice: string;
  numberOfMembers: number;
  members?: RegistrationMember[];
  leaderEmail: string;
  paymentProofUrl: string;
  submittedAt?: unknown;
  reviewedAt?: unknown;
  reviewedBy?: string;
  status?: string;
  approvalStatus?: string;
};

const getNormalizedStatus = (status: string | undefined) => {
  if (status === "approved" || status === "hold" || status === "pending") {
    return status;
  }

  return "pending";
};

const getRegistrationStatus = (registration: {
  status?: string;
  approvalStatus?: string;
}) =>
  getNormalizedStatus(
    registration.status || registration.approvalStatus || "pending"
  );

export default function Home() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    "checking" | "authorized" | "denied"
  >("checking");
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [selectedProofRegistrationId, setSelectedProofRegistrationId] = useState<
    string | null
  >(null);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("all");
  const [expandedRegistrationId, setExpandedRegistrationId] = useState<
    string | null
  >(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [csvDownloadMessage, setCsvDownloadMessage] = useState<string | null>(null);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState<string | null>(null);
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const secondaryBarRef = useRef<HTMLDivElement | null>(null);
  const [barHeights, setBarHeights] = useState({ topbar: 60, secondary: 72 });

  const formatStatusLabel = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1);

  const getTrackPill = (trackChoice: string | undefined) => {
    const value = trackChoice ?? "";

    if (value === "Agentic AI & Workforce Augmentation") {
      return { label: "Agentic AI", className: styles.trackAgentic };
    }

    if (value === "Inclusive FinTech & Financial Wellness") {
      return { label: "Inclusive FinTech", className: styles.trackFintech };
    }

    return { label: value || "Other", className: styles.trackOther };
  };

  const formatSubmittedDate = (submittedAt: unknown) => {
    if (
      submittedAt &&
      typeof submittedAt === "object" &&
      "seconds" in submittedAt &&
      typeof (submittedAt as { seconds: unknown }).seconds === "number"
    ) {
      const date = new Date((submittedAt as { seconds: number }).seconds * 1000);
      return date.toLocaleDateString();
    }

    return "";
  };

  const getMemberName = (member: {
    name?: string;
    memberName?: string;
  }) => member.name ?? member.memberName ?? "Unknown Member";

  const getMemberRegisterNumber = (member: {
    registerNumber?: string;
    registrationNumber?: string;
  }) => member.registerNumber ?? member.registrationNumber ?? "N/A";

  const getMemberInitials = (memberName: string) => {
    const parts = memberName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "NA";
    }

    const initials = parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

    return initials || "NA";
  };

  const fetchRegistrations = async () => {
    try {
      const data = await getRegistrations();
      setRegistrations(data);
    } catch (error) {
      const errorCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : "";

      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "";

      if (errorCode === "permission-denied" || errorMessage === "ACCESS_DENIED") {
        setPermissionErrorMessage("You do not have permission to access registrations.");
      } else {
        console.error("Error fetching registrations:", error);
      }
    }
  };

  const formatCsvDateTime = (value: unknown) => {
    if (!value) {
      return "";
    }

    let date: Date | null = null;

    if (
      typeof value === "object" &&
      value !== null &&
      "seconds" in value &&
      typeof (value as { seconds: unknown }).seconds === "number"
    ) {
      date = new Date((value as { seconds: number }).seconds * 1000);
    } else if (value instanceof Date) {
      date = value;
    } else if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      date = Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (!date || Number.isNaN(date.getTime())) {
      return "";
    }

    const pad = (num: number) => String(num).padStart(2, "0");

    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const sanitizeCsvText = (value: unknown) =>
    String(value ?? "").trim().replace(/,/g, ";");

  const escapeCsvValue = (value: unknown) =>
    `"${sanitizeCsvText(value).replace(/"/g, '""')}"`;

  const getLeaderRegisterNumber = (registration: Registration) => {
    if (!Array.isArray(registration.members)) {
      return "";
    }

    const leader = registration.members.find((member) => {
      const memberEmail = (member.email ?? "").trim().toLowerCase();
      return memberEmail === (registration.leaderEmail ?? "").trim().toLowerCase();
    });

    return leader ? getMemberRegisterNumber(leader) : "";
  };

  const exportToCSV = (registrationsToExport: Registration[], filterName: string) => {
    const headers = [
      "Team Name",
      "Track",
      "Leader Email",
      "Leader Register Number",
      "Members Count",
      "Status",
      "Submitted At",
      "Reviewed By",
      "Reviewed At",
      "Members"
    ];

    const rows = registrationsToExport.map((registration) => {
      const membersJoined = Array.isArray(registration.members)
        ? registration.members
            .map((member) => getMemberName(member))
            .filter((name) => typeof name === "string" && name.trim().length > 0)
            .join(" | ")
        : "";

      return [
        escapeCsvValue(registration.teamName),
        escapeCsvValue(registration.trackChoice),
        escapeCsvValue(registration.leaderEmail),
        escapeCsvValue(getLeaderRegisterNumber(registration)),
        escapeCsvValue(registration.numberOfMembers),
        escapeCsvValue(getRegistrationStatus(registration)),
        escapeCsvValue(formatCsvDateTime(registration.submittedAt)),
        escapeCsvValue(registration.reviewedBy ?? ""),
        escapeCsvValue(formatCsvDateTime(registration.reviewedAt)),
        escapeCsvValue(membersJoined)
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const datePart = new Date().toISOString().slice(0, 10);
    const fileName = `hackathon_registrations_${filterName}_${registrationsToExport.length}_${datePart}.csv`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    if (filteredRegistrations.length === 0) {
      return;
    }

    exportToCSV(filteredRegistrations, activeFilter);
    setCsvDownloadMessage(`CSV downloaded (${filteredRegistrations.length} registrations)`);
  };

  useEffect(() => {
    const unsubscribe = listenToAuthState((user: User | null) => {
      setCurrentUser(
        user
          ? {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL
            }
          : null
      );

      if (user) {
        setPermissionStatus("checking");
      } else {
        setPermissionStatus("checking");
        setRegistrations([]);
      }

      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const checkPermission = async () => {
      try {
        const permissionProbe = query(collection(db, "registrations"), limit(1));
        await getDocs(permissionProbe);
        setPermissionStatus("authorized");
      } catch (error) {
        const errorCode =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : "";

        if (errorCode === "permission-denied") {
          setPermissionStatus("denied");
          setRegistrations([]);
        } else {
          throw error;
        }
      }
    };

    void checkPermission();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || permissionStatus !== "authorized") {
      return;
    }

    const loadRegistrations = async () => {
      setRegistrationsLoading(true);
      await fetchRegistrations();
      setRegistrationsLoading(false);
    };

    void loadRegistrations();
  }, [currentUser, permissionStatus]);

  useEffect(() => {
    if (!csvDownloadMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCsvDownloadMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [csvDownloadMessage]);

  useEffect(() => {
    if (!permissionErrorMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPermissionErrorMessage(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [permissionErrorMessage]);

  useEffect(() => {
    const updateBarHeights = () => {
      const topbarHeight = topbarRef.current
        ? Math.ceil(topbarRef.current.getBoundingClientRect().height)
        : 60;
      const secondaryHeight = secondaryBarRef.current
        ? Math.ceil(secondaryBarRef.current.getBoundingClientRect().height)
        : 72;

      setBarHeights((current) =>
        current.topbar === topbarHeight && current.secondary === secondaryHeight
          ? current
          : { topbar: topbarHeight, secondary: secondaryHeight }
      );
    };

    const frame = window.requestAnimationFrame(updateBarHeights);
    window.addEventListener("resize", updateBarHeights);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateBarHeights);
    };
  }, [currentUser, registrations]);

  const handleStatusUpdate = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await updateRegistrationStatus(id, status);
      await fetchRegistrations();
      console.log("Status updated safely");
    } catch (error) {
      const errorCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : "";

      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "";

      if (errorCode === "permission-denied" || errorMessage === "PERMISSION_DENIED") {
        setPermissionErrorMessage("You do not have permission to update this registration.");
      } else {
        setPermissionErrorMessage("An error occurred while updating the registration.");
        console.error("Error updating status:", error);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const promptStatusUpdate = (
    id: string,
    teamName: string,
    status: "approved" | "hold"
  ) => {
    setPendingAction({ id, teamName, status });
  };

  const confirmStatusUpdate = async () => {
    if (!pendingAction) {
      return;
    }

    await handleStatusUpdate(pendingAction.id, pendingAction.status);
    setPendingAction(null);
  };

  const counts = useMemo(
    () => ({
      all: registrations.length,
      pending: registrations.filter(
        (registration) => getRegistrationStatus(registration) === "pending"
      ).length,
      approved: registrations.filter(
        (registration) => getRegistrationStatus(registration) === "approved"
      ).length,
      hold: registrations.filter(
        (registration) => getRegistrationStatus(registration) === "hold"
      ).length
    }),
    [registrations]
  );

  const trackOptions = useMemo(() => {
    const uniqueTracks = Array.from(
      new Set(
        registrations
          .map((registration) => registration.trackChoice)
          .filter((trackChoice) => typeof trackChoice === "string" && trackChoice.trim())
      )
    ) as string[];

    return uniqueTracks.sort((a, b) => a.localeCompare(b));
  }, [registrations]);

  const filteredRegistrations = registrations.filter((registration) => {
    const normalizedStatus = getRegistrationStatus(registration);
    const team = (registration.teamName ?? "").toLowerCase();
    const leaderEmail = (registration.leaderEmail ?? "").toLowerCase();
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      search.length === 0 || team.includes(search) || leaderEmail.includes(search);
    const matchesTrack =
      selectedTrack === "all" || registration.trackChoice === selectedTrack;
    const matchesStatus = activeFilter === "all" || normalizedStatus === activeFilter;

    return matchesSearch && matchesTrack && matchesStatus;
  });

  const selectedProofRegistration =
    selectedProofRegistrationId !== null
      ? registrations.find(
          (registration) => registration.id === selectedProofRegistrationId
        ) ?? null
      : null;

  if (authLoading) {
    return (
      <div className={styles.authGate}>
        <div className={styles.authChecking}>
          <span className={styles.authSpinner} aria-hidden="true" />
          <p className={styles.authCheckingText}>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={styles.authGate}>
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>Organizer Dashboard</h1>
          {authError ? (
            <div className={styles.authErrorMessage}>
              {authError}
            </div>
          ) : null}
          <button
            type="button"
            className={styles.authButton}
            onClick={async () => {
              try {
                await signInWithGoogle();
                setAuthError(null);
              } catch (error) {
                const errorMessage =
                  typeof error === "object" &&
                  error !== null &&
                  "message" in error &&
                  typeof error.message === "string"
                    ? error.message
                    : "";

                if (errorMessage === "UNAUTHORIZED_USER") {
                  setAuthError("Your email is not authorized to access this dashboard. Please contact the event administrator.");
                } else {
                  setAuthError("Sign in failed. Please try again.");
                }
              }
            }}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (permissionStatus === "checking") {
    return (
      <div className={styles.authGate}>
        <div className={styles.authChecking}>
          <span className={styles.authSpinner} aria-hidden="true" />
          <p className={styles.authCheckingText}>Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (permissionStatus === "denied") {
    return (
      <div className={styles.authGate}>
        <div className={styles.authCard}>
          <div className={styles.deniedIcon} aria-hidden="true">
            🔒
          </div>
          <h1 className={styles.authTitle}>Access Restricted</h1>
          <p className={styles.authMessage}>
            You do not have permission to access this organizer dashboard.
          </p>
          <p className={styles.authHint}>
            If you believe this is an error contact event admin.
          </p>
          <button
            type="button"
            className={styles.deniedLogoutButton}
            onClick={() => void signOutUser()}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (permissionStatus !== "authorized") {
    return (
      <div className={styles.authGate}>
        <div className={styles.authChecking}>
          <span className={styles.authSpinner} aria-hidden="true" />
          <p className={styles.authCheckingText}>Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (registrationsLoading) {
    return <div>Loading registrations...</div>;
  }

  if (!Array.isArray(registrations) || registrations.length === 0) {
    return <div>No registrations found</div>;
  }

  return (
    <div
      className={styles.container}
      style={{ paddingTop: `${barHeights.topbar + barHeights.secondary + 20}px` }}
    >
      <div className={styles.topbar} ref={topbarRef}>
        <div className={styles.topbarInner}>
          <div className={styles.topbarBrand}>
            <span className={styles.brandDot} />
            <span className={styles.brandText}>Hackathon Admin</span>
          </div>

          <div className={styles.topbarStats}>
            <span className={`${styles.statPill} ${styles.statTotal}`}>
              <span className={`${styles.statDot} ${styles.dotTotal}`} />
              {counts.all} Total
            </span>
            <span className={`${styles.statPill} ${styles.statPending}`}>
              <span className={`${styles.statDot} ${styles.dotPending}`} />
              {counts.pending} Pending
            </span>
            <span className={`${styles.statPill} ${styles.statApproved}`}>
              <span className={`${styles.statDot} ${styles.dotApproved}`} />
              {counts.approved} Approved
            </span>
            <span className={`${styles.statPill} ${styles.statHold}`}>
              <span className={`${styles.statDot} ${styles.dotHold}`} />
              {counts.hold} Hold
            </span>
          </div>

          <div className={styles.topbarRight}>
            {currentUser.photoURL ? (
              <Image
                src={currentUser.photoURL}
                alt="User profile"
                className={styles.userPhoto}
                width={28}
                height={28}
                unoptimized
              />
            ) : (
              <div className={styles.userPhotoFallback}>
                {(currentUser.displayName ?? currentUser.email ?? "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
            <div className={styles.userMeta}>
              <div className={styles.userName}>
                {currentUser.displayName ?? "Organizer"}
              </div>
              <div className={styles.userEmail}>{currentUser.email ?? "No email"}</div>
            </div>
            <button
              type="button"
              className={styles.logoutButton}
              onClick={() => void signOutUser()}
            >
              Logout
            </button>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => void fetchRegistrations()}
            >
              Refresh
            </button>
            <span
              className={styles.csvButtonWrap}
              title={
                filteredRegistrations.length === 0 ? "No registrations to export" : undefined
              }
            >
              <button
                type="button"
                className={`${styles.csvButton} ${styles.csvTopbarButton}`}
                onClick={handleDownloadCSV}
                disabled={filteredRegistrations.length === 0}
              >
                Download CSV
              </button>
            </span>
          </div>
        </div>
      </div>
      <div
        className={styles.secondaryBar}
        ref={secondaryBarRef}
        style={{ top: `${barHeights.topbar}px` }}
      >
        <div className={styles.secondaryInner}>
          <div className={styles.searchWrap}>
            <svg
              className={styles.searchIcon}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M21 21L16.65 16.65M18 11C18 14.866 14.866 18 11 18C7.13401 18 4 14.866 4 11C4 7.13401 7.13401 4 11 4C14.866 4 18 7.13401 18 11Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search team or leader email…"
              className={styles.searchInput}
            />
          </div>

          <select
            value={selectedTrack}
            onChange={(event) => setSelectedTrack(event.target.value)}
            className={styles.trackSelect}
          >
            <option value="all">All tracks</option>
            {trackOptions.map((track) => (
              <option key={track} value={track}>
                {track}
              </option>
            ))}
          </select>

          <div className={styles.segmentedControl}>
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`${styles.segmentButton} ${
                activeFilter === "all" ? styles.segmentActive : styles.segmentInactive
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("pending")}
              className={`${styles.segmentButton} ${
                activeFilter === "pending" ? styles.segmentActive : styles.segmentInactive
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("approved")}
              className={`${styles.segmentButton} ${
                activeFilter === "approved" ? styles.segmentActive : styles.segmentInactive
              }`}
            >
              Approved ({counts.approved})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("hold")}
              className={`${styles.segmentButton} ${
                activeFilter === "hold" ? styles.segmentActive : styles.segmentInactive
              }`}
            >
              Hold ({counts.hold})
            </button>
          </div>
        </div>
      </div>
      <h1 className={styles.title}>Registrations Dashboard</h1>
      {csvDownloadMessage ? (
        <div className={styles.csvToast} role="status" aria-live="polite">
          {csvDownloadMessage}
        </div>
      ) : null}
      {permissionErrorMessage ? (
        <div
          className={styles.permissionErrorOverlay}
          role="presentation"
          onClick={() => setPermissionErrorMessage(null)}
        >
          <div
            className={styles.permissionErrorDialog}
            role="alertdialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.permissionErrorIconBox}>
              🔒
            </div>
            <h2 className={styles.permissionErrorTitle}>Access Denied</h2>
            <p className={styles.permissionErrorMessage}>
              {permissionErrorMessage}
            </p>
            <div className={styles.permissionErrorButtons}>
              <button
                type="button"
                onClick={() => setPermissionErrorMessage(null)}
                className={styles.permissionErrorButton}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${styles.headerCell} ${styles.teamHeader}`}>Team</th>
              <th className={`${styles.headerCell} ${styles.trackHeader}`}>Track</th>
              <th className={`${styles.headerCell} ${styles.membersHeader}`}>Members</th>
              <th className={`${styles.headerCell} ${styles.emailHeader}`}>Leader Email</th>
              <th className={`${styles.headerCell} ${styles.paymentHeader}`}>Payment</th>
              <th className={`${styles.headerCell} ${styles.statusHeader}`}>Status</th>
              <th className={`${styles.headerCell} ${styles.actionsHeader}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistrations.map((registration) => (
              <Fragment key={registration.id}>
               <tr className={styles.row}>
                 <td className={`${styles.cell} ${styles.teamCell}`}>
                   <div className={styles.teamName}>{registration.teamName}</div>
                    {formatSubmittedDate(registration.submittedAt) ? (
                      <div className={styles.submittedDate}>
                        {formatSubmittedDate(registration.submittedAt)}
                      </div>
                    ) : null}
                 </td>
                 <td className={`${styles.cell} ${styles.trackCell}`}>
                   <span
                     className={`${styles.trackPill} ${
                       getTrackPill(registration.trackChoice).className
                     }`}
                   >
                     {getTrackPill(registration.trackChoice).label}
                   </span>
                 </td>
                 <td className={`${styles.cell} ${styles.membersCell}`}>
                   {registration.numberOfMembers}
                 </td>
                 <td className={`${styles.cell} ${styles.emailCell} font-mono`}>
                   {registration.leaderEmail}
                 </td>
                 <td className={`${styles.cell} ${styles.paymentCell}`}>
                   {registration.paymentProofUrl ? (
                     <button
                      type="button"
                      onClick={() => {
                        setSelectedProofUrl(registration.paymentProofUrl);
                        setSelectedProofRegistrationId(registration.id);
                       }}
                       className={styles.proofButton}
                      >
                        View
                      </button>
                   ) : (
                     "N/A"
                   )}
                 </td>
                  <td className={`${styles.cell} ${styles.statusCell}`}>
                    <span
                      className={`${styles.statusBadge} ${
                        getRegistrationStatus(registration) === "approved"
                          ? styles.statusApproved
                          : getRegistrationStatus(registration) === "hold"
                            ? styles.statusHold
                            : styles.statusPending
                      }`}
                    >
                      {formatStatusLabel(getRegistrationStatus(registration))}
                    </span>
                  </td>
                  <td className={`${styles.cell} ${styles.actionsCell}`}>
                    <div className={styles.actionsRow}>
                      <button
                        type="button"
                        onClick={() =>
                          promptStatusUpdate(registration.id, registration.teamName, "approved")
                        }
                        disabled={
                          READ_ONLY_MODE ||
                          updatingId === registration.id ||
                          getRegistrationStatus(registration) === "approved"
                        }
                        className={styles.approveButton}
                      >
                        Approve
                      </button>
                     <button
                       type="button"
                        onClick={() =>
                          promptStatusUpdate(registration.id, registration.teamName, "hold")
                        }
                        disabled={
                          READ_ONLY_MODE ||
                          updatingId === registration.id ||
                          getRegistrationStatus(registration) === "hold"
                        }
                        className={styles.holdButton}
                      >
                        Hold
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRegistrationId((currentId) =>
                            currentId === registration.id ? null : registration.id
                          )
                        }
                        className={styles.membersButton}
                      >
                        {expandedRegistrationId === registration.id
                          ? "Members (Hide)"
                          : "Members"}
                      </button>
                   </div>
                 </td>
              </tr>
              {expandedRegistrationId === registration.id ? (
                 <tr>
                   <td className={styles.expandedCell} colSpan={7}>
                     <div className={styles.membersPanel}>
                       <div className={styles.membersPanelLabel}>
                         TEAM MEMBERS —{" "}
                         {Array.isArray(registration.members)
                           ? registration.members.length
                           : 0}
                       </div>
                       {Array.isArray(registration.members) &&
                       registration.members.length > 0 ? (
                         <div className={styles.membersCards}>
                           {registration.members.map((member, index) => {
                             const memberName = getMemberName(member);
                             const registerNumber = getMemberRegisterNumber(member);
                             const memberEmail = member.email ?? "";
                             const isLeader =
                               memberEmail.toLowerCase() ===
                               (registration.leaderEmail ?? "").toLowerCase();

                             return (
                               <div
                                 className={styles.memberCard}
                                 key={`${registration.id}-member-${index}`}
                               >
                                 <div className={styles.memberAvatar}>
                                   {getMemberInitials(memberName)}
                                 </div>
                                 <div className={styles.memberMeta}>
                                   <div className={styles.memberName}>{memberName}</div>
                                   <div className={`${styles.memberRegister} font-mono`}>
                                     {registerNumber}
                                   </div>
                                 </div>
                                 {isLeader ? (
                                   <span className={styles.leaderBadge}>Leader</span>
                                 ) : null}
                               </div>
                             );
                           })}
                         </div>
                       ) : (
                         <div>No member details found.</div>
                       )}
                     </div>
                   </td>
                 </tr>
               ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.mobileCards}>
        {filteredRegistrations.map((registration) => (
          <div key={`mobile-${registration.id}`} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <div>
                <div className={styles.teamName}>{registration.teamName}</div>
                {formatSubmittedDate(registration.submittedAt) ? (
                  <div className={styles.submittedDate}>
                    {formatSubmittedDate(registration.submittedAt)}
                  </div>
                ) : null}
              </div>
              <span
                className={`${styles.statusBadge} ${
                  getRegistrationStatus(registration) === "approved"
                    ? styles.statusApproved
                    : getRegistrationStatus(registration) === "hold"
                      ? styles.statusHold
                      : styles.statusPending
                }`}
              >
                {formatStatusLabel(getRegistrationStatus(registration))}
              </span>
            </div>

            <div className={styles.mobileMetaRow}>
              <span
                className={`${styles.trackPill} ${
                  getTrackPill(registration.trackChoice).className
                }`}
              >
                {getTrackPill(registration.trackChoice).label}
              </span>
              <span className={styles.mobileMembersMeta}>
                {registration.numberOfMembers} members
              </span>
            </div>

            <div className={`${styles.mobileEmail} font-mono`}>
              {registration.leaderEmail}
            </div>

            <div className={styles.mobileActions}>
              {registration.paymentProofUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProofUrl(registration.paymentProofUrl);
                    setSelectedProofRegistrationId(registration.id);
                  }}
                  className={styles.proofButton}
                >
                  View
                </button>
              ) : (
                <span className={styles.mobileMuted}>No proof</span>
              )}
              <button
                type="button"
                onClick={() =>
                  promptStatusUpdate(registration.id, registration.teamName, "approved")
                }
                disabled={
                  READ_ONLY_MODE ||
                  updatingId === registration.id ||
                  getRegistrationStatus(registration) === "approved"
                }
                className={styles.approveButton}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() =>
                  promptStatusUpdate(registration.id, registration.teamName, "hold")
                }
                disabled={
                  READ_ONLY_MODE ||
                  updatingId === registration.id ||
                  getRegistrationStatus(registration) === "hold"
                }
                className={styles.holdButton}
              >
                Hold
              </button>
              <button
                type="button"
                onClick={() =>
                  setExpandedRegistrationId((currentId) =>
                    currentId === registration.id ? null : registration.id
                  )
                }
                className={styles.membersButton}
              >
                {expandedRegistrationId === registration.id ? "Members (Hide)" : "Members"}
              </button>
            </div>

            {expandedRegistrationId === registration.id ? (
              <div className={styles.mobileMembersWrap}>
                <div className={styles.membersPanelLabel}>
                  TEAM MEMBERS — {Array.isArray(registration.members) ? registration.members.length : 0}
                </div>
                {Array.isArray(registration.members) && registration.members.length > 0 ? (
                  <div className={styles.membersCards}>
                    {registration.members.map((member, index) => {
                      const memberName = getMemberName(member);
                      const registerNumber = getMemberRegisterNumber(member);
                      const memberEmail = member.email ?? "";
                      const isLeader =
                        memberEmail.toLowerCase() ===
                        (registration.leaderEmail ?? "").toLowerCase();

                      return (
                        <div className={styles.memberCard} key={`mobile-${registration.id}-${index}`}>
                          <div className={styles.memberAvatar}>{getMemberInitials(memberName)}</div>
                          <div className={styles.memberMeta}>
                            <div className={styles.memberName}>{memberName}</div>
                            <div className={`${styles.memberRegister} font-mono`}>
                              {registerNumber}
                            </div>
                          </div>
                          {isLeader ? <span className={styles.leaderBadge}>Leader</span> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.mobileMuted}>No member details found.</div>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {selectedProofUrl ? (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setSelectedProofUrl(null);
            setSelectedProofRegistrationId(null);
          }}
          role="presentation"
        >
          <div
            className={styles.modalContent}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderMeta}>
                <div className={styles.modalTeamName}>
                  {selectedProofRegistration?.teamName ?? "Team"}
                </div>
                <div className={styles.modalSubMeta}>
                  Leader: {selectedProofRegistration?.leaderEmail ?? "N/A"} ·{" "}
                  {selectedProofRegistration?.numberOfMembers ?? 0} members ·{" "}
                  {selectedProofRegistration?.trackChoice ?? "N/A"}
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => {
                  setSelectedProofUrl(null);
                  setSelectedProofRegistrationId(null);
                }}
                aria-label="Close proof modal"
              >
                Close
              </button>
            </div>

            <div className={styles.modalImageArea}>
              {/\.pdf(\?|#|$)/i.test(selectedProofUrl) ? (
                <iframe
                  src={selectedProofUrl}
                  title="Payment proof PDF"
                  className={styles.modalPdf}
                />
              ) : (
                <Image
                  src={selectedProofUrl}
                  alt="Payment proof"
                  className={styles.modalImage}
                  width={520}
                  height={400}
                  unoptimized
                />
              )}
              <span className={styles.zoomHint}>Click to zoom</span>
            </div>

            <div className={styles.modalFooter}>
              <div>
                {selectedProofRegistration ? (
                  <span
                    className={`${styles.statusBadge} ${
                      getRegistrationStatus(selectedProofRegistration) === "approved"
                        ? styles.statusApproved
                        : getRegistrationStatus(selectedProofRegistration) === "hold"
                          ? styles.statusHold
                          : styles.statusPending
                    }`}
                  >
                    {formatStatusLabel(getRegistrationStatus(selectedProofRegistration))}
                  </span>
                ) : null}
              </div>
              <div className={styles.modalFooterActions}>
                <button
                  type="button"
                  onClick={() =>
                    selectedProofRegistration &&
                    promptStatusUpdate(
                      selectedProofRegistration.id,
                      selectedProofRegistration.teamName,
                      "hold"
                    )
                  }
                  disabled={
                    !selectedProofRegistration ||
                    READ_ONLY_MODE ||
                    updatingId === selectedProofRegistration?.id
                  }
                  className={styles.modalHoldButton}
                >
                  Mark Hold
                </button>
                <button
                  type="button"
                  onClick={() =>
                    selectedProofRegistration &&
                    promptStatusUpdate(
                      selectedProofRegistration.id,
                      selectedProofRegistration.teamName,
                      "approved"
                    )
                  }
                  disabled={
                    !selectedProofRegistration ||
                    READ_ONLY_MODE ||
                    updatingId === selectedProofRegistration?.id
                  }
                  className={styles.modalApproveButton}
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {pendingAction ? (
        <div
          className={styles.confirmOverlay}
          role="presentation"
          onClick={() => setPendingAction(null)}
        >
          <div
            className={styles.confirmDialog}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`${styles.confirmIconBox} ${
                pendingAction.status === "approved"
                  ? styles.confirmIconApprove
                  : styles.confirmIconHold
              }`}
            >
              {pendingAction.status === "approved" ? "A" : "H"}
            </div>
            <p className={styles.confirmTitle}>
              {pendingAction.status === "approved"
                ? `Approve "${pendingAction.teamName}"?`
                : `Hold "${pendingAction.teamName}"?`}
            </p>
            <p className={styles.confirmDescription}>
              {pendingAction.status === "approved"
                ? "This will mark the team as approved and update their status. You can change this later."
                : "This will flag the team for review. Their payment may need re-verification."}
            </p>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className={styles.confirmCancelButton}
                disabled={updatingId === pendingAction.id}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusUpdate}
                className={`${styles.confirmYesButton} ${
                  pendingAction.status === "approved"
                    ? styles.confirmYesApprove
                    : styles.confirmYesHold
                }`}
                disabled={updatingId === pendingAction.id}
              >
                {pendingAction.status === "approved"
                  ? "Yes, approve"
                  : "Yes, mark hold"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
