"use client";
import { useEffect, useState, type FormEvent } from "react";

export type AuthMode = "login" | "register" | "forgot" | "reset";
const copy = {
  login:["Welcome back.","欢迎回来。"], register:["Make room for your next opportunity.","开启你的下一个机会。"],
  forgot:["Let's get you back in.","找回你的账号。"], reset:["Choose a new password.","设置新密码。"],
  intro:["Your applications. Your next steps. All in one place.","申请进度、截止日期和下一步任务，都在这里。"],
  email:["Email address","邮箱地址"], password:["Password","密码"], confirm:["Confirm password","确认密码"],
  loginButton:["Sign in","登录"], registerButton:["Create account","注册账号"], forgotButton:["Send reset link","发送重置链接"], resetButton:["Update password","更新密码"],
  passwordHint:["Use at least 12 characters. Never reuse a password from another account.","至少 12 个字符，请勿重复使用其他账号的密码。"],
  forgotLink:["Forgot your password?","忘记密码？"], newHere:["New here?","还没有账号？"], registerLink:["Create an account","注册账号"],
  existing:["Already have an account?","已有账号？"], back:["Back to sign in","返回登录"],
  pending:["Please wait…","请稍候…"], privacy:["Your records are private to your account.","你的申请记录仅你的账号可访问。"],
  check_email:["Check your inbox for an email confirmation link. If this address is already registered, sign in or reset your password.","请检查邮箱中的验证链接。如果此邮箱已注册，请直接登录或重置密码。"],
  reset_sent:["If an account exists for this address, a password reset link will arrive in your inbox.","如果此邮箱对应已有账号，你会收到密码重置链接。"],
  updated:["Your password has been updated. Sign in with your new password.","密码已更新，请使用新密码登录。"],
  invalid_link:["This link has expired or is invalid. Request a new email and try again.","链接已失效或无效，请重新申请邮件后再试。"],
  invalid_email:["Enter a valid email address.","请输入有效的邮箱地址。"], invalid_password:["Enter a password of no more than 128 characters.","请输入不超过 128 个字符的密码。"],
  weak_password:["Use a password with at least 12 characters.","密码至少需要 12 个字符。"], password_mismatch:["The passwords do not match.","两次输入的密码不一致。"],
  invalid_credentials:["The email or password is incorrect.","邮箱或密码不正确。"], email_not_confirmed:["Confirm your email address before signing in. Check your inbox for the verification link.","请先验证邮箱，检查收件箱中的验证链接。"],
  rate_limited:["Too many attempts. Please wait before trying again.","尝试次数过多，请稍后再试。"],
  email_unavailable:["Verification email is not yet available for this address. Please contact the site owner.","此邮箱暂时无法接收注册验证邮件，请联系网站所有者。"],
  signup_failed:["We could not create the account. Try again later or contact the site owner.","暂时无法创建账号，请稍后重试或联系网站所有者。"],
  request_failed:["We could not complete your request. Please try again.","请求未完成，请稍后重试。"], reset_failed:["The password could not be updated. Try a different password or request a new reset link.","密码更新失败，请尝试其他密码或重新获取重置链接。"],
  session_expired:["Your session has expired. Request another password reset link.","会话已过期，请重新获取密码重置链接。"],
  invalid_request:["Please check the form and try again.","请检查表单后重试。"],
  not_configured:["Account sign-in is not enabled yet. Please try again once setup is complete.","账号登录尚未启用，请在配置完成后再试。"],
  resetHint:["Open the link from your password reset email before choosing a new password.","请先打开密码重置邮件中的链接，再设置新密码。"],
};
type Key = keyof typeof copy;

