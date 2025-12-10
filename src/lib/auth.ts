import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export interface SessionData {
  isLoggedIn: boolean;
  loginTime?: number;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "personal-travel-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function verifyPassword(inputPassword: string): Promise<boolean> {
  const storedPassword = process.env.AUTH_PASSWORD;

  if (!storedPassword) {
    console.error("AUTH_PASSWORD not set in environment variables");
    return false;
  }

  // For simple password auth, we do direct comparison
  // In production, you might want to hash the stored password
  return inputPassword === storedPassword;
}

export async function login(password: string): Promise<{ success: boolean; error?: string }> {
  const isValid = await verifyPassword(password);

  if (!isValid) {
    return { success: false, error: "Invalid password" };
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.loginTime = Date.now();
  await session.save();

  return { success: true };
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn === true;
}
