import Cookies from 'js-cookie';
import { combineActions, createAction, handleActions } from 'redux-actions';
import { detectLocale, normalizeLocale } from 'i18n';

const prefix = 'ENV';

const setExt = createAction(`${prefix}/SET_EXT`, ext => {
  Cookies.set('ext', ext);
  return { ext };
});
const setLocale = createAction(`${prefix}/SET_LOCALE`, locale => {
  const normalizedLocale = normalizeLocale(locale);
  Cookies.set('locale', normalizedLocale);
  return { locale: normalizedLocale };
});
const setUser = createAction(`${prefix}/SET_USER`, user => ({ user }));

export const actions = {
  setExt,
  setLocale,
  setUser,
};

const defaultState = {
  ext: Cookies.get('ext') || 'js',
  locale: detectLocale(Cookies.get('locale')),
  user: undefined,
};

export default handleActions({
  [combineActions(
    setExt,
    setLocale,
    setUser,
  )]: (state, { payload }) => ({
    ...state,
    ...payload,
  }),
}, defaultState);
