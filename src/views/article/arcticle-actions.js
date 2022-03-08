/* @flow */

import {ANALYTICS_ARTICLE_PAGE} from 'components/analytics/analytics-ids';
import {Alert, Clipboard, Share} from 'react-native';

import Router from 'components/router/router';
import {confirmDeleteArticle} from './arcticle-helper';
import {getStorageState} from 'components/storage/storage';
import {i18n} from '../../components/i18n/i18n';
import {getApi} from 'components/api/api__instance';
import {getEntityPresentation} from 'components/issue-formatter/issue-formatter';
import {hasType} from 'components/api/api__resource-types';
import {isIOSPlatform, until} from 'util/util';
import {logEvent} from 'components/log/log-helper';
import {notify} from 'components/notification/notification';
import type {ArticleState} from './article-reducers';
import {
  setActivityPage,
  setArticle,
  setArticleCommentDraft,
  setError,
  setLoading,
  setPrevArticle,
  setProcessing,
} from './article-reducers';
import {cacheUserLastVisitedArticle} from 'actions/app-actions';
import type {ShowActionSheetWithOptions} from 'components/action-sheet/action-sheet';
import {showActions, showActionSheet} from 'components/action-sheet/action-sheet';

import type ActionSheet from '@expo/react-native-action-sheet';
import type {ActionSheetOption} from 'components/action-sheet/action-sheet';
import type Api from 'components/api/api';
import type {Activity} from 'flow/Activity';
import type {AppState} from '../../reducers';
import type {Article, ArticleDraft} from 'flow/Article';
import type {Attachment, IssueComment} from 'flow/CustomFields';

type ApiGetter = () => Api;


const clearArticle = (): ((dispatch: (any) => any) => Promise<any>) => async (dispatch: (any) => any) => dispatch(setArticle(null));

const loadArticleFromCache = (article: Article): ((dispatch: (any) => any) => Promise<void>) => {
  return async (dispatch: (any) => any) => {
    const cachedArticleLastVisited: {
      article?: Article,
      activities?: Array<Activity>
    } | null = getStorageState().articleLastVisited;
    if (!cachedArticleLastVisited || !cachedArticleLastVisited.article || !article) {
      return;
    }
    if (article?.id === cachedArticleLastVisited.article?.id ||
      article?.idReadable === cachedArticleLastVisited.article?.idReadable
    ) {
      dispatch(setArticle(cachedArticleLastVisited.article));
    }
  };
};

const loadArticle = (articleId: string, reset: boolean = true): ((
  dispatch: (any) => any,
  getState: () => AppState,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState, getApi: ApiGetter) => {
    const api: Api = getApi();

    logEvent({message: 'Loading article'});

    dispatch(setLoading(true));
    if (reset) {
      dispatch(setArticle(null));
    }
    const [error, article] = await until(api.articles.getArticle(articleId));
    dispatch(setLoading(false));

    if (error) {
      dispatch(setError(error));
      logEvent({message: 'Failed to load articles', isError: true});
    } else {
      logEvent({message: 'Article loaded'});
      dispatch(setArticle(article));

      cacheUserLastVisitedArticle(article);
    }
  };
};

const loadCachedActivitiesPage = (): ((dispatch: (any) => any) => Promise<void>) => {
  return async (dispatch: (any) => any) => {
    const cachedArticleLastVisited: {
      article?: Article,
      activities?: Array<Activity>
    } | null = getStorageState().articleLastVisited;
    if (cachedArticleLastVisited && cachedArticleLastVisited.activities) {
      dispatch(setActivityPage(cachedArticleLastVisited.activities));
    }
  };
};

const loadActivitiesPage = (reset: boolean = true): ((
  dispatch: (any) => any,
  getState: () => AppState,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState, getApi: ApiGetter) => {
    const api: Api = getApi();
    const article: Article = getState().article.article;

    dispatch(setLoading(true));
    if (reset) {
      dispatch(setActivityPage(null));
    }
    const [error, activityPage] = await until(api.articles.getActivitiesPage(article.id));
    dispatch(setLoading(false));

    if (error) {
      dispatch(setError(error));
      logEvent({message: 'Failed to load articles activities', isError: true});
    } else {
      dispatch(setActivityPage(activityPage.activities));
      cacheUserLastVisitedArticle(article, activityPage.activities);
      logEvent({message: 'Articles activity page loaded'});
    }
  };
};

