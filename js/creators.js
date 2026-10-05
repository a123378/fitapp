// 菜單來源博主總表：每位博主一個資料檔，這裡合併。新增博主：建一個 xxx.js（格式同 viyade.js），在下面登記即可。
import { VIYADE_MENUS, VIYADE_PROFILE } from './viyade.js';
import { JIN_MENUS, JIN_PROFILE } from './jinshicheng.js';
import { RRROY_MENUS, RRROY_PROFILE } from './rrroy.js';
import { TAN_MENUS, TAN_PROFILE } from './tanchengyi.js';
import { XLGS_MENUS, XLGS_PROFILE } from './xunlianguaishou.js';
export { PART_LABELS } from './viyade.js';

export const CREATORS = {
  viyade:      { name: '維亞德', url: VIYADE_PROFILE, desc: '自然健身十年的法國人，居家 + 健身房動作教學' },
  jinshicheng: { name: '金士程', url: JIN_PROFILE,   desc: '職業健美運動員，健身房訓練日記' },
  rrroy:       { name: 'RRRoy',  url: RRROY_PROFILE, desc: '「我付錢，你上課！」每集請一位教練帶練' },
  tanchengyi:  { name: '譚成義', url: TAN_PROFILE,   desc: '自然健美冠軍；凱聖王 × 譚成義三分化、私教系列' },
  xlgs:        { name: '訓練怪獸', url: XLGS_PROFILE, desc: '「怪獸課堂」：IFBB PRO 講動作細節' }
};

export const ALL_MENUS = [
  ...VIYADE_MENUS.map((m) => ({ creator: 'viyade', ...m })),
  ...JIN_MENUS.map((m) => ({ creator: 'jinshicheng', ...m })),
  ...RRROY_MENUS.map((m) => ({ creator: 'rrroy', ...m })),
  ...TAN_MENUS.map((m) => ({ creator: 'tanchengyi', ...m })),
  ...XLGS_MENUS.map((m) => ({ creator: 'xlgs', ...m }))
];

export function creatorMenusFor(location, group) {
  return ALL_MENUS.filter((m) => m.locations.includes(location) && m.groups.includes(group));
}
