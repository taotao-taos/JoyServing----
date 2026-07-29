/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Relay 高保真 — 我的数字员工首页主内容区
 */

import React from 'react';
import styles from './EmployeeHomeRelay.module.scss';
import { RELAY_HOME_ASSETS } from '@/lib/relayHomeAssets';
import { SELECT_TRIGGER } from '@/lib/ui';
import { SegmentedTabBar } from '../../common/SegmentedTabs';
import { ContentBusy } from '../../common/ContentBusy';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EMPLOYEE_PAGE_COPY } from '@/lib/platformTerminology';

const STATUS_OPTIONS = [
  { key: 'all' as const, label: '所有状态' },
  { key: 'online' as const, label: '已上岗' },
  { key: 'draft' as const, label: '待上岗 / 培训中' },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]['key'];

interface EmployeeHomeRelayProps {
  activeSubTab: 'employees' | 'market';
  onSubTabChange: (tab: 'employees' | 'market') => void;
  onStartHire: () => void;
  /** 不选市场模板，空白起盘定制 */
  onCreateFromScratch: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  children: React.ReactNode;
  /** 仅卡片列表区加载（Tab/Banner/筛选不挡） */
  listBusy?: boolean;
}

export const EmployeeHomeRelay: React.FC<EmployeeHomeRelayProps> = ({
  activeSubTab,
  onSubTabChange,
  onStartHire,
  onCreateFromScratch,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  children,
  listBusy = false,
}) => {
  const statusLabel =
    STATUS_OPTIONS.find((o) => o.key === statusFilter)?.label ?? '所有状态';

  return (
    <div className={styles.mainContent}>
      <div className={styles.tabs}>
        <SegmentedTabBar
          ariaLabel="数字员工"
          value={activeSubTab}
          onChange={(id) => onSubTabChange(id as 'employees' | 'market')}
          items={[
            { id: 'employees', label: '我的数字员工' },
            { id: 'market', label: '数字员工市场' },
          ]}
        />
      </div>

      {activeSubTab === 'employees' ? (
        <div className={styles.scrollContent}>
          <div className={styles.bannerArea}>
            <img className={styles.bannerBg} src={RELAY_HOME_ASSETS.bannerBg} alt="" />
            <div className={styles.bannerContent}>
              <div className={styles.bannerTextWrap}>
                <div className={styles.bannerTitle}>雇佣新员工上手向导</div>
                <div className={styles.bannerDesc}>
                  一键带你雇人、配技能、试岗，几步就能让数字员工上岗。
                </div>
                <button type="button" className={styles.startBtn} onClick={onStartHire}>
                  <span className={styles.startBtnText}>立即雇佣开始</span>
                  <img className={styles.startBtnIcon} src={RELAY_HOME_ASSETS.bannerArrow} alt="" />
                </button>
              </div>
            </div>
            <img className={styles.bannerRightImg} src={RELAY_HOME_ASSETS.bannerRight} alt="" />
            <img className={styles.mouseIcon} src={RELAY_HOME_ASSETS.mouse} alt="" />
          </div>

          <div className={styles.employeeSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleMain}>我的数字员工</div>

              <div className={styles.headerFilters}>
                <label className={styles.searchInputWrap}>
                  <img className={styles.searchIcon} src={RELAY_HOME_ASSETS.search} alt="" />
                  <input
                    className={styles.searchInput}
                    type="text"
                    placeholder={EMPLOYEE_PAGE_COPY.searchPlaceholder}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                </label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => v && onStatusFilterChange(v as StatusFilter)}
                >
                  <SelectTrigger className={SELECT_TRIGGER} aria-label="筛选状态">
                    <SelectValue>{statusLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="end">
                    {STATUS_OPTIONS.map(({ key, label }) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                type="button"
                className={styles.createFromScratchBtn}
                onClick={onCreateFromScratch}
                title="不选市场模板、也不走平台代做，自己空白起盘"
              >
                + {EMPLOYEE_PAGE_COPY.createFromScratch}
              </button>
            </div>

            <div className={styles.cardList}>
              <ContentBusy
                busy={listBusy}
                size="panel"
                minHeight={220}
                className="col-span-full"
              >
                {children}
              </ContentBusy>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.scrollContent}>{children}</div>
      )}
    </div>
  );
};