const showArticleActions = (
  actionSheet: ActionSheet,
  canUpdate: boolean,
  canDelete: boolean,
  renderBreadCrumbs: Function,
  canStar: boolean,
  hasStar: boolean,
  isTablet: boolean,
): ((
  dispatch: (any) => any,
  getState: () => AppState,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState, getApi: ApiGetter) => {
    const api: Api = getApi();
    const {article} = getState().article;
    const url: string = `${api.config.backendUrl}/articles/${article.idReadable}`;
    logEvent({message: 'Show article actions', analyticsId: ANALYTICS_ARTICLE_PAGE});
    const actions = [
      {
        title: 'Share…',
        execute: () => {
          const msg: string = 'Share article URL';
          if (isIOSPlatform()) {
            Share.share({url});
          } else {
            Share.share({title: article.summary, message: url}, {dialogTitle: msg});
          }
          logEvent({message: msg, analyticsId: ANALYTICS_ARTICLE_PAGE});
        },
      },
      {
        title: 'Copy article URL',
        execute: () => {
          Clipboard.setString(url);
          logEvent({message: 'Copy article URL', analyticsId: ANALYTICS_ARTICLE_PAGE});
        },
      },
    ];

    if (canStar) {
      const title: string = hasStar ? 'Unsubscribe from updates' : 'Subscribe for updates';
      actions.push({
        title: title,
        execute: async () => {
          logEvent({
            message: `Article: ${title}`,
            analyticsId: ANALYTICS_ARTICLE_PAGE,
          });
          notify(
            hasStar
              ? 'You\'ve been unsubscribed from updates'
              : 'You\'ve been subscribed for updates'
          );
          dispatch(toggleFavorite());
        },
      });
    }

    if (canUpdate) {
      actions.push({
        title: 'Edit',
        execute: async () => {
          logEvent({
            message: 'Edit article',
            analyticsId: ANALYTICS_ARTICLE_PAGE,
          });

          setProcessing(true);
          const articleDrafts: Article | null = await getUnpublishedArticleDraft(api, article);
          setProcessing(false);
          Router.ArticleCreate({
            originalArticleId: article.id,
            articleDraft: Array.isArray(articleDrafts) ? articleDrafts[0] : articleDrafts,
            breadCrumbs: renderBreadCrumbs(),
            isTablet,
          });
        },
      });
    }

    if (canDelete) {
      actions.push({
        title: 'Delete',
        execute: async () => {
          logEvent({
            message: 'Delete article',
            analyticsId: ANALYTICS_ARTICLE_PAGE,
          });

          confirmDeleteArticle()
            .then(() => dispatch(deleteArticle(article, () => Router.KnowledgeBase())))
            .catch(() => {});
        },
      });
    }

    actions.push({title: 'Cancel'});

    const selectedAction = await showActions(actions, actionSheet);

    if (selectedAction && selectedAction.execute) {
      selectedAction.execute();
    }
  };
};

const getUnpublishedArticleDraft = async (api: Api, article: Article): Promise<ArticleDraft | null> => {
  let articleDraft: ArticleDraft;

  // eslint-disable-next-line no-unused-vars
  const [error, articleDrafts] = await until(api.articles.getArticleDrafts(article.id));

  if (articleDrafts && articleDrafts[0]) {
    articleDraft = articleDrafts[0];
  } else {
    const [err, draft] = await until(api.articles.createArticleDraft(article.id));
    if (err) {
      logEvent({message: `Failed to create article draft`, isError: true});
    }
    articleDraft = {
      attachments: article.attachments,
      summary: article.summary,
      content: article.content,
      project: article.project,
      visibility: article.visibility,
      ...(err ? {} : draft),
    };
  }

  return articleDraft;
};

export const createArticleDraft = async (
  api: Api,
  article: Article,
  createSubArticle: boolean = false
): Promise<ArticleDraft | null> => {
  let articleDraft: Article | null = null;

  const [createDraftError, draft] = await until(
    createSubArticle
      ? api.articles.createSubArticleDraft(article)
      : api.articles.createArticleDraft(article.id)
  );
  if (createDraftError) {
    logEvent({message: `Failed to create a draft for the article ${article.idReadable}`, isError: true});
  } else {
    articleDraft = draft;
  }

  return articleDraft;
};

const deleteArticle = (article: Article, onAfterDelete?: () => any): ((
  dispatch: (any) => any,
  getState: () => AppState,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState, getApi: ApiGetter) => {
    const api: Api = getApi();
    const isDraft: boolean = hasType.articleDraft(article);
    logEvent({message: 'Delete article', analyticsId: ANALYTICS_ARTICLE_PAGE});
    dispatch(setProcessing(true));
    const [error] = await until(
      isDraft
        ? api.articles.deleteDraft(article.id)
        : api.articles.deleteArticle(article.id)
    );
    dispatch(setProcessing(false));

    if (error) {
      const errorMsg: string = 'Failed to delete article';
      logEvent({message: errorMsg, isError: true});
      notify(errorMsg, error);
    } else if (onAfterDelete) {
      onAfterDelete();
    }
  };
};

