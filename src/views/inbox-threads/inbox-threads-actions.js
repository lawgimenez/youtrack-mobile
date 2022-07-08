/* @flow */

import usage from 'components/usage/usage';
import {ANALYTICS_NOTIFICATIONS_THREADS_PAGE} from 'components/analytics/analytics-ids';
import {flushStoragePart, getStorageState, InboxThreadsCache} from 'components/storage/storage';
import {folderIdAllKey} from './inbox-threads-helper';
import {i18n} from 'components/i18n/i18n';
import {notify, notifyError} from 'components/notification/notification';
import {SET_PROGRESS} from '../../actions/action-types';
import {setError, setNotifications, toggleProgress} from './inbox-threads-reducers';
import {until} from 'util/util';

import * as types from '../../actions/action-types';
import type Api from 'components/api/api';
import type {AppState} from '../../reducers';
import type {CustomError} from 'flow/Error';
import type {InboxThread, InboxThreadMessage} from 'flow/Inbox';

type ApiGetter = () => Api;
type StateGetter = () => AppState;


const MAX_CACHED_THREADS: number = 10;
const DEFAULT_CACHE_DATA = {
  lastVisited: 0,
  unreadOnly: false,
};

const getCache = (): InboxThreadsCache => getStorageState().inboxThreadsCache || DEFAULT_CACHE_DATA;
const isOnline = (state: AppState): boolean => state?.app?.networkState?.isConnected === true;

const updateCache = (data: Object) => {
  flushStoragePart({
    inboxThreadsCache: {
      ...DEFAULT_CACHE_DATA,
      ...getCache(),
      ...data,
    },
  });
};

const loadThreadsFromCache = (folderId: string = folderIdAllKey): ((dispatch: (any) => any) => Promise<void>) => {
  return async (dispatch: (any) => any) => {
    const inboxThreadsCache: InboxThreadsCache = getCache();
    if (inboxThreadsCache[folderId]) {
      dispatch(setNotifications({threads: inboxThreadsCache[folderId], reset: true, folderId}));
    }
  };
};

const lastVisitedTabIndex = (index?: number): number => {
  if (typeof index === 'number') {
    updateCache({lastVisited: index});
  }
  return getCache().lastVisited;
};

const toggleUnreadOnly = (): void => {
  const inboxThreadsCache: InboxThreadsCache = getCache();
  updateCache({unreadOnly: !inboxThreadsCache.unreadOnly});
};

const isUnreadOnly = (): boolean => getCache().unreadOnly;

const updateThreadsCache = (threads: InboxThread[] = [], folderId: string = folderIdAllKey): ((
  dispatch: (any) => any,
  getState: () => any,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: StateGetter, getApi: ApiGetter) => {
    if (threads.length) {
      updateCache({[folderId]: threads.slice(0, MAX_CACHED_THREADS)});
    }
  };
};

const setGlobalInProgress = (isInProgress: boolean) => ({
  type: SET_PROGRESS,
  isInProgress,
});

const loadInboxThreads = (folderId?: string | null, end?: number | null): ((
  dispatch: (any) => any,
  getState: () => any,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: StateGetter, getApi: ApiGetter) => {
    const isLoadingFirstTime: boolean = typeof end === 'undefined';
    if (isLoadingFirstTime) {
      usage.trackEvent(ANALYTICS_NOTIFICATIONS_THREADS_PAGE, 'Load inbox threads');
      dispatch(loadThreadsFromCache(folderId));
    }
    if (!isOnline(getState())) {
      return;
    }

    dispatch(setError({error: null}));
    dispatch(toggleProgress({inProgress: true}));
    if (end === null) {
      dispatch(setGlobalInProgress(true));
    }
    const [error, threads]: [?CustomError, Array<InboxThread>] = await until(
      getApi().inbox.getThreads(folderId, end, isUnreadOnly())
    );
    dispatch(toggleProgress({inProgress: false}));
    if (end === null) {
      dispatch(setGlobalInProgress(false));
    }

    if (error) {
      dispatch(setError({error}));
    } else {
      dispatch(setNotifications({
        threads,
        reset: typeof end !== 'number',
        folderId: folderId || folderIdAllKey,
      }));
      dispatch(updateThreadsCache(threads, folderId));
      if (!folderId && isLoadingFirstTime) {
        dispatch(saveAllSeen(threads[0].notified));
        dispatch({
          type: types.INBOX_THREADS_HAS_UPDATE,
          hasUpdate: false,
        });
      }
    }
  };
};

const saveAllSeen = (lastSeen: number): ((
  dispatch: (any) => any,
  getState: () => any,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState, getApi: () => Api) => {
    if (isOnline(getState())) {
      until(getApi().inbox.saveAllAsSeen(lastSeen));
    }
  };
};

const muteToggle = (id: string, muted: boolean): ((
  dispatch: (any) => any,
  getState: () => any,
  getApi: ApiGetter
) => Promise<boolean>) => {
  return async (dispatch: (any) => any, getState: StateGetter, getApi: ApiGetter) => {
    if (!isOnline(getState())) {
      return !muted;
    }
    const [error, inboxThread]: [?CustomError, Array<InboxThread>] = await until(getApi().inbox.muteToggle(id, muted));
    if (error) {
      notifyError(error);
      return !muted;
    } else {
      notify(inboxThread?.muted === true ? i18n('Thread muted') : i18n('Thread unmuted'));
      return error ? muted : inboxThread.muted;
    }
  };
};

const readMessageToggle = (messages: InboxThreadMessage[], read: boolean): ((
  dispatch: (any) => any,
  getState: () => any,
  getApi: ApiGetter
) => Promise<boolean>) => {
  return async (dispatch: (any) => any, getState: StateGetter, getApi: ApiGetter): Promise<boolean> => {
    if (!isOnline(getState())) {
      return !read;
    }
    const [error, response]: [?CustomError, { read: boolean }] = await until(
      getApi().inbox.markMessages(
        messages.map((it: InboxThreadMessage) => ({id: it.id})),
        read
      )
    );
    if (error) {
      notifyError(error);
      return !read;
    } else {
      notify(read === true ? i18n('Marked as read') : i18n('Marked as unread'));
      return error ? !read : response.read;
    }
  };
};

const markAllAsRead = (): ((
  dispatch: (any) => any,
  getState: () => any,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: StateGetter, getApi: ApiGetter): Promise<void> => {
    if (isOnline(getState())) {
      const [error]: [?CustomError, { read: boolean }] = await until(getApi().inbox.markAllAsRead());
      if (error) {
        notifyError(error);
      } else {
        notify(i18n('Marked as read'));
      }
    }
  };
};


export {
  isUnreadOnly,
  loadInboxThreads,
  loadThreadsFromCache,
  markAllAsRead,
  muteToggle,
  readMessageToggle,
  lastVisitedTabIndex,
  toggleUnreadOnly,
  updateThreadsCache,
};
