/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, Cpu, Trash2 } from '@/lib/icons';
import { SegmentedTabs, SegmentedTabBar } from './common/SegmentedTabs';
import { PageHeader } from './common/PageHeader';
import { CardIcon } from './common/CardIcon';
import { ListPagination, LIST_PAGE_SIZE, paginateItems } from './common/ListPagination';
import {
  SkillStudioWorkspace,
  type SkillStudioPublishPayload,
} from './skills/SkillStudioWorkspace';
import { PAGE, CARD, CARD_HOVER, BTN_INK, SEARCH_FIELD } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { SKILL_PAGE_COPY } from '@/lib/platformTerminology';
import { ContentBusy } from './common/ContentBusy';
import { useMockLatency } from '@/lib/useMockLatency';

const TRAINING_TABS = [
  { tab: 'kb', label: '员工知识' },
  { tab: 'skills', label: '员工技能' },
  { tab: 'abTest', label: '员工比拼' },
];

const SUB_TABS: { key: 'subscribed' | 'mine' | 'market'; label: string }[] = [
  { key: 'subscribed', label: '已订阅技能' },
  { key: 'mine', label: SKILL_PAGE_COPY.tabTeam },
  { key: 'market', label: SKILL_PAGE_COPY.tabMarket },
];

export const SkillPage: React.FC = () => {
  const { skills, createSkill, deleteSkill, hiredAgents, showToast } = useApp();
  const [skillTab, setSkillTab] = useState<'subscribed' | 'mine' | 'market'>('subscribed');
  const [search, setSearch] = useState('');
  const listBusy = useMockLatency(`skills-${skillTab}`, 'pageList');
  const [page, setPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  const filtered = skills.filter((s) => {
    const km = s.name.toLowerCase().includes(search.toLowerCase());
    return km && s.type === skillTab;
  });

  useEffect(() => {
    setPage(1);
  }, [search, skillTab]);

  const pagedFiltered = paginateItems(filtered, page, LIST_PAGE_SIZE);

  const currentQuota = 127;
  const maxQuota = 1000000;
  const quotaPercentage = (currentQuota / maxQuota) * 100;

  const handlePublishSkill = ({ name, description }: SkillStudioPublishPayload) => {
    createSkill(name, description, 'mine');
    setIsCreating(false);
    setSkillTab('mine');
    showToast(SKILL_PAGE_COPY.createSuccess);
  };

  if (isCreating) {
    return (
      <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden bg-white">
        <SkillStudioWorkspace
          onBack={() => setIsCreating(false)}
          onPublish={handlePublishSkill}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <SegmentedTabs items={TRAINING_TABS} />

      <PageHeader title={SKILL_PAGE_COPY.title} description={SKILL_PAGE_COPY.subtitle}>
        <div className="w-full xl:w-72 bg-neutral-100 border border-neutral-200 px-3 py-2 rounded-[13px] shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-neutral-700 leading-tight">
                智能云联接口剩余配额
              </p>
              <p className="text-[10px] text-neutral-400 leading-snug mt-0.5">
                授权使用额过剩，每月 1 日零点清置
              </p>
            </div>
            <span className="font-mono text-[11px] text-neutral-500 tabular-nums shrink-0 pt-0.5">
              {currentQuota.toLocaleString()} / {maxQuota.toLocaleString()}
            </span>
          </div>
          <div className="mt-1.5 bg-neutral-200 rounded-full h-1 overflow-hidden">
            <div
              className="bg-ink h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(quotaPercentage, 2)}%` }}
            />
          </div>
        </div>
      </PageHeader>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-200 pb-3 mb-6">
        <SegmentedTabBar
          value={skillTab}
          onChange={(id) => setSkillTab(id as typeof skillTab)}
          items={SUB_TABS.map((t) => ({ id: t.key, label: t.label }))}
        />

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              placeholder="搜索可用技能名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(SEARCH_FIELD, 'pl-9 pr-4')}
            />
          </div>

          <button type="button" onClick={() => setIsCreating(true)} className={BTN_INK}>
            <Plus size={14} />
            <span>{SKILL_PAGE_COPY.createSkill}</span>
          </button>
        </div>
      </div>

      <ContentBusy busy={listBusy} size="panel" minHeight={240}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pagedFiltered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-neutral-500">
            {SKILL_PAGE_COPY.emptyList}
          </div>
        ) : (
          pagedFiltered.map((s) => {
            const boundNames = hiredAgents
              .filter((a) => a.skills.includes(s.id))
              .map((a) => a.name);

            return (
              <div
                key={s.id}
                className={`${CARD} ${CARD_HOVER} p-4 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <CardIcon seed={s.id} size="sm">
                      <Cpu size={18} />
                    </CardIcon>

                    {skillTab === 'mine' && (
                      <button
                        type="button"
                        onClick={() => deleteSkill(s.id)}
                        className="p-1 hover:bg-rose-50 rounded-lg text-neutral-400 hover:text-rose-600 transition"
                        title="删除技能"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight mb-1.5">
                    {s.name}
                  </h3>

                  <span className="inline-block text-[9px] bg-neutral-100 text-neutral-500 rounded-md px-1.5 py-0.5 border border-neutral-200 font-mono mb-2">
                    更新时间：{s.updatedAt}
                  </span>

                  <p className="text-xs text-neutral-500 leading-relaxed mb-4 min-h-[36px]">
                    {s.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100">
                  <span className="block text-[10px] text-neutral-400 font-medium mb-1">
                    {SKILL_PAGE_COPY.boundBlockTitle}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {boundNames.length > 0 ? (
                      boundNames.map((boundName, i) => (
                        <span
                          key={i}
                          className="bg-neutral-100 text-neutral-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-neutral-200 scale-95"
                        >
                          {boundName}
                        </span>
                      ))
                    ) : (
                      <span className="text-neutral-400 italic text-[10px]">
                        {SKILL_PAGE_COPY.emptyBound}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ListPagination
        total={filtered.length}
        page={page}
        onPageChange={setPage}
        className="mt-4 pt-3 border-t border-neutral-200"
      />
      </ContentBusy>
    </div>
  );
};