const setPreviousArticle = (): ((dispatch: (any) => any, getState: () => AppState) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState) => {
    const articleState: ArticleState = getState().article;
    dispatch(setPrevArticle(articleState));
  };
};

const getArticleCommentDraft = (): ((dispatch: (any) => any, getState: () => AppState) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState) => {
    const api: Api = getApi();
    const article: Article = getState().article.article;

    const [error, draftComment] = await until(api.articles.getCommentDraft(article.id));
    if (!error && draftComment) {
      dispatch(setArticleCommentDraft(draftComment));
    }
  };
};

const updateArticleCommentDraft = (comment: IssueComment): ((dispatch: (any) => any, getState: () => AppState) => Promise<null>) => {
  return async (dispatch: (any) => any, getState: () => AppState) => {
    const api: Api = getApi();
    const article: Article = getState().article.article;
    const [error, updatedCommentDraft] = await until(api.articles.updateCommentDraft(article.id, comment));
    if (error) {
      notify(i18n('Failed to update a comment draft'), error);
    } else {
      dispatch(setArticleCommentDraft(updatedCommentDraft));
    }
    return error ? null : updatedCommentDraft;
  };
};

const submitArticleCommentDraft = (commentDraft: IssueComment): ((dispatch: (any) => any, getState: () => AppState) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState): Promise<void> => {
    const api: Api = getApi();
    const {article} = getState().article;
    logEvent({message: 'Submit article draft', analyticsId: ANALYTICS_ARTICLE_PAGE});
    await dispatch(updateArticleCommentDraft(commentDraft));
    const [error] = await until(api.articles.submitCommentDraft(article.id, commentDraft.id));
    if (error) {
      notify(i18n('Failed to update a comment draft'), error);
    } else {
      logEvent({message: 'Comment added', analyticsId: ANALYTICS_ARTICLE_PAGE});
      dispatch(setArticleCommentDraft(null));
    }
  };
};

const updateArticleComment = (comment: IssueComment): ((dispatch: (any) => any, getState: () => AppState) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState) => {
    const api: Api = getApi();
    const article: Article = getState().article.article;
    logEvent({message: 'Update article comment', analyticsId: ANALYTICS_ARTICLE_PAGE});
    const [error] = await until(api.articles.updateComment(article.id, comment));
    if (error) {
      notify(i18n('Failed to update a comment'), error);
    } else {
      logEvent({message: 'Comment updated', analyticsId: ANALYTICS_ARTICLE_PAGE});
      dispatch(loadActivitiesPage());
    }
  };
};

const deleteArticleComment = (commentId: string): ((dispatch: (any) => any, getState: () => AppState) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState) => {
    const api: Api = getApi();
    const article: Article = getState().article.article;
    logEvent({message: 'Delete article comment', analyticsId: ANALYTICS_ARTICLE_PAGE});
    try {
      await new Promise((resolve: Function, reject: Function) => {
        Alert.alert(
          'Are you sure you want to delete this comment?',
          null,
          [
            {text: 'Cancel', style: 'cancel', onPress: reject},
            {text: 'Delete', onPress: resolve},
          ],
          {cancelable: true}
        );
      });

      const [error] = await until(api.articles.deleteComment(article.id, commentId));
      if (error) {
        notify(i18n('Failed to delete a comment'), error);
      } else {
        dispatch(loadActivitiesPage());
      }
    } catch (error) {
      //
    }
  };
};

const showArticleCommentActions = (
  showActionSheetWithOptions: ShowActionSheetWithOptions,
  comment: IssueComment,
  activityId: string,
  canDeleteComment: boolean
): ((
  dispatch: (any) => any,
  getState: () => AppState,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState, getApi: ApiGetter) => {
    const api: Api = getApi();
    const {article} = getState().article;
    logEvent({message: 'Show article\'s comment actions', analyticsId: ANALYTICS_ARTICLE_PAGE});
    const url: string = `${api.config.backendUrl}/articles/${article.idReadable}#comment${activityId}`;
    const commentText = comment.text;
    const options: Array<ActionSheetOption> = [
      {
        title: 'Share…',
        execute: function (): string {
          const params: Object = {};
          const isIOS: boolean = isIOSPlatform();

          if (isIOS) {
            params.url = url;
          } else {
            params.title = commentText;
            params.message = url;
          }
          Share.share(params, {dialogTitle: 'Share URL'});
          logEvent({message: 'Share article', analyticsId: ANALYTICS_ARTICLE_PAGE});
          return this.title;
        },
      },
      {
        title: 'Copy URL',
        execute: function (): string {
          logEvent({message: 'Copy article URL', analyticsId: ANALYTICS_ARTICLE_PAGE});
          Clipboard.setString(url);
          return this.title;
        },
      },
    ];

    if (canDeleteComment) {
      options.push({
        title: 'Delete',
        execute: function () {
          logEvent({message: 'Delete article', analyticsId: ANALYTICS_ARTICLE_PAGE});
          dispatch(deleteArticleComment(comment.id));
          return this.title;
        },
      });
    }

    options.push({title: 'Cancel'});

    const selectedAction = await showActionSheet(
      options,
      showActionSheetWithOptions,
      comment?.author ? getEntityPresentation(comment.author) : null,
      commentText.length > 155 ? `${commentText.substr(0, 153)}…` : commentText
    );
    if (selectedAction && selectedAction.execute) {
      const actionTitle: string = selectedAction.execute();
      logEvent({message: `comment ${actionTitle}`, analyticsId: ANALYTICS_ARTICLE_PAGE});
    }
  };
};

