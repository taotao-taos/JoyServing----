import * as React from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  MultiplicationSignCircleIcon,
} from '@hugeicons/core-free-icons';
import { MatrixLoader } from '@/src/components/common/MatrixLoader';

const Toaster = ({
  closeButton = false,
  position = 'top-center',
  ...props
}: ToasterProps) => {
  const { theme = 'light' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      closeButton={closeButton}
      position={position}
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3.5 shrink-0" />
        ),
        info: (
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-3.5 shrink-0" />
        ),
        warning: (
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3.5 shrink-0" />
        ),
        error: (
          <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-3.5 shrink-0" />
        ),
        loading: (
          <MatrixLoader size={14} className="size-3.5 shrink-0" />
        ),
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          '--width': 'auto',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
          title: 'cn-toast-title',
        },
      }}
      {...props}
    />
  );
};

/** 挂载到 document.body，避免侧栏/分栏布局影响 fixed 居中 */
function AppToaster(props: ToasterProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(<Toaster {...props} />, document.body);
}

export { Toaster, AppToaster };
