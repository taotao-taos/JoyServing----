/**
 * 侧栏图标筛选（多彩 / 蓝色渐变 / 轻拟物向）
 * 打开 /#nav-icons
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Icon, addCollection } from '@iconify/react';
import solarIcons from '@iconify-json/solar/icons.json';
import { cn } from '@/lib/utils';

addCollection(solarIcons as Parameters<typeof addCollection>[0]);

type SlotId =
  | 'employees'
  | 'office'
  | 'training'
  | 'org'
  | 'guide'
  | 'workspace'
  | 'cs'
  | 'qc';

type StyleId =
  | 'soft-blue-neo'
  | 'soft-blue-glass'
  | 'soft-blue-bubble'
  | 'fluent-color'
  | 'streamline-flat'
  | 'fluent-emoji'
  | 'icon-park-multi';

type Opt = { id: string; label: string; vibe: string };

type StyleDef = {
  id: StyleId;
  name: string;
  vibe: string;
  tags: string[];
  kind: 'soft-tile' | 'multicolor';
  tile?: 'neo' | 'glass' | 'bubble';
  samples: string[];
  slots: Record<SlotId, Opt[]>;
};

const SLOT_META: { id: SlotId; label: string }[] = [
  { id: 'employees', label: '数字员工' },
  { id: 'office', label: '办公室' },
  { id: 'training', label: '员工培训' },
  { id: 'org', label: '组织管理' },
  { id: 'guide', label: '雇佣向导' },
  { id: 'workspace', label: '工作台' },
  { id: 'cs', label: '客服工作台' },
  { id: 'qc', label: '质检工作台' },
];

/** Soft Blue 共用字形候选（白图标压在蓝渐变底上） */
const SOFT_GLYPHS: Record<SlotId, Opt[]> = {
  employees: [
    { id: 'solar:ghost-bold', label: 'ghost', vibe: '幽灵同事' },
    { id: 'solar:bot-bold', label: 'bot', vibe: '机器人' },
    { id: 'solar:atom-bold', label: 'atom', vibe: '原子' },
    { id: 'solar:magic-stick-3-bold', label: 'magic', vibe: '魔杖' },
    { id: 'solar:brain-bold', label: 'brain', vibe: '大脑' },
    { id: 'solar:star-fall-bold', label: 'star-fall', vibe: '流星' },
    { id: 'solar:cpu-bolt-bold', label: 'cpu', vibe: '算力' },
    { id: 'solar:puzzle-bold', label: 'puzzle', vibe: '拼图' },
    { id: 'solar:face-scan-circle-bold', label: 'scan', vibe: '识别' },
    { id: 'solar:user-speak-rounded-bold', label: 'speak', vibe: '会说话' },
    { id: 'solar:screencast-bold', label: 'cast', vibe: '投屏' },
    { id: 'solar:flashlight-bold', label: 'flash', vibe: '闪光' },
  ],
  office: [
    { id: 'solar:sofa-2-bold', label: 'sofa', vibe: '沙发办公' },
    { id: 'solar:buildings-bold', label: 'buildings', vibe: '楼宇' },
    { id: 'solar:home-smile-bold', label: 'home', vibe: '微笑之家' },
    { id: 'solar:cup-hot-bold', label: 'cup', vibe: '热饮' },
    { id: 'solar:chair-bold', label: 'chair', vibe: '座椅' },
    { id: 'solar:case-bold', label: 'case', vibe: '公文包' },
    { id: 'solar:city-bold', label: 'city', vibe: '城市' },
    { id: 'solar:calendar-bold', label: 'calendar', vibe: '日程' },
    { id: 'solar:chart-bold', label: 'chart', vibe: '图表' },
    { id: 'solar:shop-bold', label: 'shop', vibe: '门店' },
    { id: 'solar:presentation-graph-bold', label: 'present', vibe: '汇报' },
    { id: 'solar:garage-bold', label: 'garage', vibe: '车库感' },
  ],
  training: [
    { id: 'solar:square-academic-cap-bold', label: 'cap', vibe: '学士帽' },
    { id: 'solar:notebook-bookmark-bold', label: 'notebook', vibe: '课本' },
    { id: 'solar:lightbulb-bolt-bold', label: 'bulb', vibe: '灵感' },
    { id: 'solar:rocket-2-bold', label: 'rocket', vibe: '火箭' },
    { id: 'solar:cup-star-bold', label: 'trophy', vibe: '奖杯' },
    { id: 'solar:medal-ribbons-star-bold', label: 'medal', vibe: '勋章' },
    { id: 'solar:target-bold', label: 'target', vibe: '靶心' },
    { id: 'solar:test-tube-bold', label: 'lab', vibe: '实验' },
    { id: 'solar:diploma-bold', label: 'diploma', vibe: '证书' },
    { id: 'solar:gamepad-bold', label: 'game', vibe: '闯关' },
    { id: 'solar:fire-bold', label: 'fire', vibe: '热练' },
    { id: 'solar:book-bold', label: 'book', vibe: '书' },
  ],
  org: [
    { id: 'solar:structure-bold', label: 'structure', vibe: '结构树' },
    { id: 'solar:users-group-rounded-bold', label: 'users', vibe: '团队' },
    { id: 'solar:crown-bold', label: 'crown', vibe: '角色' },
    { id: 'solar:key-bold', label: 'key', vibe: '钥匙' },
    { id: 'solar:user-id-bold', label: 'id', vibe: '工牌' },
    { id: 'solar:shield-keyhole-bold', label: 'shield', vibe: '权限' },
    { id: 'solar:share-bold', label: 'share', vibe: '协作' },
    { id: 'solar:settings-bold', label: 'settings', vibe: '配置' },
    { id: 'solar:people-nearby-bold', label: 'nearby', vibe: '邻座' },
    { id: 'solar:passport-bold', label: 'passport', vibe: '通行证' },
    { id: 'solar:buildings-2-bold', label: 'org-building', vibe: '组织楼' },
    { id: 'solar:widget-bold', label: 'widget', vibe: '模块' },
  ],
  guide: [
    { id: 'solar:map-bold', label: 'map', vibe: '地图' },
    { id: 'solar:compass-bold', label: 'compass', vibe: '指南针' },
    { id: 'solar:rocket-bold', label: 'rocket', vibe: '起飞' },
    { id: 'solar:gift-bold', label: 'gift', vibe: '礼物' },
    { id: 'solar:confetti-bold', label: 'confetti', vibe: '礼花' },
    { id: 'solar:flag-bold', label: 'flag', vibe: '旗帜' },
    { id: 'solar:routing-2-bold', label: 'routing', vibe: '路径' },
    { id: 'solar:balloon-bold', label: 'balloon', vibe: '气球' },
    { id: 'solar:hand-stars-bold', label: 'hand-stars', vibe: '点星' },
    { id: 'solar:star-bold', label: 'star', vibe: '星星' },
    { id: 'solar:cursor-bold', label: 'cursor', vibe: '光标' },
    { id: 'solar:check-circle-bold', label: 'check', vibe: '完成' },
  ],
  workspace: [
    { id: 'solar:widget-4-bold', label: 'widget-4', vibe: '组件台' },
    { id: 'solar:widget-5-bold', label: 'widget-5', vibe: '工作台' },
    { id: 'solar:monitor-bold', label: 'monitor', vibe: '显示器' },
    { id: 'solar:laptop-bold', label: 'laptop', vibe: '笔记本' },
    { id: 'solar:window-frame-bold', label: 'window', vibe: '窗口' },
    { id: 'solar:box-bold', label: 'box', vibe: '工具箱' },
    { id: 'solar:layers-bold', label: 'layers', vibe: '图层' },
    { id: 'solar:command-bold', label: 'command', vibe: '命令' },
    { id: 'solar:server-bold', label: 'server', vibe: '服务台' },
    { id: 'solar:tuning-2-bold', label: 'tuning', vibe: '调参' },
    { id: 'solar:siderbar-bold', label: 'sidebar', vibe: '侧栏' },
    { id: 'solar:slider-vertical-bold', label: 'slider', vibe: '滑杆' },
  ],
  cs: [
    { id: 'solar:headphones-round-bold', label: 'headphones', vibe: '耳机' },
    { id: 'solar:chat-round-bold', label: 'chat', vibe: '聊天气泡' },
    { id: 'solar:chat-round-call-bold', label: 'call', vibe: '通话泡' },
    { id: 'solar:phone-calling-bold', label: 'phone', vibe: '来电' },
    { id: 'solar:heart-bold', label: 'heart', vibe: '用心' },
    { id: 'solar:emoji-funny-circle-bold', label: 'emoji', vibe: '开心' },
    { id: 'solar:hand-heart-bold', label: 'hand-heart', vibe: '暖心' },
    { id: 'solar:life-ring-bold', label: 'life-ring', vibe: '救生圈' },
    { id: 'solar:megaphone-bold', label: 'megaphone', vibe: '广播' },
    { id: 'solar:dialog-bold', label: 'dialog', vibe: '对话' },
    { id: 'solar:letter-bold', label: 'letter', vibe: '信件' },
    { id: 'solar:user-speak-bold', label: 'speak', vibe: '对谈' },
  ],
  qc: [
    { id: 'solar:shield-check-bold', label: 'shield-check', vibe: '护盾勾' },
    { id: 'solar:clipboard-check-bold', label: 'clipboard', vibe: '质检单' },
    { id: 'solar:checklist-bold', label: 'checklist', vibe: '清单' },
    { id: 'solar:verified-check-bold', label: 'verified', vibe: '认证' },
    { id: 'solar:magnifer-bold', label: 'search', vibe: '放大镜' },
    { id: 'solar:eye-bold', label: 'eye', vibe: '复核' },
    { id: 'solar:scale-bold', label: 'scale', vibe: '天平' },
    { id: 'solar:scanner-bold', label: 'scanner', vibe: '扫描' },
    { id: 'solar:bug-bold', label: 'bug', vibe: '抓虫' },
    { id: 'solar:check-square-bold', label: 'check', vibe: '勾选' },
    { id: 'solar:danger-circle-bold', label: 'danger', vibe: '风险' },
    { id: 'solar:document-medicine-bold', label: 'audit', vibe: '审单' },
  ],
};

