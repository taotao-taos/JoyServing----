/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Relay 首页高保真静态资源（Deco MCP 导出）
 */

export const RELAY_HOME_ASSETS = {
  logo: '/assets/joy-support-logo.png',
  collapse: 'https://img14.360buyimg.com/ling/jfs/t1/457448/13/7258/863/6a340f45Fcc252b0c/02760200202d1bff.png',
  plus: 'https://img11.360buyimg.com/ling/jfs/t1/462962/4/443/2661/6a340f45Fdc3eb8eb/02760280282707a1.png',
  menuEmployees: 'https://img11.360buyimg.com/ling/jfs/t1/453807/34/13950/1329/6a340f45Ffeac3c3f/0276028028020322.png',
  menuDashboard: 'https://img12.360buyimg.com/ling/jfs/t1/455774/21/9140/914/6a3411c6F36289d1a/027603c03cf77716.png',
  menuTraining: 'https://img13.360buyimg.com/ling/jfs/t1/458844/15/8583/1228/6a3411cfF237c4310/027603c03c05a735.png',
  menuManage: 'https://img30.360buyimg.com/ling/jfs/t1/459415/18/5272/1289/6a340f45F524d0f7c/02760280282786e6.png',
  arrowDown: 'https://img13.360buyimg.com/ling/jfs/t1/457760/38/5570/352/6a2fd97aF3d482234/027601c01c566498.png',
  arrowUp: 'https://img13.360buyimg.com/ling/jfs/t1/451948/2/18650/324/6a340f45F2ea89384/027601c01cb86814.png',
  guide: 'https://img20.360buyimg.com/ling/jfs/t1/452704/6/17118/2892/6a340f45Fd296cad7/027602c02c67b1e7.png',
  workspace: 'https://img20.360buyimg.com/ling/jfs/t1/458542/31/7858/1388/6a340f45F35c9c351/02760280287b60b6.png',
  externalLink: 'https://img20.360buyimg.com/ling/jfs/t1/453506/38/13731/348/6a340f45F72db65da/027601c01c26334b.png',
  userAvatar: 'https://img14.360buyimg.com/ling/jfs/t1/455146/23/14336/4363/6a340f45F421b95f6/027602c02ca96e59.png',
  settings: 'https://img20.360buyimg.com/ling/jfs/t1/462532/19/1093/992/6a340f45F314f7ed8/027601c01c3721d5.png',
  bell: 'https://img10.360buyimg.com/ling/jfs/t1/448843/26/14963/868/6a340f45Fde42bf6a/0276020020225b43.png',
  bannerBg: 'https://img12.360buyimg.com/ling/jfs/t1/461915/2/1060/278290/6a339374F6dba9d60/02767e816e3ee7f3.png',
  bannerRight: 'https://img30.360buyimg.com/ling/jfs/t1/462866/34/620/318034/6a340f46Fc6d7e005/02762bc182277d7b.png',
  bannerArrow: 'https://img14.360buyimg.com/ling/jfs/t1/462873/25/55/311/6a339374Fc8382b38/027601c01cb5ee05.png',
  mouse: 'https://img13.360buyimg.com/ling/jfs/t1/461715/3/1704/2979/6a340f45Fed547f5e/02760500508a2eaf.png',
  search: 'https://img30.360buyimg.com/ling/jfs/t1/456732/38/9632/828/6a339374F7c7a90c2/027601c01ce2ba7c.png',
  /** 我的数字员工 — 列表空状态插图（Relay chatId=2081779015756029953） */
  employeesEmpty:
    'https://img11.360buyimg.com/ling/jfs/t1/456090/11/10593/286857/6a678768F2174c324/02762581e0ff1c84.png',
} as const;

export const RELAY_CARD_AVATARS = [
  'https://img11.360buyimg.com/ling/jfs/t1/452005/22/14994/26623/6a340f45Fe01ff6c5/02760840849c11fd.png',
  'https://img12.360buyimg.com/ling/jfs/t1/459566/15/5485/25349/6a339374Fcf63fd2f/0276084084988328.png',
  'https://img20.360buyimg.com/ling/jfs/t1/457677/39/9616/22890/6a339374F1186e8fa/027608408445cae4.png',
  'https://img11.360buyimg.com/ling/jfs/t1/450034/15/13394/26623/6a339374F6b3868f6/02760840844affa7.png',
  'https://img12.360buyimg.com/ling/jfs/t1/452465/2/17112/26950/6a340f45F6402b9b9/02760840840e75c0.png',
  'https://img12.360buyimg.com/ling/jfs/t1/462393/33/1126/22871/6a340f45F068615d4/027608408463a81a.png',
] as const;

export function relayAvatarForAgent(avatar: string, index: number): string {
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) {
    return avatar;
  }
  return RELAY_CARD_AVATARS[index % RELAY_CARD_AVATARS.length];
}
