import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles } from '@/lib/icons';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Billing = { price: string; period: string; description: string };

interface Plan {
  id: string;
  name: string;
  monthly: Billing;
  yearly: Billing;
  creditsPerMonth: number;
  approxImagesPerMonth: number;
  approxVideosPerMonth: number;
  features: string[];
}

const pricingPlans: Plan[] = [
  {
    id: "starter",
    name: "入门版",
    monthly: {
      price: "99",
      period: "/月",
      description: "次月按¥99/月自动续费，¥4.95/100积分",
    },
    yearly: {
      price: "843",
      period: "/年",
      description: "次年按¥843/年自动续费，¥3.51/100积分",
    },
    creditsPerMonth: 2000,
    approxImagesPerMonth: 200,
    approxVideosPerMonth: 80,
    features: [
      "每日赠送 30 积分 当日有效",
      "所有图片&编辑模型",
      "所有视频模型",
      "2 个并发任务",
      "可商用",
    ],
  },
  {
    id: "basic",
    name: "基础版",
    monthly: {
      price: "179",
      period: "/月",
      description: "次月按¥179/月自动续费，¥5.11/100积分",
    },
    yearly: {
      price: "1,525",
      period: "/年",
      description: "次年按¥1,525/年自动续费，¥3.63/100积分",
    },
    creditsPerMonth: 3500,
    approxImagesPerMonth: 350,
    approxVideosPerMonth: 140,
    features: [
      "每日赠送 30 积分 当日有效",
      "所有图片&编辑模型",
      "所有视频模型",
      "4 个并发任务",
      "可商用",
    ],
  },
  {
    id: "pro",
    name: "专业版",
    monthly: {
      price: "469",
      period: "/月",
      description: "次月按¥469/月自动续费，¥4.26/100积分",
    },
    yearly: {
      price: "3,996",
      period: "/年",
      description: "次年按¥3,996/年自动续费，¥3.02/100积分",
    },
    creditsPerMonth: 11000,
    approxImagesPerMonth: 1100,
    approxVideosPerMonth: 440,
    features: [
      "每日赠送 30 积分 当日有效",
      "所有图片&编辑模型",
      "所有视频模型",
      "8 个并发任务",
      "可商用",
    ],
  },
  {
    id: "flagship",
    name: "旗舰版",
    monthly: {
      price: "999",
      period: "/月",
      description: "次月按¥999/月自动续费，¥3.70/100积分",
    },
    yearly: {
      price: "8,511",
      period: "/年",
      description: "次年按¥8,511/年自动续费，¥2.63/100积分",
    },
    creditsPerMonth: 27000,
    approxImagesPerMonth: 2700,
    approxVideosPerMonth: 1080,
    features: [
      "每日赠送 30 积分 当日有效",
      "所有图片&编辑模型",
      "所有视频模型",
      "10 个并发任务",
      "可商用",
    ],
  },
];

function formatInt(n: number) {
  return n.toLocaleString("zh-CN");
}

type PayContext = {
  planId: string;
  planName: string;
  price: string;
  period: string;
  billingCycle: "monthly" | "yearly";
};

