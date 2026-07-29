/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HiredAgent } from '../types';

/** 顾客端 / 岗前入职测试共用的模拟回复 */
export function mockAgentChatReply(rawText: string, agent: HiredAgent): string {
  const t = rawText.toLowerCase();
  if (
    t.includes('理赔') ||
    t.includes('赔') ||
    t.includes('吃坏') ||
    t.includes('中毒') ||
    t.includes('医疗') ||
    t.includes('退款') ||
    t.includes('钱')
  ) {
    return '已调用【食安险快速理赔测算器】。根据保单：每次事故免赔额 500 元，本次就医票据合计 3,200 元，预估赔付约 2,700 元。请上传病历、发票与现场照片，系统将生成线上报案单。';
  }
  if (t.includes('拖') || t.includes('投诉') || t.includes('愤怒') || t.includes('糟糕') || t.includes('不管')) {
    return '检测到食安投诉升级风险。情绪监测模块已触发，正在为您转接理赔专员人工坐席，并标记「加急处理」工单，请稍候。';
  }
  if (
    t.includes('保') ||
    t.includes('范围') ||
    t.includes('保费') ||
    t.includes('价格') ||
    t.includes('多少钱') ||
    t.includes('保障')
  ) {
    return '根据《食安责任险产品说明手册 2026》：保障因餐食导致顾客食物中毒、异物损伤等第三者责任；基础版年费约 1,280 元/店，含 100 万责任限额与 7×24 线上报案。具体以门店面积与流水档位为准。';
  }
  return `您好！我是 ${agent.name}。请问今天需要什么帮助？`;
}