const getMentions = (query: string): ((
  dispatch: (any) => any,
  getState: () => AppState,
  getApi: ApiGetter
) => Promise<null> | Promise<any>) => {
  return async (dispatch: (any) => any, getState: () => AppState, getApi: ApiGetter) => {
    const api: Api = getApi();
    const article: Article = getState().article.article;
    logEvent({message: 'Get article mentions', analyticsId: ANALYTICS_ARTICLE_PAGE});
    const [error, mentions] = await until(
      api.mentions.getMentions(query, {containers: [{$type: article.$type, id: article.id}]}));
    if (error) {
      notify(i18n('Failed to load user mentions'), error);
      return null;
    }
    return mentions;
  };
};

const toggleFavorite = (): ((
  dispatch: (any) => any,
  getState: () => AppState,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState, getApi: ApiGetter) => {
    const api: Api = getApi();
    const {article} = getState().article;
    logEvent({message: 'Toggle article star', analyticsId: ANALYTICS_ARTICLE_PAGE});
    const prev: boolean = article.hasStar;
    dispatch(setArticle({...article, hasStar: !prev}));

    const [error] = await until(api.articles.updateArticle(article.id, {hasStar: !prev}));
    if (error) {
      notify(i18n('Failed to update the article'), error);
      dispatch(setArticle({...article, hasStar: prev}));
    }
  };
};

const deleteAttachment = (attachmentId: string): ((
  dispatch: (any) => any,
  getState: () => AppState,
  getApi: ApiGetter
) => Promise<void>) => {
  return async (dispatch: (any) => any, getState: () => AppState, getApi: ApiGetter) => {
    const api: Api = getApi();
    const {article} = getState().article;
    logEvent({message: 'Delete article attachment', analyticsId: ANALYTICS_ARTICLE_PAGE});
    const [error] = await until(api.articles.deleteAttachment(article.id, attachmentId));
    if (error) {
      const message = 'Failed to delete attachment';
      notify(message, error);
      logEvent({message: message, isError: true});
    } else {
      logEvent({message: 'Attachment deleted', analyticsId: ANALYTICS_ARTICLE_PAGE});
      dispatch(setArticle(
        {
          ...article, attachments: article.attachments.filter((it: Attachment) => it.id !== attachmentId),
        }));
    }
  };
};

const createSubArticleDraft = (): ((
  dispatch: (any) => any,
  getState: () => AppState,
  getApi: ApiGetter
) => Promise<ArticleDraft | null>) => {
  return async (dispatch: (any) => any, getState: () => AppState, getApi: ApiGetter) => {
    const api: Api = getApi();
    const {article} = getState().article;

    logEvent({message: 'Create sub-article', analyticsId: ANALYTICS_ARTICLE_PAGE});
    return await createArticleDraft(api, article, true);
  };
};

const onCheckboxUpdate = (articleContent: string): Function =>
  async (dispatch: (any) => any, getState: () => AppState, getApi: ApiGetter) => {
    const api: Api = getApi();
    const {article} = getState().article;
    const updatedArticle: Article = {...article, content: articleContent};
    dispatch(setArticle({...article, content: articleContent}));
    logEvent({message: 'Checkbox updated', analyticsId: ANALYTICS_ARTICLE_PAGE});
    const [error] = await until(api.articles.updateArticle(
      article.id, {content: articleContent}, 'content')
    );
    if (error) {
      notify(i18n('Failed to update a checkbox'), error);
      await dispatch(setArticle(article));
    } else {
      cacheUserLastVisitedArticle(updatedArticle);
    }
  };


export {
  clearArticle,
  createSubArticleDraft,
  loadArticle,
  loadActivitiesPage,
  loadCachedActivitiesPage,
  loadArticleFromCache,
  showArticleActions,
  setPreviousArticle,
  deleteArticle,

  getArticleCommentDraft,
  updateArticleCommentDraft,
  submitArticleCommentDraft,

  updateArticleComment,

  showArticleCommentActions,
  deleteArticleComment,

  getMentions,
  toggleFavorite,

  deleteAttachment,

  onCheckboxUpdate,
};
