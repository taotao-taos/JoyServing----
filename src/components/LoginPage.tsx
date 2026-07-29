import * as React from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2 } from '@/lib/icons';
import { CreagicLogo } from "@/src/components/CreagicLogo";
import { DotGrid } from "@/src/components/DotGrid";

/** 必填星号与文字同色（避免单独红色星号） */
function ReqLabel({ children }: { children: string }) {
  return (
    <span className="text-sm font-bold text-neutral-900">
      {children}
      <span className="font-bold text-neutral-900" aria-hidden="true">
        {" "}
        *
      </span>
    </span>
  );
}

type LoginView = "login" | "activation" | "request_access" | "register";

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [view, setView] = useState<LoginView>("login");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [isRegLoading, setIsRegLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [activationError, setActivationError] = useState("");
  const [isActivationLoading, setIsActivationLoading] = useState(false);

  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqError, setReqError] = useState("");
  const [isReqLoading, setIsReqLoading] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const remembered = localStorage.getItem("creagic_login_email") || "";
    if (remembered) {
      setEmail(remembered);
      setRememberEmail(true);
    }
  }, []);

  useEffect(() => {
    if (!lockoutEndTime) return;
    const updateCountdown = () => {
      const remaining = Math.ceil((lockoutEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutEndTime(null);
        setFailedAttempts(0);
        setCountdown(0);
      } else {
        setCountdown(remaining);
      }
    };
    updateCountdown();
    const id = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(id);
  }, [lockoutEndTime]);

  const reportError = (setter: (msg: string) => void, msg: string) => {
    setFailedAttempts((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setLockoutEndTime(Date.now() + 60_000);
        setter("错误次数过多，请1分钟后再试");
      } else {
        setter(msg);
      }
      return next;
    });
  };

  const afterAuthSuccess = () => {
    setFailedAttempts(0);
    if (rememberEmail && email.trim()) {
      localStorage.setItem("creagic_login_email", email.trim());
    } else {
      localStorage.removeItem("creagic_login_email");
    }
    onLogin();
  };

  const handleLogin = async () => {
    if (lockoutEndTime) return;
    setLoginError("");
    if (!email || !email.includes("@")) {
      reportError(setLoginError, "请输入有效的邮箱地址");
      return;
    }
    if (!password || password.length < 6) {
      reportError(setLoginError, "密码长度不能少于6位");
      return;
    }
    setIsLoginLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    if (email !== "admin@creagic.com" || password !== "123456") {
      reportError(
        setLoginError,
        "邮箱或密码错误（测试账号：admin@creagic.com / 123456）"
      );
      setIsLoginLoading(false);
      return;
    }
    setIsLoginLoading(false);
    afterAuthSuccess();
  };

  const handleActivation = async () => {
    if (lockoutEndTime) return;
    setActivationError("");
    if (!inviteCode || inviteCode.length < 6) {
      reportError(setActivationError, "请输入有效的邀请码");
      return;
    }
    setIsActivationLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    if (inviteCode !== "CREAGIC") {
      reportError(setActivationError, "邀请码无效（测试邀请码：CREAGIC）");
      setIsActivationLoading(false);
      return;
    }
    setIsActivationLoading(false);
    setFailedAttempts(0);
    setView("register");
  };

  const handleRegister = async () => {
    if (lockoutEndTime) return;
    setRegError("");
    if (!regName.trim()) return reportError(setRegError, "请输入您的姓名");
    if (!regEmail || !regEmail.includes("@")) {
      return reportError(setRegError, "请输入有效的邮箱地址");
    }
    if (!regPassword || regPassword.length < 6) {
      return reportError(setRegError, "密码长度不能少于6位");
    }
    if (regPassword !== regConfirmPassword) {
      return reportError(setRegError, "两次输入的密码不一致");
    }
    setIsRegLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setIsRegLoading(false);
    setEmail(regEmail);
    afterAuthSuccess();
  };

  const handleRequestAccess = async () => {
    if (lockoutEndTime) return;
    setReqError("");
    if (!reqName.trim()) return reportError(setReqError, "请输入您的姓名");
    if (!reqEmail || !reqEmail.includes("@")) {
      return reportError(setReqError, "请输入有效的工作邮箱");
    }
    setIsReqLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setIsReqLoading(false);
    setReqSuccess(true);
    setFailedAttempts(0);
  };

  const handleForgotPassword = async () => {
    if (lockoutEndTime) return;
    setForgotError("");
    if (!forgotEmail || !forgotEmail.includes("@")) {
      return reportError(setForgotError, "请输入有效的注册邮箱");
    }
    setIsForgotLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setIsForgotLoading(false);
    setForgotSuccess(true);
    setFailedAttempts(0);
  };

  const resetModals = () => {
    setIsForgotPasswordOpen(false);
    setForgotEmail("");
    setForgotError("");
    setForgotSuccess(false);
  };

  const inputCls =
    "h-11 w-full rounded-[13px] border border-neutral-200 bg-neutral-50/50 px-3.5 text-[13px] text-neutral-900 outline-none transition-all focus:border-neutral-300 focus:bg-white focus:ring-1 focus:ring-neutral-900";

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-100 p-4 font-sans text-neutral-900">
      <div className="pointer-events-none absolute inset-0 z-0">
        <DotGrid
          dotSize={5.5}
          gap={9}
          baseColor="#f4f4f5"
          activeColor="#71717a"
          proximity={78}
          speedTrigger={100}
          shockRadius={290}
          shockStrength={6}
          maxSpeed={5000}
          resistance={750}
          returnDuration={1.5}
          ambientDriftPx={7}
          ambientAccent
        />
      </div>

      <div className="absolute left-6 top-6 z-20">
        <div className="flex items-center rounded-full border border-neutral-200 bg-white/90 p-1 backdrop-blur-xl shadow-2xl shadow-neutral-200/40">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full overflow-hidden bg-white">
            <CreagicLogo />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-[360px] rounded-[24px] border border-neutral-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6"
            >
              <div className="mb-5 flex flex-col items-center">
                <h1 className="mb-2 text-[21px] font-bold tracking-tight">
                  登录您的账户
                </h1>
                <p className="text-sm text-neutral-500">
                  输入您的邮箱和密码以访问 Creagic AI
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="block">
                    <ReqLabel>邮箱</ReqLabel>
                  </label>
                  <input
                    type="email"
                    className={inputCls}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入您的邮箱"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block">
                      <ReqLabel>密码</ReqLabel>
                    </label>
                    <button
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-sm font-medium text-sky-600 hover:text-sky-700"
                    >
                      忘记密码？
                    </button>
                  </div>
                  <input
                    type="password"
                    className={inputCls}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入您的密码"
                  />
                </div>
                <label className="mt-1 flex cursor-pointer items-center gap-2.5 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  记住邮箱
                </label>

                {loginError && (
                  <p className="text-sm font-medium text-red-500">{loginError}</p>
                )}

                <button
                  onClick={handleLogin}
                  disabled={isLoginLoading || !!lockoutEndTime}
                  className="mt-2 h-11 w-full rounded-[13px] bg-neutral-900 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-70"
                >
                  {lockoutEndTime
                    ? `请等待 ${countdown} 秒`
                    : isLoginLoading
                    ? <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    : "登录"}
                </button>

                <p className="mt-0 mb-2 text-center text-xs leading-5 text-neutral-500">
                  您需要先使用邀请码激活账户。
                  <button
                    onClick={() => setView("activation")}
                    className="ml-1 font-medium text-sky-600 underline underline-offset-2"
                  >
                    返回首页输入邀请码
                  </button>
                </p>

              </div>
            </motion.div>
          )}

          {view === "activation" && (
            <motion.div
              key="activation"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-[360px] rounded-[24px] border border-neutral-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6"
            >
              <div className="mb-5 flex flex-col items-center">
                <h1 className="mb-2 text-lg font-bold tracking-tight">激活您的账户</h1>
                <p className="text-center text-sm leading-relaxed text-neutral-500">
                  欢迎来到 Creagic AI！请输入邀请码开始使用
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="block">
                    <ReqLabel>邀请码</ReqLabel>
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="请输入您的邀请码"
                  />
                </div>
                {activationError && (
                  <p className="text-sm font-medium text-red-500">{activationError}</p>
                )}
                <button
                  onClick={handleActivation}
                  disabled={isActivationLoading || !!lockoutEndTime}
                  className="mt-2 h-11 w-full rounded-[13px] bg-neutral-900 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-70"
                >
                  {lockoutEndTime
                    ? `请等待 ${countdown} 秒`
                    : isActivationLoading
                    ? <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    : "开始使用"}
                </button>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-neutral-100" />
                  <span className="mx-4 text-xs font-medium uppercase tracking-wider text-neutral-400">or</span>
                  <div className="flex-grow border-t border-neutral-100" />
                </div>
                <button
                  onClick={() => {
                    setReqSuccess(false);
                    setView("request_access");
                  }}
                  className="h-11 w-full rounded-[13px] border border-neutral-200 bg-white text-sm font-bold text-neutral-900 transition-all active:scale-[0.98]"
                >
                  申请访问权限
                </button>
                <p className="text-center text-sm text-neutral-500">
                  已激活账户？
                  <button
                    onClick={() => setView("login")}
                    className="ml-1 font-bold text-neutral-900"
                  >
                    立即登录
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {view === "request_access" && (
            <motion.div
              key="request_access"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-[360px] rounded-[24px] border border-neutral-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6"
            >
              <div className="mb-5 flex flex-col items-center">
                <h1 className="mb-2 text-lg font-bold tracking-tight text-neutral-900">
                  申请访问权限
                </h1>
              </div>
              {reqSuccess ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-center text-sm text-neutral-600">
                    申请已提交，审核通过后邀请码会发送到 <strong>{reqEmail}</strong>
                  </p>
                  <button
                    onClick={() => setView("activation")}
                    className="mt-3 h-11 w-full rounded-[13px] bg-neutral-900 text-sm font-bold text-white"
                  >
                    返回
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="block">
                      <ReqLabel>姓名</ReqLabel>
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="block">
                      <ReqLabel>邮箱</ReqLabel>
                    </label>
                    <input
                      type="email"
                      className={inputCls}
                      value={reqEmail}
                      onChange={(e) => setReqEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-neutral-900">申请理由</label>
                    <input
                      type="text"
                      className={inputCls}
                      value={reqReason}
                      onChange={(e) => setReqReason(e.target.value)}
                    />
                  </div>
                  {reqError && (
                    <p className="text-sm font-medium text-red-500">{reqError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleRequestAccess}
                    disabled={isReqLoading || !!lockoutEndTime}
                    className="mt-2 h-11 w-full rounded-[13px] bg-neutral-900 text-sm font-bold text-white disabled:opacity-70"
                  >
                    {lockoutEndTime
                      ? `请等待 ${countdown} 秒`
                      : isReqLoading
                      ? <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      : "提交申请"}
                  </button>
                  <p className="text-center text-sm text-neutral-500">
                    <button
                      type="button"
                      onClick={() => setView("login")}
                      className="font-semibold text-neutral-900 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-cyan-700"
                    >
                      我有账号
                    </button>
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {view === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-[360px] rounded-[24px] border border-neutral-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6"
            >
              <div className="mb-5 flex flex-col items-center">
                <h1 className="mb-2 text-lg font-bold tracking-tight">创建您的账户</h1>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="block">
                    <ReqLabel>姓名</ReqLabel>
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="block">
                    <ReqLabel>邮箱</ReqLabel>
                  </label>
                  <input
                    type="email"
                    className={inputCls}
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="block">
                    <ReqLabel>密码</ReqLabel>
                  </label>
                  <input
                    type="password"
                    className={inputCls}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="block">
                    <ReqLabel>确认密码</ReqLabel>
                  </label>
                  <input
                    type="password"
                    className={inputCls}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                  />
                </div>
                {regError && (
                  <p className="text-sm font-medium text-red-500">{regError}</p>
                )}
                <button
                  onClick={handleRegister}
                  disabled={isRegLoading || !!lockoutEndTime}
                  className="mt-2 h-11 w-full rounded-[13px] bg-neutral-900 text-sm font-bold text-white disabled:opacity-70"
                >
                  {lockoutEndTime
                    ? `请等待 ${countdown} 秒`
                    : isRegLoading
                    ? <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    : "完成注册"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isForgotPasswordOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={resetModals}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-white p-6 shadow-2xl"
            >
              {forgotSuccess ? (
                <div className="flex flex-col items-center gap-6 py-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-neutral-900">邮件已发送</h2>
                  <p className="text-center text-sm text-neutral-600">
                    重置密码链接已发送到 <strong>{forgotEmail}</strong>
                  </p>
                  <button
                    onClick={resetModals}
                    className="mt-2 h-11 w-full rounded-[13px] bg-neutral-900 text-sm font-bold text-white"
                  >
                    完成
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="mb-2 text-lg font-bold text-neutral-900">忘记密码</h2>
                    <p className="text-sm text-neutral-500">
                      输入注册邮箱，我们会发送重置链接
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="请输入您的邮箱"
                      className={inputCls}
                    />
                    {forgotError && (
                      <p className="text-sm font-medium text-red-500">
                        {forgotError}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleForgotPassword}
                    disabled={isForgotLoading || !!lockoutEndTime}
                    className="h-11 w-full rounded-[13px] bg-neutral-900 text-sm font-bold text-white disabled:opacity-70"
                  >
                    {lockoutEndTime
                      ? `请等待 ${countdown} 秒`
                      : isForgotLoading
                      ? <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      : "发送重置链接"}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
