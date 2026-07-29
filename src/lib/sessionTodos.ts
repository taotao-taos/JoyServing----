/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SessionTodo } from '../types';

/** 根据客户诉求生成 AI 无法闭环的待办（去重标题） */
export function generateTodosForUnresolved(
  content: string,
  triggerMessageId?: string,
): SessionTodo[] {
  const createdAt = new Date().toTimeString().split(' ')[0];
  const todos: SessionTodo[] = [];
  const seen = new Set<string>();

  const add = (title: string, detail: string, priority: SessionTodo['priority'] = 'high') => {
    if (seen.has(title)) return;
    seen.add(title);
    todos.push({
      id: `todo_${Date.now()}_${todos.length}`,
      title,
      detail,
      priority,
      status: 'pending',
      createdAt,
      triggerMessageId,
    });
  };

  if (/赔偿|三倍|工商|举报/.test(content)) {
    add('处理赔偿与投诉诉求', '超出 AI 授权，需主管审批后回复');
  }
  if (/经理|总监|投诉|💢|土匪|垃圾/.test(content)) {
    add('升级至人工坐席跟进', '客户情绪激烈，需专人安抚');
  }
  if (/退货|退款|坏|磨损|翻新|闪退/.test(content)) {
    add('核实退换货与商品品质', '需查订单与仓储记录后处理');
  }
  if (/合同|签约|盖章|采购|折扣|VIP|总裁|董事长/.test(content)) {
    add('商务条款与合同对接', '高价值或定制需求，需商务人工确认');
  }
  if (/账|算|少退|折旧/.test(content) && !/已退|259/.test(content)) {
    add('复核退款/理赔核算', '客户对金额有疑问，需人工核对明细');
  }

  if (!todos.length) {
    add('人工跟进未决问题', 'AI 无法在当前权限下闭环，已转人工');
  }

  return todos;
}

export function mergeTodos(existing: SessionTodo[], incoming: SessionTodo[]): SessionTodo[] {
  const titles = new Set(existing.map((t) => t.title));
  const merged = [...existing];
  for (const todo of incoming) {
    if (!titles.has(todo.title)) {
      titles.add(todo.title);
      merged.push(todo);
    }
  }
  return merged;
}
