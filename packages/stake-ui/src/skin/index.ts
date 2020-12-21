type Skin = {
  active: string;
  ready: string;
  inactive: string;
  notReady: string;
  deactivating: string;
};

const _skin: Skin = {
  active: '#43a047',
  ready: '#3f51b5',
  notReady: '#ccc',
  inactive: 'red',
  deactivating: 'rgb(255, 121, 42)',
};

export function instance(): Skin {
  return _skin;
}
