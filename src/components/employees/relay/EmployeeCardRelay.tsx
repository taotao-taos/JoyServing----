/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import styles from './EmployeeCardRelay.module.scss';

export interface EmployeeCardRelayProps {
  name: string;
  desc: string;
  avatar: string;
  avatarFallback?: string;
  isOnline: boolean;
  onTrain: () => void;
  onToggleStatus: () => void;
  onMoreClick: (e: React.MouseEvent) => void;
  /** 培训入口有待处理通知（如母版升级） */
  hasTrainNotice?: boolean;
  moreMenu?: React.ReactNode;
  moreOpen?: boolean;
}

export const EmployeeCardRelay: React.FC<EmployeeCardRelayProps> = ({
  name,
  desc,
  avatar,
  avatarFallback,
  isOnline,
  onTrain,
  onToggleStatus,
  onMoreClick,
  hasTrainNotice = false,
  moreMenu,
  moreOpen,
}) => {
  const statusColor = isOnline ? '#00AC6B' : '#737373';
  const showImage = avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:');

  return (
    <div className={styles.card}>
      <div className={styles.cardInner}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatarBorder}>
            {showImage ? (
              <img className={styles.avatarImg} src={avatar} alt="" />
            ) : (
              <span>{avatarFallback ?? avatar}</span>
            )}
          </div>
          <div className={styles.statusDot} style={{ backgroundColor: statusColor }} />
        </div>

        <div className={styles.name}>{name}</div>

        <div className={styles.descWrap}>
          <div className={styles.desc}>{desc}</div>
        </div>

        <div className={styles.actionWrap}>
          <div className={styles.actionInner}>
            <button
              type="button"
              className={styles.btnTrain}
              onClick={onTrain}
              aria-label={hasTrainNotice ? '培训，有待处理通知' : '培训'}
            >
              <span className={styles.btnTrainText}>培训</span>
              {hasTrainNotice ? (
                <span className={styles.trainNoticeDot} aria-hidden />
              ) : null}
            </button>
            {isOnline ? (
              <button type="button" className={styles.btnRest} onClick={onToggleStatus}>
                <span className={styles.btnRestText}>休息</span>
              </button>
            ) : (
              <button type="button" className={styles.btnWork} onClick={onToggleStatus}>
                <span className={styles.btnWorkText}>上岗</span>
              </button>
            )}
            <div className={styles.moreWrap}>
              <button
                type="button"
                className={styles.btnMore}
                onClick={onMoreClick}
                aria-expanded={moreOpen}
              >
                <span className={styles.btnMoreText}>•••</span>
              </button>
              {moreMenu}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
