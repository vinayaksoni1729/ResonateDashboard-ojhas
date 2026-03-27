import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { isUserAllowed } from "../config/allowedUsers";

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  if (!isUserAllowed(user.email)) {
    await signOut(auth);
    throw new Error("UNAUTHORIZED_USER");
  }

  return user;
};

export const signOutUser = async () => {
  await signOut(auth);
};

export const getCurrentUser = () => auth.currentUser;

export const listenToAuthState = (callback) =>
  onAuthStateChanged(auth, callback);
