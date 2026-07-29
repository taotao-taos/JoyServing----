/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 可搜索、可多选的资源选择弹窗 — 适用于员工知识 / 员工技能等列表扩展场景
 * 超过 10 条时分页展示；支持搜索筛选、批量全选。
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, X } from '@/lib/icons';
import { Modal } from '../common/Modal';
import { ListPagination, LIST_PAGE_SIZE, paginateItems } from '../common/ListPagination';
import { BTN_INK, BTN_SOFT, FIELD } from '@/lib/ui';
import { cn } from '@/lib/utils';

export interface BindPickerItem {
  id: string;
  name: string;
  description?: string;
  meta?: string;
  badge?: string;
}

interface ResourceBindPickerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  items: BindPickerItem[];
  searchPlaceholder?: string;
  emptyHint?: string;
  confirmLabel?: string;
  onConfirm: (selectedIds: string[]) => void;
}

const COMPACT_THRESHOLD = 10;

function sortItems(items: BindPickerItem[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

export const ResourceBindPickerModal: React.FC<ResourceBindPickerModalProps> = ({
  open,
  onClose,
  title,
  icon,
  items,
  searchPlaceholder = '搜索名称…',
  emptyHint = '暂无可绑定的资源',
  confirmLabel = '确认绑定',
  onConfirm,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedIds(new Set());
    setPage(1);
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const sortedItems = useMemo(() => sortItems(items), [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedItems;
    return sortedItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.meta?.toLowerCase().includes(q),
    );
  }, [sortedItems, query]);

  const pagedItems = paginateItems(filteredItems, page, LIST_PAGE_SIZE);
  const compact = items.length >= COMPACT_THRESHOLD;
  const filteredIds = useMemo(() => filteredItems.map((item) => item.id), [filteredItems]);
  const selectedCount = selectedIds.size;
  const filteredSelectedCount = filteredIds.filter((id) => selectedIds.has(id)).length;
  const allFilteredSelected =
    filteredIds.length > 0 && filteredSelectedCount === filteredIds.length;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleConfirm = () => {
    if (selectedCount === 0) return;
    onConfirm(Array.from(selectedIds));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={icon}
      title={title}
      maxWidth="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN_SOFT}>
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className={cn(BTN_INK, 'disabled:opacity-50 disabled:pointer-events-none')}
          >
            {confirmLabel}
            {selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        </>
      }
    >
      <p className="text-[11px] text-neutral-500 mb-3 leading-relaxed">
        支持搜索与多选；超过 10 条自动分页，可先搜索再批量勾选，确认后将追加到当前员工。
      </p>

      <div className="rounded-lg border border-neutral-200 overflow-hidden">
        <div className="p-3 border-b border-neutral-200 bg-neutral-100/20 space-y-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(FIELD, 'pl-8 pr-8 bg-white')}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 p-0.5 cursor-pointer"
                aria-label="清空搜索"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {filteredItems.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllFiltered}
                    className="text-[10px] font-medium text-primary hover:text-primary/80 cursor-pointer"
                  >
                    {allFilteredSelected ? '取消全选当前筛选' : `全选当前筛选 (${filteredItems.length})`}
                  </button>
                )}
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-[10px] font-medium text-neutral-500 hover:text-neutral-800 cursor-pointer"
                  >
                    清空已选
                  </button>
                )}
              </div>
              <span className="text-[10px] text-neutral-500 tabular-nums">
                已选 {selectedCount} / 共 {items.length}
                {query.trim() ? ` · 筛选 ${filteredItems.length}` : ''}
              </span>
            </div>
          )}
        </div>

        <div className="divide-y divide-border">
          {filteredItems.length === 0 ? (
            <p className="px-3 py-8 text-center text-[11px] text-neutral-500">{emptyHint}</p>
          ) : (
            pagedItems.map((item) => {
              const selected = selectedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  title={compact && item.description ? item.description : undefined}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 text-left transition cursor-pointer',
                    compact ? 'py-2' : 'py-2.5 items-start',
                    selected ? 'bg-neutral-100/60' : 'hover:bg-neutral-100/60',
                  )}
                >
                  <span
                    className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                      compact ? '' : 'mt-0.5',
                      selected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-neutral-200 bg-white',
                    )}
                  >
                    {selected && <Check size={10} strokeWidth={3} />}
                  </span>

                  {item.badge ? (
                    <span className="w-7 h-7 rounded-md bg-neutral-100 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {item.badge}
                    </span>
                  ) : null}

                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-neutral-800 truncate">{item.name}</span>
                    {!compact && item.description ? (
                      <span className="block text-[10px] text-neutral-500 line-clamp-2 leading-snug mt-0.5">
                        {item.description}
                      </span>
                    ) : null}
                    {item.meta ? (
                      <span
                        className={cn(
                          'block text-[10px] text-neutral-500/80 truncate',
                          compact || item.description ? 'mt-0.5' : '',
                        )}
                      >
                        {item.meta}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <ListPagination
          total={filteredItems.length}
          page={page}
          onPageChange={setPage}
          className="px-3 py-2 border-t border-neutral-200 bg-neutral-100/10"
        />
      </div>
    </Modal>
  );
};