export default function AuthScreen({mode,configured}: {mode:AuthMode;configured:boolean}) {
  const [language,setLanguage] = useState("en");
  const [pending,setPending] = useState(false);
  const [message,setMessage] = useState<Key|null>(null);
  const [error,setError] = useState<Key|null>(null);
  const text = (key:Key) => copy[key][language === "zh" ? 1:0];
  useEffect(() => {
    try { if (localStorage.getItem("tracker-language") === "zh") setLanguage("zh"); } catch { /* Optional preference. */ }
    const params = new URLSearchParams(window.location.search);
    if (params.get("updated") === "1") setMessage("updated");
    if (params.get("error") === "invalid_link") setError("invalid_link");
  },[]);
  useEffect(() => { document.documentElement.lang = language === "zh" ? "zh-CN":"en"; },[language]);
  const button = `${mode}Button` as Key;
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !configured) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (["register","reset"].includes(mode) && values.password !== values.confirmPassword) { setError("password_mismatch"); return; }
    setPending(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const result = await response.json() as {error_code?:string;redirect?:string;message_code?:string};
      if (!response.ok) { setError(result.error_code && result.error_code in copy ? result.error_code as Key : "request_failed"); return; }
      if (result.redirect === "/tracker.html" || result.redirect === "/login?updated=1") { window.location.assign(result.redirect); return; }
      setMessage(result.message_code && result.message_code in copy ? result.message_code as Key : "request_failed");
      // Never retain a password in a successfully submitted form.
      form.reset();
    } catch { setError("request_failed"); }
    finally { setPending(false); }
  }
  return <main className="auth-page">
    <aside className="auth-story"><a href="/" className="auth-brand"><span>it.</span>Internship Tracker</a><div><p className="auth-eyebrow">YOUR NEXT CHAPTER</p><h1>{language === "zh" ? "每一步，都值得记录。":"A little clarity. A lot of possibility."}</h1><p>{text("intro")}</p></div><p className="auth-story-footer">{text("privacy")}</p></aside>
    <section className="auth-content">
      <label className="auth-language"><span className="auth-sr-only">Language / 语言</span><select value={language} onChange={event => {setLanguage(event.target.value);try { localStorage.setItem("tracker-language",event.target.value); } catch { /* Optional preference. */ }}}><option value="en">English</option><option value="zh">简体中文</option></select></label>
      <div className="auth-card"><p className="auth-eyebrow">INTERNSHIP TRACKER</p><h2>{text(mode)}</h2><p className="auth-subtitle">{text(mode === "reset" ? "resetHint":"intro")}</p>
        {!configured && <p className="auth-notice" role="status">{text("not_configured")}</p>}
        {message && <p className="auth-success" role="status">{text(message)}</p>}
        {error && <p className="auth-error" role="alert">{text(error)}</p>}
        <form onSubmit={submit}>
          {mode !== "reset" && <label>{text("email")}<input type="email" name="email" autoComplete="email" required maxLength={254} disabled={pending} placeholder="you@example.com"/></label>}
          {mode !== "forgot" && <label>{text("password")}<input type="password" name="password" autoComplete={mode === "login" ? "current-password":"new-password"} required minLength={mode === "login" ? 1:12} maxLength={128} disabled={pending} aria-describedby={mode !== "login" ? "password-hint":undefined}/></label>}
          {["register","reset"].includes(mode) && <><p id="password-hint" className="auth-hint">{text("passwordHint")}</p><label>{text("confirm")}<input type="password" name="confirmPassword" autoComplete="new-password" required minLength={12} maxLength={128} disabled={pending}/></label></>}
          {mode === "login" && <a className="auth-forgot" href="/forgot-password">{text("forgotLink")}</a>}
          <button type="submit" disabled={pending || !configured}>{text(pending ? "pending":button)}</button>
        </form>
        <p className="auth-switch">{mode === "login" ? <>{text("newHere")} <a href="/register">{text("registerLink")}</a></>:mode === "register" ? <>{text("existing")} <a href="/login">{text("loginButton")}</a></>:<a href="/login">{text("back")}</a>}</p>
      </div>
    </section>
  </main>;
}