const STYLES: StyleDef[] = [
  {
    id: 'soft-blue-neo',
    name: 'Soft Blue 轻拟物',
    vibe: '蓝渐变凸面小方块 + 白色字形，最接近轻拟物 App 图标',
    tags: ['蓝渐变', '轻拟物', '推荐'],
    kind: 'soft-tile',
    tile: 'neo',
    samples: [
      'solar:ghost-bold',
      'solar:sofa-2-bold',
      'solar:square-academic-cap-bold',
      'solar:shield-check-bold',
    ],
    slots: SOFT_GLYPHS,
  },
  {
    id: 'soft-blue-glass',
    name: 'Soft Blue 玻璃',
    vibe: '半透蓝玻璃底 + 高光边，偏晶莹、轻一点',
    tags: ['蓝渐变', '玻璃', '轻'],
    kind: 'soft-tile',
    tile: 'glass',
    samples: [
      'solar:bot-bold',
      'solar:home-smile-bold',
      'solar:rocket-2-bold',
      'solar:headphones-round-bold',
    ],
    slots: SOFT_GLYPHS,
  },
  {
    id: 'soft-blue-bubble',
    name: 'Soft Blue 气泡',
    vibe: '更圆的蓝渐变球，可爱一点、拟物感更强',
    tags: ['蓝渐变', '圆形', '可爱'],
    kind: 'soft-tile',
    tile: 'bubble',
    samples: [
      'solar:ghost-bold',
      'solar:cup-hot-bold',
      'solar:gift-bold',
      'solar:map-bold',
    ],
    slots: SOFT_GLYPHS,
  },
  {
    id: 'fluent-color',
    name: 'Fluent Color',
    vibe: '微软系统彩色图标，自带蓝调与层次，偏产品成熟',
    tags: ['多彩', '蓝调', '系统感'],
    kind: 'multicolor',
    samples: [
      'fluent-color:bot-24',
      'fluent-color:building-24',
      'fluent-color:hat-graduation-24',
      'fluent-color:shield-checkmark-24',
    ],
    slots: {
      employees: [
        { id: 'fluent-color:bot-24', label: 'bot', vibe: '机器人' },
        { id: 'fluent-color:bot-sparkle-24', label: 'bot-sparkle', vibe: '闪光机器人' },
        { id: 'fluent-color:brain-circuit-24', label: 'brain', vibe: '脑回路' },
        { id: 'fluent-color:sparkle-24', label: 'sparkle', vibe: '火花' },
        { id: 'fluent-color:person-24', label: 'person', vibe: '人物' },
        { id: 'fluent-color:people-24', label: 'people', vibe: '人群' },
        { id: 'fluent-color:puzzle-piece-24', label: 'puzzle', vibe: '拼图' },
        { id: 'fluent-color:lightbulb-24', label: 'bulb', vibe: '灯泡' },
        { id: 'fluent-color:rocket-24', label: 'rocket', vibe: '火箭' },
        { id: 'fluent-color:wand-24', label: 'wand', vibe: '魔杖' },
        { id: 'fluent-color:emoji-24', label: 'emoji', vibe: '表情' },
        { id: 'fluent-color:coin-multiple-24', label: 'coin', vibe: '能量币' },
      ],
      office: [
        { id: 'fluent-color:building-24', label: 'building', vibe: '大楼' },
        { id: 'fluent-color:building-multiple-24', label: 'buildings', vibe: '楼群' },
        { id: 'fluent-color:building-home-24', label: 'building-home', vibe: '住办一体' },
        { id: 'fluent-color:home-24', label: 'home', vibe: '家' },
        { id: 'fluent-color:briefcase-24', label: 'briefcase', vibe: '公文包' },
        { id: 'fluent-color:calendar-24', label: 'calendar', vibe: '日历' },
        { id: 'fluent-color:data-trending-24', label: 'trending', vibe: '趋势' },
        { id: 'fluent-color:clipboard-24', label: 'clipboard', vibe: '板夹' },
        { id: 'fluent-color:folder-24', label: 'folder', vibe: '文件夹' },
        { id: 'fluent-color:mail-24', label: 'mail', vibe: '邮件' },
        { id: 'fluent-color:notebook-24', label: 'notebook', vibe: '笔记' },
        { id: 'fluent-color:vehicle-car-24', label: 'car', vibe: '通勤' },
      ],
      training: [
        { id: 'fluent-color:hat-graduation-24', label: 'hat', vibe: '学士帽' },
        { id: 'fluent-color:book-24', label: 'book', vibe: '书' },
        { id: 'fluent-color:book-open-24', label: 'book-open', vibe: '开卷' },
        { id: 'fluent-color:lightbulb-24', label: 'bulb', vibe: '灵感' },
        { id: 'fluent-color:trophy-24', label: 'trophy', vibe: '奖杯' },
        { id: 'fluent-color:ribbon-24', label: 'ribbon', vibe: '绶带' },
        { id: 'fluent-color:target-arrow-24', label: 'target', vibe: '靶心' },
        { id: 'fluent-color:beaker-24', label: 'beaker', vibe: '烧杯' },
        { id: 'fluent-color:games-24', label: 'games', vibe: '游戏' },
        { id: 'fluent-color:certificate-24', label: 'cert', vibe: '证书' },
        { id: 'fluent-color:rocket-24', label: 'rocket', vibe: '火箭' },
        { id: 'fluent-color:star-24', label: 'star', vibe: '星星' },
      ],
      org: [
        { id: 'fluent-color:organization-24', label: 'org', vibe: '组织' },
        { id: 'fluent-color:people-team-24', label: 'team', vibe: '团队' },
        { id: 'fluent-color:people-24', label: 'people', vibe: '人群' },
        { id: 'fluent-color:person-key-24', label: 'key-person', vibe: '钥匙人' },
        { id: 'fluent-color:shield-24', label: 'shield', vibe: '护盾' },
        { id: 'fluent-color:lock-closed-24', label: 'lock', vibe: '锁' },
        { id: 'fluent-color:settings-24', label: 'settings', vibe: '设置' },
        { id: 'fluent-color:contact-card-24', label: 'card', vibe: '名片' },
        { id: 'fluent-color:building-people-24', label: 'building-people', vibe: '楼内人' },
        { id: 'fluent-color:person-board-24', label: 'board', vibe: '人员板' },
        { id: 'fluent-color:approvals-app-24', label: 'approvals', vibe: '审批' },
        { id: 'fluent-color:key-24', label: 'key', vibe: '钥匙' },
      ],
      guide: [
        { id: 'fluent-color:compass-northwest-24', label: 'compass', vibe: '指南针' },
        { id: 'fluent-color:map-24', label: 'map', vibe: '地图' },
        { id: 'fluent-color:rocket-24', label: 'rocket', vibe: '起飞' },
        { id: 'fluent-color:gift-24', label: 'gift', vibe: '礼物' },
        { id: 'fluent-color:confetti-24', label: 'confetti', vibe: '礼花' },
        { id: 'fluent-color:flag-24', label: 'flag', vibe: '旗帜' },
        { id: 'fluent-color:star-24', label: 'star', vibe: '星星' },
        { id: 'fluent-color:handshake-24', label: 'handshake', vibe: '握手' },
        { id: 'fluent-color:location-24', label: 'pin', vibe: '定位' },
        { id: 'fluent-color:sparkle-24', label: 'sparkle', vibe: '闪光' },
        { id: 'fluent-color:checkmark-circle-24', label: 'check', vibe: '完成' },
        { id: 'fluent-color:cursor-24', label: 'cursor', vibe: '光标' },
      ],
      workspace: [
        { id: 'fluent-color:apps-24', label: 'apps', vibe: '应用宫格' },
        { id: 'fluent-color:window-24', label: 'window', vibe: '窗口' },
        { id: 'fluent-color:desktop-24', label: 'desktop', vibe: '桌面' },
        { id: 'fluent-color:laptop-24', label: 'laptop', vibe: '笔记本' },
        { id: 'fluent-color:toolbox-24', label: 'toolbox', vibe: '工具箱' },
        { id: 'fluent-color:board-24', label: 'board', vibe: '看板' },
        { id: 'fluent-color:grid-24', label: 'grid', vibe: '网格' },
        { id: 'fluent-color:layer-24', label: 'layer', vibe: '图层' },
        { id: 'fluent-color:server-24', label: 'server', vibe: '服务器' },
        { id: 'fluent-color:panel-left-24', label: 'panel', vibe: '侧栏面板' },
        { id: 'fluent-color:wrench-24', label: 'wrench', vibe: '扳手' },
        { id: 'fluent-color:slide-settings-24', label: 'slide', vibe: '幻灯设置' },
      ],
      cs: [
        { id: 'fluent-color:headphones-24', label: 'headphones', vibe: '耳机' },
        { id: 'fluent-color:headset-24', label: 'headset', vibe: '耳麦' },
        { id: 'fluent-color:chat-24', label: 'chat', vibe: '聊天' },
        { id: 'fluent-color:chat-multiple-24', label: 'chats', vibe: '多会话' },
        { id: 'fluent-color:call-24', label: 'call', vibe: '通话' },
        { id: 'fluent-color:heart-24', label: 'heart', vibe: '用心' },
        { id: 'fluent-color:person-support-24', label: 'support', vibe: '支持专员' },
        { id: 'fluent-color:megaphone-24', label: 'megaphone', vibe: '喇叭' },
        { id: 'fluent-color:hand-wave-24', label: 'wave', vibe: '挥手' },
        { id: 'fluent-color:handshake-24', label: 'handshake', vibe: '握手' },
        { id: 'fluent-color:mail-24', label: 'mail', vibe: '邮件' },
        { id: 'fluent-color:comment-24', label: 'comment', vibe: '评论' },
      ],
      qc: [
        { id: 'fluent-color:shield-checkmark-24', label: 'shield-ok', vibe: '护盾勾' },
        { id: 'fluent-color:clipboard-checkmark-24', label: 'clipboard-ok', vibe: '勾选单' },
        { id: 'fluent-color:clipboard-task-24', label: 'clipboard', vibe: '任务单' },
        { id: 'fluent-color:checkmark-circle-24', label: 'check', vibe: '通过' },
        { id: 'fluent-color:search-24', label: 'search', vibe: '搜索' },
        { id: 'fluent-color:eye-24', label: 'eye', vibe: '复核' },
        { id: 'fluent-color:scales-24', label: 'scales', vibe: '天平' },
        { id: 'fluent-color:bug-24', label: 'bug', vibe: '抓虫' },
        { id: 'fluent-color:warning-24', label: 'warning', vibe: '警告' },
        { id: 'fluent-color:document-checkmark-24', label: 'doc-ok', vibe: '审过' },
        { id: 'fluent-color:scan-24', label: 'scan', vibe: '扫描' },
        { id: 'fluent-color:task-list-square-24', label: 'tasks', vibe: '任务列表' },
      ],
    },
  },
  {
    id: 'streamline-flat',
    name: 'Streamline Color',
    vibe: '插画感更重的彩色图标，层次和渐变感更强',
    tags: ['多彩', '插画', '层次'],
    kind: 'multicolor',
    samples: [
      'streamline-color:android-flat',
      'streamline-color:office-building-1-flat',
      'streamline-color:graduation-cap-flat',
      'streamline-color:shield-check-flat',
    ],
    slots: {
      employees: [
        { id: 'streamline-color:android-flat', label: 'android', vibe: '安卓感' },
        { id: 'streamline-color:brain-flat', label: 'brain', vibe: '大脑' },
        { id: 'streamline-color:brain-cognitive-flat', label: 'cognitive', vibe: '认知脑' },
        { id: 'streamline-color:artificial-intelligence-robot-flat', label: 'ai-robot', vibe: 'AI 机器人' },
        { id: 'streamline-color:artificial-intelligence-spark-flat', label: 'ai-spark', vibe: 'AI 火花' },
        { id: 'streamline-color:flash-2-flat', label: 'flash', vibe: '闪光' },
        { id: 'streamline-color:magic-wand-2-flat', label: 'wand', vibe: '魔杖' },
        { id: 'streamline-color:puzzle-flat', label: 'puzzle', vibe: '拼图' },
        { id: 'streamline-color:smiley-happy-flat', label: 'smiley', vibe: '笑脸' },
        { id: 'streamline-color:star-flat', label: 'star', vibe: '星星' },
        { id: 'streamline-color:rocket-flat', label: 'rocket', vibe: '火箭' },
        { id: 'streamline-color:chip-flat', label: 'chip', vibe: '芯片' },
      ],
      office: [
        { id: 'streamline-color:office-building-1-flat', label: 'office', vibe: '写字楼' },
        { id: 'streamline-color:building-2-flat', label: 'building', vibe: '建筑' },
        { id: 'streamline-color:home-3-flat', label: 'home', vibe: '家' },
        { id: 'streamline-color:home-4-flat', label: 'home-4', vibe: '家2' },
        { id: 'streamline-color:coffee-cup-flat', label: 'coffee', vibe: '咖啡' },
        { id: 'streamline-color:briefcase-flat', label: 'briefcase', vibe: '公文包' },
        { id: 'streamline-color:calendar-flat', label: 'calendar', vibe: '日历' },
        { id: 'streamline-color:graph-flat', label: 'graph', vibe: '图表' },
        { id: 'streamline-color:sofa-flat', label: 'sofa', vibe: '沙发' },
        { id: 'streamline-color:desk-flat', label: 'desk', vibe: '书桌' },
        { id: 'streamline-color:city-hall-flat', label: 'city', vibe: '市政楼' },
        { id: 'streamline-color:shop-flat', label: 'shop', vibe: '店铺' },
      ],
      training: [
        { id: 'streamline-color:graduation-cap-flat', label: 'cap', vibe: '学士帽' },
        { id: 'streamline-color:open-book-flat', label: 'book', vibe: '开卷' },
        { id: 'streamline-color:manual-book-flat', label: 'manual', vibe: '手册' },
        { id: 'streamline-color:light-bulb-flat', label: 'bulb', vibe: '灵感' },
        { id: 'streamline-color:rocket-flat', label: 'rocket', vibe: '火箭' },
        { id: 'streamline-color:trophy-flat', label: 'trophy', vibe: '奖杯' },
        { id: 'streamline-color:medal-flat', label: 'medal', vibe: '奖牌' },
        { id: 'streamline-color:target-flat', label: 'target', vibe: '靶心' },
        { id: 'streamline-color:science-molecule-flat', label: 'science', vibe: '科学' },
        { id: 'streamline-color:game-controller-flat', label: 'game', vibe: '手柄' },
        { id: 'streamline-color:certificate-flat', label: 'cert', vibe: '证书' },
        { id: 'streamline-color:school-bus-side-flat', label: 'bus', vibe: '校车' },
      ],
      org: [
        { id: 'streamline-color:hierarchy-2-flat', label: 'hierarchy', vibe: '层级' },
        { id: 'streamline-color:hierarchy-4-flat', label: 'hierarchy-4', vibe: '层级4' },
        { id: 'streamline-color:hierarchy-7-flat', label: 'hierarchy-7', vibe: '层级7' },
        { id: 'streamline-color:team-flat', label: 'team', vibe: '团队' },
        { id: 'streamline-color:id-card-flat', label: 'id', vibe: '工牌' },
        { id: 'streamline-color:key-flat', label: 'key', vibe: '钥匙' },
        { id: 'streamline-color:crown-flat', label: 'crown', vibe: '皇冠' },
        { id: 'streamline-color:shield-1-flat', label: 'shield', vibe: '护盾' },
        { id: 'streamline-color:network-flat', label: 'network', vibe: '网络' },
        { id: 'streamline-color:settings-flat', label: 'settings', vibe: '设置' },
        { id: 'streamline-color:passport-flat', label: 'passport', vibe: '护照' },
        { id: 'streamline-color:building-2-flat', label: 'building', vibe: '建筑' },
      ],
      guide: [
        { id: 'streamline-color:map-fold-flat', label: 'map', vibe: '折地图' },
        { id: 'streamline-color:compass-navigator-flat', label: 'compass', vibe: '指南针' },
        { id: 'streamline-color:location-compass-1-flat', label: 'location', vibe: '定位罗盘' },
        { id: 'streamline-color:arrow-roadmap-flat', label: 'roadmap', vibe: '路线图' },
        { id: 'streamline-color:rocket-flat', label: 'rocket', vibe: '起飞' },
        { id: 'streamline-color:gift-flat', label: 'gift', vibe: '礼物' },
        { id: 'streamline-color:flag-flat', label: 'flag', vibe: '旗帜' },
        { id: 'streamline-color:party-balloon-flat', label: 'balloon', vibe: '气球' },
        { id: 'streamline-color:star-flat', label: 'star', vibe: '星星' },
        { id: 'streamline-color:cursor-click-flat', label: 'click', vibe: '点击' },
        { id: 'streamline-color:check-circle-flat', label: 'check', vibe: '完成' },
        { id: 'streamline-color:hand-wave-flat', label: 'wave', vibe: '挥手' },
      ],
      workspace: [
        { id: 'streamline-color:desktop-help-flat', label: 'desktop-help', vibe: '桌面帮助' },
        { id: 'streamline-color:desktop-chat-flat', label: 'desktop-chat', vibe: '桌面聊天' },
        { id: 'streamline-color:desktop-code-flat', label: 'desktop-code', vibe: '桌面代码' },
        { id: 'streamline-color:app-window-flat', label: 'window', vibe: '应用窗' },
        { id: 'streamline-color:dashboard-gauge-flat', label: 'dashboard', vibe: '仪表盘' },
        { id: 'streamline-color:browser-window-flat', label: 'browser', vibe: '浏览器' },
        { id: 'streamline-color:toolbox-flat', label: 'toolbox', vibe: '工具箱' },
        { id: 'streamline-color:layers-flat', label: 'layers', vibe: '图层' },
        { id: 'streamline-color:grid-flat', label: 'grid', vibe: '网格' },
        { id: 'streamline-color:server-2-flat', label: 'server', vibe: '服务器' },
        { id: 'streamline-color:kanban-board-flat', label: 'kanban', vibe: '看板' },
        { id: 'streamline-color:terminal-flat', label: 'terminal', vibe: '终端' },
      ],
      cs: [
        { id: 'streamline-color:customer-support-1-flat', label: 'support', vibe: '客服支持' },
        { id: 'streamline-color:customer-support-7-flat', label: 'support-7', vibe: '客服7' },
        { id: 'streamline-color:help-chat-2-flat', label: 'help-chat', vibe: '帮助聊天' },
        { id: 'streamline-color:desktop-chat-flat', label: 'desktop-chat', vibe: '桌面聊' },
        { id: 'streamline-color:headphones-customer-support-human-flat', label: 'headphones', vibe: '耳麦人' },
        { id: 'streamline-color:phone-call-flat', label: 'phone', vibe: '电话' },
        { id: 'streamline-color:chat-bubble-oval-flat', label: 'chat', vibe: '聊天气泡' },
        { id: 'streamline-color:heart-flat', label: 'heart', vibe: '用心' },
        { id: 'streamline-color:smiley-happy-flat', label: 'smiley', vibe: '微笑' },
        { id: 'streamline-color:megaphone-flat', label: 'megaphone', vibe: '喇叭' },
        { id: 'streamline-color:life-ring-flat', label: 'life-ring', vibe: '救生圈' },
        { id: 'streamline-color:handshake-flat', label: 'handshake', vibe: '握手' },
      ],
      qc: [
        { id: 'streamline-color:shield-check-flat', label: 'shield-check', vibe: '护盾勾' },
        { id: 'streamline-color:shield-1-flat', label: 'shield', vibe: '护盾' },
        { id: 'streamline-color:shield-2-flat', label: 'shield-2', vibe: '护盾2' },
        { id: 'streamline-color:checklist-flat', label: 'checklist', vibe: '清单' },
        { id: 'streamline-color:clipboard-check-flat', label: 'clipboard', vibe: '质检单' },
        { id: 'streamline-color:search-flat', label: 'search', vibe: '搜索' },
        { id: 'streamline-color:eye-flat', label: 'eye', vibe: '复核' },
        { id: 'streamline-color:balance-scale-flat', label: 'scale', vibe: '天平' },
        { id: 'streamline-color:bug-flat', label: 'bug', vibe: '抓虫' },
        { id: 'streamline-color:check-circle-flat', label: 'check', vibe: '通过' },
        { id: 'streamline-color:warning-diamond-flat', label: 'warning', vibe: '警告' },
        { id: 'streamline-color:document-check-flat', label: 'doc-ok', vibe: '审过' },
      ],
    },
  },
  {
    id: 'fluent-emoji',
    name: 'Fluent Emoji Flat',
    vibe: '微软彩色表情风，最花、最轻松，偏趣味运营感',
    tags: ['多彩', '表情', '趣味'],
    kind: 'multicolor',
    samples: [
      'fluent-emoji-flat:ghost',
      'fluent-emoji-flat:office-building',
      'fluent-emoji-flat:graduation-cap',
      'fluent-emoji-flat:shield',
    ],
    slots: {
      employees: [
        { id: 'fluent-emoji-flat:ghost', label: 'ghost', vibe: '幽灵' },
        { id: 'fluent-emoji-flat:robot', label: 'robot', vibe: '机器人' },
        { id: 'fluent-emoji-flat:alien', label: 'alien', vibe: '外星人' },
        { id: 'fluent-emoji-flat:sparkles', label: 'sparkles', vibe: '火花' },
        { id: 'fluent-emoji-flat:brain', label: 'brain', vibe: '大脑' },
        { id: 'fluent-emoji-flat:zany-face', label: 'zany', vibe: '搞怪脸' },
        { id: 'fluent-emoji-flat:smiling-face-with-sunglasses', label: 'cool', vibe: '墨镜脸' },
        { id: 'fluent-emoji-flat:rocket', label: 'rocket', vibe: '火箭' },
        { id: 'fluent-emoji-flat:crystal-ball', label: 'crystal', vibe: '水晶球' },
        { id: 'fluent-emoji-flat:magic-wand', label: 'wand', vibe: '魔杖' },
        { id: 'fluent-emoji-flat:puzzle-piece', label: 'puzzle', vibe: '拼图' },
        { id: 'fluent-emoji-flat:glowing-star', label: 'star', vibe: '发光星' },
      ],
      office: [
        { id: 'fluent-emoji-flat:office-building', label: 'office', vibe: '办公楼' },
        { id: 'fluent-emoji-flat:classical-building', label: 'classical', vibe: '古典楼' },
        { id: 'fluent-emoji-flat:cityscape', label: 'city', vibe: '城市' },
        { id: 'fluent-emoji-flat:briefcase', label: 'briefcase', vibe: '公文包' },
        { id: 'fluent-emoji-flat:couch-and-lamp', label: 'couch', vibe: '沙发灯' },
        { id: 'fluent-emoji-flat:hot-beverage', label: 'coffee', vibe: '热饮' },
        { id: 'fluent-emoji-flat:calendar', label: 'calendar', vibe: '日历' },
        { id: 'fluent-emoji-flat:chart-increasing', label: 'chart', vibe: '上涨图' },
        { id: 'fluent-emoji-flat:newspaper', label: 'news', vibe: '报纸' },
        { id: 'fluent-emoji-flat:department-store', label: 'store', vibe: '百货' },
        { id: 'fluent-emoji-flat:post-office', label: 'post', vibe: '邮局' },
        { id: 'fluent-emoji-flat:office-worker', label: 'worker', vibe: '上班族' },
      ],
      training: [
        { id: 'fluent-emoji-flat:graduation-cap', label: 'cap', vibe: '学士帽' },
        { id: 'fluent-emoji-flat:school', label: 'school', vibe: '学校' },
        { id: 'fluent-emoji-flat:blue-book', label: 'blue-book', vibe: '蓝书' },
        { id: 'fluent-emoji-flat:open-book', label: 'open-book', vibe: '开卷' },
        { id: 'fluent-emoji-flat:light-bulb', label: 'bulb', vibe: '灯泡' },
        { id: 'fluent-emoji-flat:trophy', label: 'trophy', vibe: '奖杯' },
        { id: 'fluent-emoji-flat:sports-medal', label: 'medal', vibe: '奖牌' },
        { id: 'fluent-emoji-flat:direct-hit', label: 'target', vibe: '靶心' },
        { id: 'fluent-emoji-flat:test-tube', label: 'lab', vibe: '试管' },
        { id: 'fluent-emoji-flat:video-game', label: 'game', vibe: '游戏' },
        { id: 'fluent-emoji-flat:rocket', label: 'rocket', vibe: '火箭' },
        { id: 'fluent-emoji-flat:books', label: 'books', vibe: '书堆' },
      ],
      org: [
        { id: 'fluent-emoji-flat:people-hugging', label: 'hug', vibe: '拥抱团队' },
        { id: 'fluent-emoji-flat:busts-in-silhouette', label: 'busts', vibe: '剪影' },
        { id: 'fluent-emoji-flat:family', label: 'family', vibe: '家庭/组织' },
        { id: 'fluent-emoji-flat:key', label: 'key', vibe: '钥匙' },
        { id: 'fluent-emoji-flat:crown', label: 'crown', vibe: '皇冠' },
        { id: 'fluent-emoji-flat:locked-with-key', label: 'locked', vibe: '上锁' },
        { id: 'fluent-emoji-flat:identification-card', label: 'id', vibe: '证件' },
        { id: 'fluent-emoji-flat:gear', label: 'gear', vibe: '齿轮' },
        { id: 'fluent-emoji-flat:office-building', label: 'building', vibe: '大楼' },
        { id: 'fluent-emoji-flat:handshake', label: 'handshake', vibe: '握手' },
        { id: 'fluent-emoji-flat:link', label: 'link', vibe: '链接' },
        { id: 'fluent-emoji-flat:card-index-dividers', label: 'dividers', vibe: '分组卡' },
      ],
      guide: [
        { id: 'fluent-emoji-flat:world-map', label: 'map', vibe: '世界地图' },
        { id: 'fluent-emoji-flat:compass', label: 'compass', vibe: '指南针' },
        { id: 'fluent-emoji-flat:rocket', label: 'rocket', vibe: '起飞' },
        { id: 'fluent-emoji-flat:wrapped-gift', label: 'gift', vibe: '礼物' },
        { id: 'fluent-emoji-flat:party-popper', label: 'party', vibe: '礼花' },
        { id: 'fluent-emoji-flat:triangular-flag', label: 'flag', vibe: '三角旗' },
        { id: 'fluent-emoji-flat:round-pushpin', label: 'pin', vibe: '图钉' },
        { id: 'fluent-emoji-flat:balloon', label: 'balloon', vibe: '气球' },
        { id: 'fluent-emoji-flat:glowing-star', label: 'star', vibe: '发光星' },
        { id: 'fluent-emoji-flat:sparkles', label: 'sparkles', vibe: '火花' },
        { id: 'fluent-emoji-flat:waving-hand', label: 'wave', vibe: '挥手' },
        { id: 'fluent-emoji-flat:check-mark-button', label: 'check', vibe: '完成' },
      ],
      workspace: [
        { id: 'fluent-emoji-flat:desktop-computer', label: 'desktop', vibe: '台式机' },
        { id: 'fluent-emoji-flat:laptop', label: 'laptop', vibe: '笔记本' },
        { id: 'fluent-emoji-flat:window', label: 'window', vibe: '窗户/窗口' },
        { id: 'fluent-emoji-flat:toolbox', label: 'toolbox', vibe: '工具箱' },
        { id: 'fluent-emoji-flat:hammer-and-wrench', label: 'tools', vibe: '锤扳手' },
        { id: 'fluent-emoji-flat:control-knobs', label: 'knobs', vibe: '旋钮' },
        { id: 'fluent-emoji-flat:joystick', label: 'joystick', vibe: '摇杆' },
        { id: 'fluent-emoji-flat:file-folder', label: 'folder', vibe: '文件夹' },
        { id: 'fluent-emoji-flat:card-file-box', label: 'card-box', vibe: '卡片盒' },
        { id: 'fluent-emoji-flat:memo', label: 'memo', vibe: '备忘' },
        { id: 'fluent-emoji-flat:keyboard', label: 'keyboard', vibe: '键盘' },
        { id: 'fluent-emoji-flat:computer-mouse', label: 'mouse', vibe: '鼠标' },
      ],
      cs: [
        { id: 'fluent-emoji-flat:headphone', label: 'headphone', vibe: '耳机' },
        { id: 'fluent-emoji-flat:telephone-receiver', label: 'phone', vibe: '听筒' },
        { id: 'fluent-emoji-flat:speech-balloon', label: 'speech', vibe: '对话泡' },
        { id: 'fluent-emoji-flat:left-speech-bubble', label: 'bubble', vibe: '左对话' },
        { id: 'fluent-emoji-flat:blue-heart', label: 'blue-heart', vibe: '蓝心' },
        { id: 'fluent-emoji-flat:smiling-face-with-smiling-eyes', label: 'smile', vibe: '微笑' },
        { id: 'fluent-emoji-flat:megaphone', label: 'megaphone', vibe: '喇叭' },
        { id: 'fluent-emoji-flat:ring-buoy', label: 'buoy', vibe: '救生圈' },
        { id: 'fluent-emoji-flat:handshake', label: 'handshake', vibe: '握手' },
        { id: 'fluent-emoji-flat:envelope', label: 'mail', vibe: '信封' },
        { id: 'fluent-emoji-flat:bellhop-bell', label: 'bellhop', vibe: '服务铃' },
        { id: 'fluent-emoji-flat:raising-hands', label: 'hands', vibe: '举手' },
      ],
      qc: [
        { id: 'fluent-emoji-flat:shield', label: 'shield', vibe: '盾牌' },
        { id: 'fluent-emoji-flat:clipboard', label: 'clipboard', vibe: '板夹' },
        { id: 'fluent-emoji-flat:check-mark-button', label: 'check', vibe: '通过' },
        { id: 'fluent-emoji-flat:magnifying-glass-tilted-left', label: 'search', vibe: '放大镜' },
        { id: 'fluent-emoji-flat:eye', label: 'eye', vibe: '眼睛' },
        { id: 'fluent-emoji-flat:balance-scale', label: 'scale', vibe: '天平' },
        { id: 'fluent-emoji-flat:bug', label: 'bug', vibe: '虫子' },
        { id: 'fluent-emoji-flat:warning', label: 'warning', vibe: '警告' },
        { id: 'fluent-emoji-flat:detective', label: 'detective', vibe: '侦探' },
        { id: 'fluent-emoji-flat:memo', label: 'memo', vibe: '备忘审' },
        { id: 'fluent-emoji-flat:white-check-mark', label: 'white-check', vibe: '白勾' },
        { id: 'fluent-emoji-flat:high-voltage', label: 'voltage', vibe: '高压注意' },
      ],
    },
  },
  {
    id: 'icon-park-multi',
    name: 'IconPark 多彩',
    vibe: '字节双色/多彩，国内产品常见，蓝橙撞色活泼',
    tags: ['多彩', '国内产品', '双色'],
    kind: 'multicolor',
    samples: [
      'icon-park:robot',
      'icon-park:building-one',
      'icon-park:degree-hat',
      'icon-park:protect',
    ],
    slots: {
      employees: [
        { id: 'icon-park:robot', label: 'robot', vibe: '机器人' },
        { id: 'icon-park:robot-one', label: 'robot-one', vibe: '机器人2' },
        { id: 'icon-park:ghost', label: 'ghost', vibe: '幽灵' },
        { id: 'icon-park:magic', label: 'magic', vibe: '魔法' },
        { id: 'icon-park:magic-wand', label: 'wand', vibe: '魔杖' },
        { id: 'icon-park:brain', label: 'brain', vibe: '大脑' },
        { id: 'icon-park:chip', label: 'chip', vibe: '芯片' },
        { id: 'icon-park:puzzle', label: 'puzzle', vibe: '拼图' },
        { id: 'icon-park:emotion-happy', label: 'happy', vibe: '开心' },
        { id: 'icon-park:lollipop', label: 'lollipop', vibe: '棒棒糖' },
        { id: 'icon-park:smart-optimization', label: 'smart', vibe: '智能' },
        { id: 'icon-park:user-business', label: 'biz', vibe: '商务人' },
      ],
      office: [
        { id: 'icon-park:building-one', label: 'building', vibe: '大楼' },
        { id: 'icon-park:building-two', label: 'building-2', vibe: '双楼' },
        { id: 'icon-park:city', label: 'city', vibe: '城市' },
        { id: 'icon-park:home', label: 'home', vibe: '家' },
        { id: 'icon-park:coffee', label: 'coffee', vibe: '咖啡' },
        { id: 'icon-park:sofa', label: 'sofa', vibe: '沙发' },
        { id: 'icon-park:desk', label: 'desk', vibe: '工位' },
        { id: 'icon-park:briefcase', label: 'briefcase', vibe: '公文包' },
        { id: 'icon-park:calendar', label: 'calendar', vibe: '日历' },
        { id: 'icon-park:chart-line', label: 'chart', vibe: '折线' },
        { id: 'icon-park:newspaper-folding', label: 'news', vibe: '报纸' },
        { id: 'icon-park:shop', label: 'shop', vibe: '店铺' },
      ],
      training: [
        { id: 'icon-park:degree-hat', label: 'hat', vibe: '学士帽' },
        { id: 'icon-park:book-open', label: 'book', vibe: '开卷' },
        { id: 'icon-park:notebook', label: 'notebook', vibe: '笔记' },
        { id: 'icon-park:idea', label: 'idea', vibe: '点子' },
        { id: 'icon-park:rocket', label: 'rocket', vibe: '火箭' },
        { id: 'icon-park:trophy', label: 'trophy', vibe: '奖杯' },
        { id: 'icon-park:medal-one', label: 'medal', vibe: '奖牌' },
        { id: 'icon-park:target', label: 'target', vibe: '靶心' },
        { id: 'icon-park:experiment', label: 'lab', vibe: '实验' },
        { id: 'icon-park:game', label: 'game', vibe: '闯关' },
        { id: 'icon-park:fireworks', label: 'fireworks', vibe: '烟花' },
        { id: 'icon-park:light-house', label: 'lighthouse', vibe: '灯塔' },
      ],
      org: [
        { id: 'icon-park:tree-diagram', label: 'tree', vibe: '组织树' },
        { id: 'icon-park:people', label: 'people', vibe: '人群' },
        { id: 'icon-park:every-user', label: 'everyone', vibe: '全员' },
        { id: 'icon-park:id-card', label: 'id', vibe: '工牌' },
        { id: 'icon-park:key', label: 'key', vibe: '钥匙' },
        { id: 'icon-park:crown', label: 'crown', vibe: '皇冠' },
        { id: 'icon-park:permissions', label: 'perms', vibe: '权限' },
        { id: 'icon-park:setting-two', label: 'settings', vibe: '设置' },
        { id: 'icon-park:connection-point', label: 'network', vibe: '节点' },
        { id: 'icon-park:category-management', label: 'category', vibe: '分类' },
        { id: 'icon-park:appointment', label: 'appoint', vibe: '任命' },
        { id: 'icon-park:badge', label: 'badge', vibe: '徽章' },
      ],
      guide: [
        { id: 'icon-park:compass', label: 'compass', vibe: '指南针' },
        { id: 'icon-park:map-draw', label: 'map', vibe: '地图' },
        { id: 'icon-park:rocket', label: 'rocket', vibe: '起飞' },
        { id: 'icon-park:gift', label: 'gift', vibe: '礼物' },
        { id: 'icon-park:celebration', label: 'party', vibe: '庆祝' },
        { id: 'icon-park:flag', label: 'flag', vibe: '旗帜' },
        { id: 'icon-park:guide-board', label: 'board', vibe: '路牌' },
        { id: 'icon-park:balloon', label: 'balloon', vibe: '气球' },
        { id: 'icon-park:star', label: 'star', vibe: '星星' },
        { id: 'icon-park:click', label: 'click', vibe: '点击' },
        { id: 'icon-park:hand-up', label: 'hand', vibe: '举手' },
        { id: 'icon-park:check-one', label: 'check', vibe: '完成' },
      ],
      workspace: [
        { id: 'icon-park:workbench', label: 'workbench', vibe: '工作台' },
        { id: 'icon-park:application', label: 'app', vibe: '应用' },
        { id: 'icon-park:all-application', label: 'all-app', vibe: '全部应用' },
        { id: 'icon-park:pages', label: 'pages', vibe: '页面' },
        { id: 'icon-park:laptop', label: 'laptop', vibe: '笔记本' },
        { id: 'icon-park:monitor', label: 'monitor', vibe: '显示器' },
        { id: 'icon-park:toolkit', label: 'toolkit', vibe: '工具包' },
        { id: 'icon-park:layers', label: 'layers', vibe: '图层' },
        { id: 'icon-park:dashboard', label: 'dashboard', vibe: '仪表盘' },
        { id: 'icon-park:data-sheet', label: 'sheet', vibe: '数据表' },
        { id: 'icon-park:terminal', label: 'terminal', vibe: '终端' },
        { id: 'icon-park:api', label: 'api', vibe: '接口台' },
      ],
      cs: [
        { id: 'icon-park:headset', label: 'headset', vibe: '耳麦' },
        { id: 'icon-park:headset-one', label: 'headset-1', vibe: '客服耳麦' },
        { id: 'icon-park:message', label: 'message', vibe: '消息' },
        { id: 'icon-park:comment', label: 'comment', vibe: '评论' },
        { id: 'icon-park:phone-call', label: 'phone', vibe: '来电' },
        { id: 'icon-park:like', label: 'like', vibe: '点赞' },
        { id: 'icon-park:emotion-happy', label: 'happy', vibe: '微笑' },
        { id: 'icon-park:communication', label: 'comm', vibe: '沟通' },
        { id: 'icon-park:customer', label: 'customer', vibe: '客户' },
        { id: 'icon-park:online-meeting', label: 'meeting', vibe: '在线会议' },
        { id: 'icon-park:help', label: 'help', vibe: '求助' },
        { id: 'icon-park:mail', label: 'mail', vibe: '邮件' },
      ],
      qc: [
        { id: 'icon-park:protect', label: 'protect', vibe: '保护' },
        { id: 'icon-park:check-one', label: 'check', vibe: '通过' },
        { id: 'icon-park:audit', label: 'audit', vibe: '审计' },
        { id: 'icon-park:inspection', label: 'inspect', vibe: '巡检' },
        { id: 'icon-park:file-quality', label: 'quality', vibe: '质量文件' },
        { id: 'icon-park:search', label: 'search', vibe: '搜索' },
        { id: 'icon-park:preview-open', label: 'preview', vibe: '预览' },
        { id: 'icon-park:balance-two', label: 'balance', vibe: '天平' },
        { id: 'icon-park:bug', label: 'bug', vibe: '抓虫' },
        { id: 'icon-park:attention', label: 'attention', vibe: '注意' },
        { id: 'icon-park:stamp', label: 'stamp', vibe: '盖章' },
        { id: 'icon-park:list-view', label: 'list', vibe: '列表' },
      ],
    },
  },
];

