export type AuthAction = "login" | "register" | "forgot" | "reset" | "logout";
export const authActions = new Set(["login","register","forgot","reset","logout"]);

export function validateAuthInput(action: AuthAction, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_request");
  const data = input as Record<string,unknown>;
  if (action === "logout") return {};
  const output: {email?:string; password?:string} = {};
  if (action !== "reset") {
    if (typeof data.email !== "string") throw new Error("invalid_email");
    const email = data.email.trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("invalid_email");
    output.email = email;
  }
  if (action !== "forgot") {
    if (typeof data.password !== "string" || !data.password || data.password.length > 128) throw new Error("invalid_password");
    if (["register","reset"].includes(action)) {
      if (data.password.length < 12) throw new Error("weak_password");
      if (data.password !== data.confirmPassword) throw new Error("password_mismatch");
    }
    output.password = data.password;
  }
  return output;
}

export function safeReturnPath(path: string | null) {
  return path === "/reset-password" ? path : "/tracker.html";
}
