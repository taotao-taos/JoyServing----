/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { agentAvatarForCard } from '@/lib/agentAvatarDisplay';
import { JOB_FAMILY_LABELS } from '@/lib/jobFamily';
import { SELECT_TRIGGER } from '@/lib/ui';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmployeeHomeRelay } from './employees/relay/EmployeeHomeRelay';
import { MarketCardRelay } from './employees/relay/MarketCardRelay';
import homeStyles from './employees/relay/EmployeeHomeRelay.module.scss';
import { ContentBusy } from './common/ContentBusy';
import { useMockLatency } from '@/lib/useMockLatency';
import type { AgentMarketInfo } from '../types';

const FILTER_OPTIONS = [
  { key: 'all' as const, label: '全部' },
  { key: 'ready' as const, label: '开箱即用' },
  { key: 'custom' as const, label: '联系定制' },
] as const;

const FAMILY_OPTIONS = [
  { key: 'all' as const, label: '全部员工' },
  { key: 'cs' as const, label: '客服' },
  { key: 'qc' as const, label: '质检' },
  { key: 'other' as const, label: '其他' },
] as const;

type CategoryFilter = (typeof FILTER_OPTIONS)[number]['key'];
type FamilyFilter = (typeof FAMILY_OPTIONS)[number]['key'];

function resolveFamilyBucket(agent: AgentMarketInfo): Exclude<FamilyFilter, 'all'> {
  const family = agent.jobFamily ?? 'customer_service';
  if (family === 'quality_inspection') return 'qc';
  if (family === 'customer_service') return 'cs';
  return 'other';
}

export const MarketPage: React.FC = () => {
  const { marketAgents, hiredAgents, hireAgent, showToast, setActiveTab } = useApp();
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>('all');
  const listBusy = useMockLatency('market-cards', 'pageList');

  const handleHire = (id: string) => {
    hireAgent(id);
  };

  const filteredAgents = useMemo(() => {
    return marketAgents.filter((a) => {
      if (filter !== 'all' && a.category !== filter) return false;
      if (familyFilter !== 'all' && resolveFamilyBucket(a) !== familyFilter) return false;
      return true;
    });
  }, [marketAgents, filter, familyFilter]);

  const filterLabel = FILTER_OPTIONS.find((o) => o.key === filter)?.label ?? '全部';
  const familyLabel =
    FAMILY_OPTIONS.find((o) => o.key === familyFilter)?.label ?? '全部员工';

  const renderCard = (agent: AgentMarketInfo, index: number) => {
    const isHiredAlready = hiredAgents.some((h) => h.marketId === agent.id);
    const cardAvatar = agentAvatarForCard(agent.avatar, index, false);
    const family = agent.jobFamily ?? 'customer_service';

    return (
      <MarketCardRelay
        key={agent.id}
        name={agent.name}
        desc={agent.description}
        avatarSrc={cardAvatar.kind === 'image' ? cardAvatar.src : undefined}
        avatarEmoji={cardAvatar.kind === 'emoji' ? cardAvatar.emoji : agent.avatar}
        category={agent.category}
        jobFamilyLabel={JOB_FAMILY_LABELS[family]}
        isHiredAlready={isHiredAlready}
        onHire={() => handleHire(agent.id)}
        onCustomRequest={() => {
          showToast(
            `已收到您的定制需求。专属顾问将尽快联系您，为「${agent.name}」出具整合方案。`,
          );
          handleHire(agent.id);
        }}
      />
    );
  };

  return (
    <EmployeeHomeRelay
      activeSubTab="market"
      onSubTabChange={(tab) => setActiveTab(tab)}
      onStartHire={() => setActiveTab('market')}
      search=""
      onSearchChange={() => {}}
      statusFilter="all"
      onStatusFilterChange={() => {}}
    >
      <div className={homeStyles.employeeSection}>
        <div className={homeStyles.sectionHeader}>
          <div className={homeStyles.sectionTitleMain}>数字员工市场</div>
          <div className={cn(homeStyles.headerFilters, 'items-center')}>
            <Select
              value={filter}
              onValueChange={(v) => v && setFilter(v as CategoryFilter)}
            >
              <SelectTrigger className={SELECT_TRIGGER} aria-label="按类型筛选">
                <SelectValue>{filterLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {FILTER_OPTIONS.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={familyFilter}
              onValueChange={(v) => v && setFamilyFilter(v as FamilyFilter)}
            >
              <SelectTrigger className={SELECT_TRIGGER} aria-label="按岗位分类筛选">
                <SelectValue>{familyLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {FAMILY_OPTIONS.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {listBusy ? (
          <ContentBusy busy size="panel" minHeight={220} />
        ) : filteredAgents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500">
            当前筛选下暂无数字员工
          </div>
        ) : (
          <div className={homeStyles.cardList}>
            {filteredAgents.map((agent, index) => renderCard(agent, index))}
          </div>
        )}
      </div>
    </EmployeeHomeRelay>
  );
};
