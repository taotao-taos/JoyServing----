import * as React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Info, Loader2, CheckCircle2 } from 'lucide-react';

const Logo = ({ className }: { className?: string }) => (
  <img 
    src="https://raw.githubusercontent.com/taotao-taos/-/main/Frame%2028%20(1).png" 
    alt="Creagic AI" 
    className={`object-contain ${className || ""}`}
    referrerPolicy="no-referrer"
  />
);

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [view, setView] = useState<"login" | "activation" | "request_access" | "register">("login");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Registration State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [isRegLoading, setIsRegLoading] = useState(false);

  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Activation State
  const [inviteCode, setInviteCode] = useState("");
  const [activationError, setActivationError] = useState("");
  const [isActivationLoading, setIsActivationLoading] = useState(false);

  // Request Access State
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqError, setReqError] = useState("");
  const [isReqLoading, setIsReqLoading] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Rate Limiting State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

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
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockoutEndTime]);

  const reportError = (setter: (msg: string) => void, msg: string) => {
    setFailedAttempts(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setLockoutEndTime(Date.now() + 60000);
        setter("错误次数过多，请1分钟后再试");
      } else {
        setter(msg);
      }
      return next;
    });
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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation
    if (email !== "admin@creagic.com" || password !== "123456") {
      reportError(setLoginError, "邮箱或密码错误，请重试 (测试账号: admin@creagic.com / 123456)");
      setIsLoginLoading(false);
      return;
    }
    
    setIsLoginLoading(false);
    setFailedAttempts(0);
    onLogin();
  };

  const handleActivation = async () => {
    if (lockoutEndTime) return;
    setActivationError("");
    if (!inviteCode || inviteCode.length < 6) {
      reportError(setActivationError, "请输入有效的邀请码");
      return;
    }
    setIsActivationLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation
    if (inviteCode !== "CREAGIC") {
      reportError(setActivationError, "邀请码无效或已被使用 (测试邀请码: CREAGIC)");
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
    if (!regName.trim()) {
      reportError(setRegError, "请输入您的姓名");
      return;
    }
    if (!regEmail || !regEmail.includes("@")) {
      reportError(setRegError, "请输入有效的邮箱地址");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      reportError(setRegError, "密码长度不能少于6位");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      reportError(setRegError, "两次输入的密码不一致");
      return;
    }
    setIsRegLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRegLoading(false);
    setFailedAttempts(0);
    onLogin();
  };

  const handleRequestAccess = async () => {
    if (lockoutEndTime) return;
    setReqError("");
    if (!reqName.trim()) {
      reportError(setReqError, "请输入您的姓名");
      return;
    }
    if (!reqEmail || !reqEmail.includes("@")) {
      reportError(setReqError, "请输入有效的工作邮箱");
      return;
    }
    setIsReqLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsReqLoading(false);
    setFailedAttempts(0);
    setReqSuccess(true);
  };

  const handleForgotPassword = async () => {
    if (lockoutEndTime) return;
    setForgotError("");
    if (!forgotEmail || !forgotEmail.includes("@")) {
      reportError(setForgotError, "请输入有效的注册邮箱");
      return;
    }
    setIsForgotLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsForgotLoading(false);
    setFailedAttempts(0);
    setForgotSuccess(true);
  };

  const resetModals = () => {
    setIsForgotPasswordOpen(false);
    setForgotEmail("");
    setForgotError("");
    setForgotSuccess(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 relative p-4">
      <AnimatePresence mode="wait">
        {view === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-[440px] flex flex-col rounded-[28px] border border-zinc-100 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="flex flex-col items-center mb-5">
              <Logo className="h-24 w-auto" />
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">登录您的账户</h1>
              <p className="text-sm text-zinc-500">输入您的邮箱和密码以访问 Creagic AI</p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Email Field */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-sm font-bold text-zinc-900">邮箱 <span className="text-red-500">*</span></Label>
                <Input 
                  id="email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入您的邮箱" 
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                />
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-bold text-zinc-900">密码 <span className="text-red-500">*</span></Label>
                  <button 
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    忘记密码？
                  </button>
                </div>
                <Input 
                  id="password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入您的密码" 
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2.5 mt-1">
                <Checkbox id="remember" className="rounded-[4px] border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900" />
                <Label htmlFor="remember" className="text-sm text-zinc-600 cursor-pointer font-medium select-none">记住邮箱</Label>
              </div>

              {loginError && (
                <p className="text-sm text-red-500 font-medium">{loginError}</p>
              )}

              {/* Login Button */}
              <Button
                onClick={handleLogin}
                disabled={isLoginLoading || !!lockoutEndTime}
                className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-bold mt-2 transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {lockoutEndTime ? `请等待 ${countdown} 秒` : isLoginLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "登录"}
              </Button>

              {/* Info Box */}
              <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 flex flex-col gap-1.5 transition-colors hover:bg-blue-50">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                  <Info className="h-4 w-4" />
                  首次登录？
                </div>
                <p className="text-sm text-blue-600/80 pl-6 leading-relaxed">
                  您需要先使用邀请码激活账户。<button onClick={() => setView("activation")} className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 transition-colors">返回首页输入邀请码。</button>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-zinc-400">
              登录即表示您同意我们的 <a href="#" className="font-medium text-zinc-500 hover:text-zinc-900 transition-colors">服务条款</a> 和 <a href="#" className="font-medium text-zinc-500 hover:text-zinc-900 transition-colors">隐私政策</a>。
            </div>
          </motion.div>
        )}

        {view === "activation" && (
          <motion.div
            key="activation"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-[440px] flex flex-col rounded-[28px] border border-zinc-100 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="flex flex-col items-center mb-5">
              <Logo className="h-24 w-auto" />
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">激活您的账户</h1>
              <p className="text-sm text-zinc-500 text-center leading-relaxed">
                欢迎来到 Creagic AI！我们目前处于内部测试阶段<br />
                请输入您的邀请码来开始使用
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Invitation Code Field */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inviteCode" className="text-sm font-bold text-zinc-900">邀请码 <span className="text-red-500">*</span></Label>
                <Input 
                  id="inviteCode"
                  type="text" 
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="请输入您的邀请码" 
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                />
              </div>

              {activationError && (
                <p className="text-sm text-red-500 font-medium">{activationError}</p>
              )}

              {/* Start Button */}
              <Button
                onClick={handleActivation}
                disabled={isActivationLoading || !!lockoutEndTime}
                className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-bold mt-2 transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {lockoutEndTime ? `请等待 ${countdown} 秒` : isActivationLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "开始使用"}
              </Button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-zinc-100"></div>
                <span className="flex-shrink-0 mx-4 text-zinc-400 text-xs font-medium uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-zinc-100"></div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <span className="text-sm text-zinc-500">没有邀请码？</span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setView("request_access");
                    setReqSuccess(false);
                  }}
                  className="w-full h-12 rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-[15px] font-bold transition-all active:scale-[0.98]"
                >
                  申请访问权限
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-zinc-500">
              已激活账户？ <button onClick={() => setView("login")} className="font-bold text-zinc-900 hover:text-zinc-700 transition-colors">立即登录</button>
            </div>
          </motion.div>
        )}

        {view === "request_access" && (
          <motion.div
            key="request_access"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-[440px] flex flex-col rounded-[28px] border border-zinc-100 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="flex flex-col items-center mb-5">
              <Logo className="h-24 w-auto" />
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">申请访问权限</h1>
              <p className="text-sm text-zinc-500 text-center leading-relaxed">
                {reqSuccess ? "申请已提交成功！" : "请填写以下信息\n我们将尽快审核您的申请并发送邀请码"}
              </p>
            </div>

            {reqSuccess ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-center text-zinc-600 text-sm">
                  我们已经收到了您的申请。如果通过审核，邀请码将会发送至您的邮箱 <strong>{reqEmail}</strong>。
                </p>
                <Button
                  onClick={() => setView("activation")}
                  className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-bold mt-4 transition-all active:scale-[0.98]"
                >
                  返回
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="req-name" className="text-sm font-bold text-zinc-900">姓名 <span className="text-red-500">*</span></Label>
                  <Input 
                    id="req-name"
                    type="text" 
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    placeholder="请输入您的姓名" 
                    className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="req-email" className="text-sm font-bold text-zinc-900">邮箱 <span className="text-red-500">*</span></Label>
                  <Input 
                    id="req-email"
                    type="email" 
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder="请输入您的工作邮箱" 
                    className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="req-reason" className="text-sm font-bold text-zinc-900">申请理由</Label>
                  <Input 
                    id="req-reason"
                    type="text" 
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="请简述您的使用场景" 
                    className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                  />
                </div>

                {reqError && (
                  <p className="text-sm text-red-500 font-medium">{reqError}</p>
                )}

                <Button
                  onClick={handleRequestAccess}
                  disabled={isReqLoading || !!lockoutEndTime}
                  className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-bold mt-2 transition-all active:scale-[0.98] disabled:opacity-70"
                >
                  {lockoutEndTime ? `请等待 ${countdown} 秒` : isReqLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "提交申请"}
                </Button>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-zinc-500">
              已有邀请码？ <button onClick={() => setView("activation")} className="font-bold text-zinc-900 hover:text-zinc-700 transition-colors">立即激活</button>
            </div>
          </motion.div>
        )}

        {view === "register" && (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-[440px] flex flex-col rounded-[28px] border border-zinc-100 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="flex flex-col items-center mb-5">
              <Logo className="h-24 w-auto" />
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">创建您的账户</h1>
              <p className="text-sm text-zinc-500 text-center leading-relaxed">
                邀请码验证成功！<br />请完善以下信息以完成注册
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-name" className="text-sm font-bold text-zinc-900">姓名 <span className="text-red-500">*</span></Label>
                <Input 
                  id="reg-name"
                  type="text" 
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="请输入您的姓名" 
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-email" className="text-sm font-bold text-zinc-900">邮箱 <span className="text-red-500">*</span></Label>
                <Input 
                  id="reg-email"
                  type="email" 
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="请输入您的邮箱" 
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-password" className="text-sm font-bold text-zinc-900">密码 <span className="text-red-500">*</span></Label>
                <Input 
                  id="reg-password"
                  type="password" 
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="设置您的密码 (至少6位)" 
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-confirm" className="text-sm font-bold text-zinc-900">确认密码 <span className="text-red-500">*</span></Label>
                <Input 
                  id="reg-confirm"
                  type="password" 
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码" 
                  className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                />
              </div>

              {regError && (
                <p className="text-sm text-red-500 font-medium">{regError}</p>
              )}

              <Button
                onClick={handleRegister}
                disabled={isRegLoading || !!lockoutEndTime}
                className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-bold mt-2 transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {lockoutEndTime ? `请等待 ${countdown} 秒` : isRegLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "完成注册"}
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-zinc-500">
              已有账户？ <button onClick={() => setView("login")} className="font-bold text-zinc-900 hover:text-zinc-700 transition-colors">立即登录</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {isForgotPasswordOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={resetModals}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-white p-8 shadow-2xl"
            >
              {forgotSuccess ? (
                <div className="flex flex-col items-center gap-6 py-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900">邮件已发送</h2>
                  <p className="text-center text-zinc-600 text-sm">
                    重置密码的链接已发送至 <strong>{forgotEmail}</strong>，请查收您的收件箱。
                  </p>
                  <Button
                    onClick={resetModals}
                    className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-bold mt-4 transition-all active:scale-[0.98]"
                  >
                    完成
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 mb-2">忘记密码</h2>
                    <p className="text-sm text-zinc-500">输入注册邮箱，我们会发送重置链接</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Input 
                      type="email" 
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="请输入您的邮箱" 
                      className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 px-4 transition-all focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:bg-white"
                    />
                    {forgotError && (
                      <p className="text-sm text-red-500 font-medium">{forgotError}</p>
                    )}
                  </div>

                  <Button
                    onClick={handleForgotPassword}
                    disabled={isForgotLoading || !!lockoutEndTime}
                    className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-70"
                  >
                    {lockoutEndTime ? `请等待 ${countdown} 秒` : isForgotLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "发送重置链接"}
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
