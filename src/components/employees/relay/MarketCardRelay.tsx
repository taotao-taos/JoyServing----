/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import styles from './MarketCardRelay.module.scss';

export interface MarketCardRelayProps {
  name: string;
  desc: string;
  avatarSrc?: string;
  avatarEmoji?: string;
  category: 'ready' | 'custom';
  /** 岗位族标签，如「质检」 */
  jobFamilyLabel?: string;
  isHiredAlready: boolean;
  onHire: () => void;
  onCustomRequest?: () => void;
}

const HIRE_COPY = {
  hireReady: '立即雇佣',
  hireAgain: '再次雇佣',
  customApply: '帮我定制一位',
  customManage: '跟进定制进度',
} as const;

export const MarketCardRelay: React.FC<MarketCardRelayProps> = ({
  name,
  desc,
  avatarSrc,
  avatarEmoji,
  category,
  jobFamilyLabel,
  isHiredAlready,
  onHire,
  onCustomRequest,
}) => {
  return (
    <article className={styles.card}>
      <div className={styles.avatarWrap}>
        {avatarSrc ? (
          <img className={styles.avatarImg} src={avatarSrc} alt="" />
        ) : (
          <span className={styles.avatarEmoji}>{avatarEmoji}</span>
        )}
      </div>

      <h3 className={styles.title}>{name}</h3>

      <div className={styles.tagWrap}>
        {jobFamilyLabel ? <span className={styles.tagFamily}>{jobFamilyLabel}</span> : null}
        {category === 'ready' ? (
          <span className={styles.tagReady}>开箱即用</span>
        ) : (
          <span className={styles.tagCustom}>专属定制</span>
        )}
      </div>

      <p className={styles.desc}>{desc}</p>

      {category === 'ready' ? (
        isHiredAlready ? (
          <button type="button" className={styles.btnSecondary} onClick={onHire}>
            {HIRE_COPY.hireAgain}
          </button>
        ) : (
          <button type="button" className={styles.btnPrimary} onClick={onHire}>
            {HIRE_COPY.hireReady}
          </button>
        )
      ) : (
        <button
          type="button"
          className={styles.btnOutline}
          onClick={onCustomRequest ?? onHire}
        >
          {isHiredAlready ? HIRE_COPY.customManage : HIRE_COPY.customApply}
        </button>
      )}
    </article>
  );
};