function buildCheckoutUrl(ctx: PayContext) {
  const base =
    typeof window !== "undefined" ? window.location.origin : "https://lovart.app";
  return `${base}/checkout?plan=${encodeURIComponent(ctx.planId)}&cycle=${ctx.billingCycle}`;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [payContext, setPayContext] = useState<PayContext | null>(null);

  useEffect(() => {
    if (!isOpen) setPayContext(null);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 z-[201] max-h-[min(92vh,880px)] w-[min(92vw,960px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[13px] bg-white p-5 shadow-2xl md:p-7"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 transition-all hover:bg-neutral-200 hover:text-neutral-900 md:right-5 md:top-5"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center pr-2">
              <h2 className="text-center text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl">
                升级会员，获取更多积分
              </h2>

              <div className="mt-5 flex items-center rounded-[13px] bg-neutral-100 p-0.5 md:mt-6">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-xs font-bold transition-all md:px-5 md:text-sm",
                    billingCycle === "monthly" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
                  )}
                >
                  月付
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all md:px-5 md:text-sm",
                    billingCycle === "yearly" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
                  )}
                >
                  <span>年付</span>
                  <span className="text-[10px] font-bold text-sky-500 md:text-xs">最低71折</span>
                </button>
              </div>

              <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-2.5">
                {pricingPlans.map((plan) => {
                  const billing = billingCycle === "yearly" ? plan.yearly : plan.monthly;
                  const creditsYear = plan.creditsPerMonth * 12;
                  const imgsYear = plan.approxImagesPerMonth * 12;
                  const vidsYear = plan.approxVideosPerMonth * 12;
                  const highlight =
                    billingCycle === "yearly"
                      ? `每年 ${formatInt(creditsYear)} 积分，用于快速生成`
                      : `每月 ${formatInt(plan.creditsPerMonth)} 积分，用于快速生成`;
                  const subHighlight =
                    billingCycle === "yearly"
                      ? `约生成 ${formatInt(imgsYear)} 张图片或 ${formatInt(vidsYear)} 个视频`
                      : `约生成 ${formatInt(plan.approxImagesPerMonth)} 张图片或 ${formatInt(plan.approxVideosPerMonth)} 个视频`;

                  return (
                    <div
                      key={plan.id}
                      className="relative flex flex-col rounded-[13px] border border-neutral-100 bg-neutral-50/50 p-4 transition-all hover:bg-white hover:shadow-lg"
                    >
                      <div className="mb-3">
                        <h3 className="text-lg font-bold text-neutral-900">{plan.name}</h3>
                        <div className="mt-1 flex items-baseline gap-0.5">
                          <span className="text-2xl font-bold text-neutral-900">¥{billing.price}</span>
                          <span className="text-xs font-medium text-neutral-400">{billing.period}</span>
                        </div>
                        <p className="mt-1.5 text-[9px] leading-snug text-neutral-400 md:text-[10px]">{billing.description}</p>
                      </div>

                      <Button
                        type="button"
                        className="h-9 w-full rounded-lg bg-neutral-900 text-xs font-bold text-white transition-all hover:bg-neutral-800 active:scale-[0.98] md:h-10 md:text-sm"
                        onClick={() =>
                          setPayContext({
                            planId: plan.id,
                            planName: plan.name,
                            price: billing.price,
                            period: billing.period,
                            billingCycle,
                          })
                        }
                      >
                        立即购买
                      </Button>
                      <p className="mt-1.5 text-center text-[9px] text-neutral-400">可随时取消</p>

                      <div className="my-4 h-px w-full bg-neutral-100" />

                      <div className="mb-4 rounded-lg bg-neutral-50 p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-900 md:text-xs">
                          <Sparkles className="h-3 w-3 shrink-0 fill-neutral-900" />
                          <span className="leading-tight">{highlight}</span>
                        </div>
                        <p className="mt-1 pl-4 text-[9px] text-neutral-400 md:text-[10px]">{subHighlight}</p>
                      </div>

                      <ul className="flex flex-col gap-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-neutral-900" />
                            <span className="text-[10px] font-medium leading-tight text-neutral-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex w-full flex-col gap-1.5 md:mt-8">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:text-neutral-900 md:text-xs"
                >
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-neutral-300 text-[9px]">?</div>
                  <span>常见问题</span>
                </button>
                <div className="flex items-start gap-1.5 text-[9px] text-neutral-400 md:text-[10px]">
                  <Sparkles className="mt-0.5 h-2.5 w-2.5 shrink-0 fill-neutral-400" />
                  <span>免费用户每天刷新 30 积分，会员积分有效期31天，按月重置</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 扫码购买（布局对齐 Figma node 2221-3129） */}
          <AnimatePresence>
            {payContext && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setPayContext(null)}
                  className="fixed inset-0 z-[202] bg-black/45 backdrop-blur-[3px]"
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pay-qr-title"
                  initial={{ opacity: 0, scale: 0.96, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 16 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  onClick={(e) => e.stopPropagation()}
                  className="fixed left-1/2 top-1/2 z-[203] w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[20px] border border-neutral-100 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.14)]"
                >
                  <button
                    type="button"
                    onClick={() => setPayContext(null)}
                    className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                    aria-label="关闭"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="px-6 pb-2 pt-7 text-center">
                    <p
                      id="pay-qr-title"
                      className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400"
                    >
                      扫码购买
                    </p>
                    <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight text-neutral-900">
                      {payContext.planName}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-neutral-500">
                      <span className="tabular-nums">¥{payContext.price}</span>
                      {payContext.period}
                      <span className="mx-2 text-neutral-200">·</span>
                      {payContext.billingCycle === "yearly" ? "年付" : "月付"}
                    </p>
                  </div>
                  <div className="mx-6 mt-2 flex justify-center rounded-[13px] bg-neutral-50 p-4 ring-1 ring-inset ring-neutral-100/80">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=184x184&data=${encodeURIComponent(buildCheckoutUrl(payContext))}`}
                      alt="支付二维码"
                      width={184}
                      height={184}
                      className="h-[184px] w-[184px] rounded-lg bg-white"
                      decoding="async"
                    />
                  </div>
                  <p className="mx-6 mt-4 text-center text-[12px] leading-relaxed text-neutral-400">
                    请使用微信或支付宝扫码完成支付
                    <br />
                    支付成功后会员将自动开通
                  </p>
                  <div className="mt-6 border-t border-neutral-100 bg-neutral-50/40 px-6 py-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-[13px] border-neutral-200 bg-white text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50"
                      onClick={() => setPayContext(null)}
                    >
                      返回
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
