/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 数字员工母版能力变更升级提示
 */

import React, { useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { PANEL, BTN_INK, BTN_SOFT } from '@/lib/ui';
import {
  MASTER_TEMPLATE_TERMS,
  SYNC_EMPLOYEE_UPGRADE_COPY,
  masterTemplateUpgradeNotice,
} from '@/lib/platformTerminology';
import { cn } from '@/lib/utils';
import { parseReleaseNoteItems, type PendingTemplateUpgrade } from '@/lib/masterTemplateUpgrade';
import { Modal } from '../common/Modal';

export interface MasterTemplateUpgradeBannerProps {
  upgrade: PendingTemplateUpgrade;
  onSync: () => void;
  onDismiss: () => void;
  className?: string;
}

export const MasterTemplateUpgradeBanner: React.FC<MasterTemplateUpgradeBannerProps> = ({
  upgrade,
  onSync,
  onDismiss,
  className,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const noteItems = useMemo(() => parseReleaseNoteItems(upgrade.releaseNotes), [upgrade.releaseNotes]);
  const noticeTitle = masterTemplateUpgradeNotice(upgrade.version);

  return (
    <section
      className={cn(PANEL, 'overflow-hidden ring-foreground/10', className)}
      aria-label={noticeTitle}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left cursor-pointer transition-colors',
          'bg-amber-50/70 border-b border-transparent',
          expanded && 'border-amber-100/80',
          !expanded && 'hover:bg-amber-50',
        )}
        aria-expanded={expanded}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertCircle size={14} />
        </span>
        <span className="flex-1 min-w-0 text-sm font-semibold text-neutral-800 leading-snug">
          {noticeTitle}
        </span>
        {expanded ? (
          <ChevronUp size={14} className="text-neutral-500 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-neutral-500 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3.5 py-3 space-y-3 bg-white">
          <div className="rounded-md bg-neutral-100/30 border border-neutral-200/60 px-3 py-2.5">
            <p className="text-sm font-bold text-amber-700">{MASTER_TEMPLATE_TERMS.releaseNotes}</p>
            <ul className="mt-2 space-y-1.5">
              {noteItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-neutral-800/90 leading-relaxed"
                >
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-amber-500/90" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-7 px-2.5 text-neutral-500"
            >
              {MASTER_TEMPLATE_TERMS.dismiss}
            </Button>
            <Button type="button" size="sm" onClick={() => setSyncConfirmOpen(true)} className="h-7 px-3.5">
              {MASTER_TEMPLATE_TERMS.syncUpgrade}
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={syncConfirmOpen}
        onClose={() => setSyncConfirmOpen(false)}
        title={SYNC_EMPLOYEE_UPGRADE_COPY.modalTitle}
        footer={
          <>
            <button type="button" onClick={() => setSyncConfirmOpen(false)} className={BTN_SOFT}>
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                setSyncConfirmOpen(false);
                onSync();
              }}
              className={BTN_INK}
            >
              {SYNC_EMPLOYEE_UPGRADE_COPY.confirmButton}
            </button>
          </>
        }
      >
        <p className="text-neutral-500 leading-relaxed">
          {SYNC_EMPLOYEE_UPGRADE_COPY.body}
        </p>
      </Modal>
    </section>
  );
};
