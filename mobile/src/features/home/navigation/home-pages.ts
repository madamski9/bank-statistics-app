export const homeTabs = ['overview', 'transactions', 'merchants'] as const;

export type HomeTabKey = (typeof homeTabs)[number];
export type PageKey = HomeTabKey | 'profile';

export const pageOrder: readonly PageKey[] = [...homeTabs, 'profile'];