const STYLE_KEY = 'nav-icon-style-v3-color';
const PICKS_KEY = 'nav-icon-picks-v3-color';

type Picks = Partial<Record<SlotId, string>>;

function loadStyle(): StyleId | null {
  const v = localStorage.getItem(STYLE_KEY);
  return STYLES.some((s) => s.id === v) ? (v as StyleId) : null;
}

function loadPicks(): Picks {
  try {
    return JSON.parse(localStorage.getItem(PICKS_KEY) || '{}');
  } catch {
    return {};
  }
}

function SoftTile({
  icon,
  tile,
  size = 36,
  glyph = 18,
}: {
  icon: string;
  tile: 'neo' | 'glass' | 'bubble';
  size?: number;
  glyph?: number;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center text-white shrink-0',
        tile === 'bubble' ? 'rounded-full' : 'rounded-[10px]',
        tile === 'neo' &&
          'bg-gradient-to-br from-sky-300 via-blue-500 to-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(15,60,160,0.25),0_3px_8px_rgba(37,99,235,0.28)]',
        tile === 'glass' &&
          'bg-gradient-to-br from-sky-200/90 via-blue-400/85 to-blue-600/90 border border-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_2px_10px_rgba(59,130,246,0.22)] backdrop-blur-sm',
        tile === 'bubble' &&
          'bg-gradient-to-br from-sky-200 via-blue-400 to-indigo-600 shadow-[inset_0_2px_3px_rgba(255,255,255,0.55),inset_0_-2px_4px_rgba(30,64,175,0.35),0_4px_10px_rgba(37,99,235,0.3)]',
      )}
      style={{ width: size, height: size }}
    >
      <Icon icon={icon} width={glyph} height={glyph} className="text-white" />
    </span>
  );
}

