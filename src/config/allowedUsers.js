

export const ALLOWED_EMAILS = [
    "drxrecover@gmail.com"

];

export const ALLOWED_DOMAINS = [

];


export const isUserAllowed = (email) => {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (ALLOWED_EMAILS.some((allowedEmail) => normalizedEmail === allowedEmail.toLowerCase())) {
    return true;
  }

  if (ALLOWED_DOMAINS.some((domain) => normalizedEmail.endsWith(domain.toLowerCase()))) {
    return true;
  }

  return false;
};
