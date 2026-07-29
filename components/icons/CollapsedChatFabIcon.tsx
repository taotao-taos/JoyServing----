import { useId } from "react";

/**
 * 收起侧栏时右下角 FAB 图标（Figma LORa草图 node 2221-3157）。
 */
export function CollapsedChatFabIcon({
  className,
}: {
  className?: string;
}) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, "_");
  const I = {
    clip0: `ccf_c0_${u}`,
    clip1: `ccf_c1_${u}`,
    f0: `ccf_f0_${u}`,
    f1: `ccf_f1_${u}`,
    f2: `ccf_f2_${u}`,
    f3: `ccf_f3_${u}`,
    f4: `ccf_f4_${u}`,
    f5: `ccf_f5_${u}`,
    f6: `ccf_f6_${u}`,
    f7: `ccf_f7_${u}`,
    f8: `ccf_f8_${u}`,
    f9: `ccf_f9_${u}`,
    paint0: `ccf_p0_${u}`,
  };

  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g clipPath={`url(#${I.clip0})`}>
        <g filter={`url(#${I.f0})`}>
          <g clipPath={`url(#${I.clip1})`}>
            <rect width="40" height="40" fill={`url(#${I.paint0})`} />
            <g filter={`url(#${I.f1})`}>
              <rect
                width="40"
                height="40"
                transform="translate(52.5195 3.48065)"
                fill="#FFDEBF"
                fillOpacity="0.59"
              />
            </g>
            <g filter={`url(#${I.f2})`}>
              <path
                d="M4 24C4 12.9543 12.9543 4 24 4V4C35.0457 4 44 12.9543 44 24V24C44 35.0457 35.0457 44 24 44V44C12.9543 44 4 35.0457 4 24V24Z"
                fill="#FFDEBF"
                fillOpacity="0.59"
              />
            </g>
            <g filter={`url(#${I.f3})`}>
              <path
                d="M20 8C20 -3.04569 28.9543 -12 40 -12V-12C51.0457 -12 60 -3.04569 60 8V8C60 19.0457 51.0457 28 40 28V28C28.9543 28 20 19.0457 20 8V8Z"
                fill="#1AABFF"
                fillOpacity="0.7"
              />
            </g>
            <g filter={`url(#${I.f4})`}>
              <rect
                width="40"
                height="40"
                transform="translate(28.5195 -4)"
                fill="#FFDEBF"
                fillOpacity="0.59"
              />
            </g>
            <g filter={`url(#${I.f5})`}>
              <path
                d="M8 48C8 36.9543 16.9543 28 28 28V28C39.0457 28 48 36.9543 48 48V48C48 59.0457 39.0457 68 28 68V68C16.9543 68 8 59.0457 8 48V48Z"
                fill="#19FEFB"
              />
            </g>
            <g filter={`url(#${I.f6})`}>
              <path
                d="M52.3643 31.8452C52.3643 20.7995 61.3186 11.8452 72.3643 11.8452V11.8452C83.41 11.8452 92.3643 20.7995 92.3643 31.8452V31.8452C92.3643 42.8908 83.41 51.8452 72.3643 51.8452V51.8452C61.3186 51.8452 52.3643 42.8908 52.3643 31.8452V31.8452Z"
                fill="#FFA1B0"
                fillOpacity="0.733"
              />
            </g>
            <g filter={`url(#${I.f7})`}>
              <path
                d="M21.3486 20.1548C21.3486 9.10915 30.3029 0.154846 41.3486 0.154846V0.154846C52.3943 0.154846 61.3486 9.10915 61.3486 20.1548V20.1548C61.3486 31.2005 52.3943 40.1548 41.3486 40.1548V40.1548C30.3029 40.1548 21.3486 31.2005 21.3486 20.1548V20.1548Z"
                fill="#FDE432"
              />
            </g>
            <g filter={`url(#${I.f8})`}>
              <path
                d="M-7.84521 11.1161C-7.84521 0.0703942 1.10909 -8.88391 12.1548 -8.88391V-8.88391C23.2005 -8.88391 32.1548 0.0703942 32.1548 11.1161V11.1161C32.1548 22.1618 23.2005 31.1161 12.1548 31.1161V31.1161C1.10909 31.1161 -7.84521 22.1618 -7.84521 11.1161V11.1161Z"
                fill="#00DDFF"
              />
            </g>
            <g filter={`url(#${I.f9})`}>
              <path
                d="M0 -12.7291C0 -23.7748 8.95431 -32.7291 20 -32.7291V-32.7291C31.0457 -32.7291 40 -23.7748 40 -12.7291V-12.7291C40 -1.68337 31.0457 7.27094 20 7.27094V7.27094C8.95431 7.27094 0 -1.68337 0 -12.7291V-12.7291Z"
                fill="#2254F4"
              />
            </g>
          </g>
        </g>
        <path
          d="M19.6063 8.9956C19.684 8.37134 20.3164 8.37134 20.3941 8.9956L20.527 10.0624C21.1113 14.7533 23.7038 18.4259 27.015 19.2537L27.768 19.442C28.2087 19.5521 28.2087 20.448 27.768 20.558L27.015 20.7463C23.7038 21.5741 21.1113 25.2468 20.527 29.9376L20.3941 31.0044C20.3164 31.6287 19.684 31.6287 19.6063 31.0044L19.4734 29.9376C18.8891 25.2468 16.2966 21.5741 12.9854 20.7463L12.2323 20.558C11.7917 20.448 11.7917 19.5521 12.2323 19.442L12.9854 19.2537C16.2966 18.4259 18.8891 14.7533 19.4734 10.0624L19.6063 8.9956Z"
          fill="white"
        />
      </g>
      <defs>
        <filter
          id={I.f0}
          x="-14"
          y="-14"
          width="68"
          height="68"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="7" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.101961 0 0 0 0 0.745098 0 0 0 0 0.976471 0 0 0 0.855 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_2221_3157"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_2221_3157"
            result="shape"
          />
        </filter>
        <filter
          id={I.f1}
          x="24.5195"
          y="-24.5193"
          width="96"
          height="96"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="14" result="effect1_foregroundBlur_2221_3157" />
        </filter>
        <filter
          id={I.f2}
          x="-20"
          y="-20"
          width="88"
          height="88"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="12" result="effect1_foregroundBlur_2221_3157" />
        </filter>
        <filter
          id={I.f3}
          x="4"
          y="-28"
          width="72"
          height="72"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="8" result="effect1_foregroundBlur_2221_3157" />
        </filter>
        <filter
          id={I.f4}
          x="4.51953"
          y="-28"
          width="88"
          height="88"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="12" result="effect1_foregroundBlur_2221_3157" />
        </filter>
        <filter
          id={I.f5}
          x="-16"
          y="4"
          width="88"
          height="88"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="12" result="effect1_foregroundBlur_2221_3157" />
        </filter>
        <filter
          id={I.f6}
          x="20.3643"
          y="-20.1548"
          width="104"
          height="104"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="16" result="effect1_foregroundBlur_2221_3157" />
        </filter>
        <filter
          id={I.f7}
          x="-10.6514"
          y="-31.8452"
          width="104"
          height="104"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="16" result="effect1_foregroundBlur_2221_3157" />
        </filter>
        <filter
          id={I.f8}
          x="-35.8452"
          y="-36.8839"
          width="96"
          height="96"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="14" result="effect1_foregroundBlur_2221_3157" />
        </filter>
        <filter
          id={I.f9}
          x="-16"
          y="-48.7291"
          width="72"
          height="72"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="8" result="effect1_foregroundBlur_2221_3157" />
        </filter>
        <radialGradient
          id={I.paint0}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(20 20) rotate(-90) scale(28.2843)"
        >
          <stop stopColor="#52B2FC" />
          <stop offset="0.8" stopColor="#E2F5FF" />
        </radialGradient>
        <clipPath id={I.clip0}>
          <path
            d="M0 20C0 8.95431 8.95431 0 20 0V0C31.0457 0 40 8.95431 40 20V20C40 31.0457 31.0457 40 20 40V40C8.95431 40 0 31.0457 0 20V20Z"
            fill="white"
          />
        </clipPath>
        <clipPath id={I.clip1}>
          <rect width="40" height="40" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