function StylePreviewIcon({ style, icon }: { style: StyleDef; icon: string }) {
  if (style.kind === 'soft-tile' && style.tile) {
    return <SoftTile icon={icon} tile={style.tile} size={36} glyph={18} />;
  }
  return <Icon icon={icon} width={28} height={28} />;
}

export const NavIconCatalog: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState<'style' | 'icons'>(() => (loadStyle() ? 'icons' : 'style'));
  const [styleId, setStyleId] = useState<StyleId | null>(() => loadStyle());
  const [picks, setPicks] = useState<Picks>(() => loadPicks());
  const [copied, setCopied] = useState(false);

  const style = STYLES.find((s) => s.id === styleId) || null;

  useEffect(() => {
    if (styleId) localStorage.setItem(STYLE_KEY, styleId);
  }, [styleId]);

  const summary = useMemo(() => {
    if (!style) return '尚未选择风格';
    const lines = [
      `风格: ${style.name} (${style.id})`,
      ...SLOT_META.map((slot) => {
        const id = picks[slot.id] || style.slots[slot.id][0]?.id || '-';
        return `${slot.label}: ${id}`;
      }),
    ];
    return lines.join('\n');
  }, [style, picks]);

  const chooseStyle = (id: StyleId) => {
    setStyleId(id);
    setPicks({});
    localStorage.setItem(PICKS_KEY, '{}');
    setStep('icons');
  };

  const selectIcon = (slot: SlotId, iconId: string) => {
    setPicks((prev) => {
      const next = { ...prev, [slot]: iconId };
      localStorage.setItem(PICKS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-neutral-50 overflow-y-auto font-sans text-neutral-800">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur px-5 py-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-neutral-400 mb-1">
            <button
              type="button"
              onClick={() => setStep('style')}
              className={cn('cursor-pointer', step === 'style' ? 'text-neutral-900 font-semibold' : 'hover:text-neutral-700')}
            >
              1 选风格
            </button>
            <span>/</span>
            <button
              type="button"
              disabled={!style}
              onClick={() => style && setStep('icons')}
              className={cn(
                'cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                step === 'icons' ? 'text-neutral-900 font-semibold' : 'hover:text-neutral-700',
              )}
            >
              2 选图标
            </button>
          </div>
          <h1 className="text-[15px] font-semibold tracking-tight">
            {step === 'style' ? '先挑：多彩 / 蓝渐变 / 轻拟物' : `在「${style?.name}」里挑具体图标`}
          </h1>
          <p className="text-[12px] text-neutral-500 mt-0.5">
            {step === 'style'
              ? '前三档是蓝渐变轻拟物底 + 白字形；后面是真正的多彩图标库。'
              : '点选后复制清单回聊天即可落地到侧栏。'}
          </p>
        </div>

        {step === 'icons' && (
          <button
            type="button"
            onClick={copySummary}
            className="h-8 px-3 rounded-lg bg-neutral-900 text-white text-[12px] font-medium cursor-pointer hover:bg-neutral-800"
          >
            {copied ? '已复制' : '复制选中清单'}
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-lg border border-neutral-200 text-[12px] font-medium cursor-pointer hover:bg-neutral-100"
          >
            关闭
          </button>
        )}
      </div>

      <div className="max-w-[1100px] mx-auto px-5 py-6 space-y-6">
        {step === 'style' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STYLES.map((s) => {
              const active = styleId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => chooseStyle(s.id)}
                  className={cn(
                    'text-left rounded-2xl border p-4 cursor-pointer transition',
                    active
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-neutral-200 bg-white hover:border-neutral-300',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-neutral-900">{s.name}</div>
                      <div className="text-[12px] mt-1 text-neutral-500">{s.vibe}</div>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {s.tags.map((t) => (
                          <span
                            key={t}
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-md',
                              t === '推荐'
                                ? 'bg-blue-600 text-white'
                                : 'bg-sky-50 text-blue-700 border border-sky-100',
                            )}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl shrink-0 bg-neutral-50 border border-neutral-100">
                      {s.samples.map((icon) => (
                        <span key={icon} className="h-10 w-10 rounded-lg flex items-center justify-center bg-white border border-neutral-100">
                          <StylePreviewIcon style={s} icon={icon} />
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {step === 'icons' && style && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('style')}
                className="text-[12px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                ← 换风格
              </button>
              <span className="text-[12px] text-neutral-400">当前：{style.name}</span>
            </div>

            <pre className="text-[12px] leading-relaxed bg-white border border-neutral-200 rounded-xl p-4 text-neutral-700 whitespace-pre-wrap">
              {summary}
            </pre>

            {SLOT_META.map((slot) => {
              const options = style.slots[slot.id];
              const selected = picks[slot.id] || options[0]?.id;
              return (
                <section key={slot.id} className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-[13px] font-semibold">{slot.label}</h2>
                    <span className="text-[11px] text-neutral-400 truncate">{selected}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {options.map((opt) => {
                      const active = selected === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => selectIcon(slot.id, opt.id)}
                          className={cn(
                            'flex flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left cursor-pointer transition',
                            active
                              ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                              : 'border-neutral-200 bg-white hover:border-neutral-300',
                          )}
                        >
                          {style.kind === 'soft-tile' && style.tile ? (
                            <SoftTile icon={opt.id} tile={style.tile} size={34} glyph={17} />
                          ) : (
                            <Icon icon={opt.id} width={26} height={26} />
                          )}
                          <div className="min-w-0 w-full">
                            <div className="text-[12px] font-semibold truncate text-neutral-800">{opt.label}</div>
                            <div className="text-[10px] mt-0.5 truncate text-neutral-500">{opt.vibe}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
