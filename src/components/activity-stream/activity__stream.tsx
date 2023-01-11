import React, {MutableRefObject, useCallback, useLayoutEffect, useRef} from 'react';
import {
  Animated, LayoutRectangle,
  NativeScrollEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import ActivityUserAvatar from './activity__stream-avatar';
import ApiHelper from '../api/api__helper';
import CommentReactions from 'components/comment/comment-reactions';
import Feature, {FEATURE_VERSION} from '../feature/feature';
import ReactionAddIcon from 'components/reactions/new-reaction.svg';
import StreamComment from './activity__stream-comment';
import StreamHistoryChange from './activity__stream-history';
import StreamTimestamp from './activity__stream-timestamp';
import StreamUserInfo from './activity__stream-user-info';
import StreamVCS from './activity__stream-vcs';
import StreamWork from './activity__stream-work';
import {firstActivityChange} from './activity__stream-helper';
import {hasType} from '../api/api__resource-types';
import {HIT_SLOP} from 'components/common-styles/button';
import {i18n} from 'components/i18n/i18n';
import {IconDrag, IconMoreOptions} from 'components/icon/icon';
import {isIOSPlatform} from 'util/util';
import {menuHeight} from '../common-styles/header';

import styles from './activity__stream.styles';

import type {ActivityGroup, ActivityItem, ActivityStreamCommentActions} from 'types/Activity';
import {Activity} from 'types/Activity';
import type {Attachment, IssueComment} from 'types/CustomFields';
import type {CustomError} from 'types/Error';
import type {Reaction} from 'types/Reaction';
import type {UITheme} from 'types/Theme';
import type {User} from 'types/User';
import type {WorkItem, WorkTimeSettings} from 'types/Work';
import type {YouTrackWiki} from 'types/Wiki';

type Props = {
  activities: ActivityGroup[] | null;
  attachments: Attachment[];
  commentActions?: ActivityStreamCommentActions;
  currentUser: User;
  issueFields?: Array<Record<string, any>>;
  onReactionSelect: (
    issueId: string,
    comment: IssueComment,
    reaction: Reaction,
    activities: ActivityItem[],
    onReactionUpdate: (
      activities: ActivityItem[],
      error?: CustomError,
    ) => void,
  ) => any;
  uiTheme: UITheme;
  workTimeSettings: WorkTimeSettings | null | undefined;
  youtrackWiki: YouTrackWiki;
  onWorkDelete?: (workItem: WorkItem) => any;
  onWorkUpdate?: (workItem?: WorkItem) => void;
  onWorkEdit?: (workItem: WorkItem) => void;
  onCheckboxUpdate?: (
    checked: boolean,
    position: number,
    comment: IssueComment,
  ) => (...args: any[]) => any;
  renderHeader?: () => any;
  refreshControl: () => any;
  highlight?: {
    activityId: string;
    commentId?: string;
  };
};
export type ActivityStreamPropsReaction = {
  onReactionPanelOpen?: (comment: IssueComment) => void;
  onSelectReaction?: (comment: IssueComment, reaction: Reaction) => void;
};
export type ActivityStreamProps = Props & ActivityStreamPropsReaction;

export const ActivityStream: React.FC<ActivityStreamProps> = (props: ActivityStreamProps) => {
  const window = useWindowDimensions();
  const {
    renderHeader = () => null,
    activities,
    highlight,
  } = props;

  const onScroll = ({nativeEvent}: { nativeEvent: NativeScrollEvent }) =>
    (scrollOffset.current = nativeEvent.contentOffset.y);

  const scrollRef: MutableRefObject<ScrollView | null> = useRef(null);
  const scrollOffset: MutableRefObject<number> = useRef(0);
  const bgColor = useRef(new Animated.Value(0));
  const color = useRef(
    bgColor.current.interpolate({
      inputRange: [0, 300],
      outputRange: [styles.activityHighlighted.backgroundColor, 'transparent'],
    }),
  );
  const layoutMap: MutableRefObject<{ [key: string]: LayoutRectangle | undefined}> = useRef({});
  const scrollToActivity = useCallback(
    (layout: LayoutRectangle) => {
      if (
        scrollRef.current?.scrollTo &&
        (layout.y < scrollOffset.current ||
          layout.y > window.height ||
          layout.y + layout.height > window.height - menuHeight * 5)
      ) {
        scrollRef.current.scrollTo({
          y: layout.y,
          animated: true,
        });
      }
    },
    [window.height],
  );
  useLayoutEffect(() => {
    bgColor.current.setValue(0);
    Animated.timing(bgColor.current, {
      toValue: 300,
      duration: 3000,
      useNativeDriver: false,
    }).start();
  }, [highlight]);
  useLayoutEffect(() => {
    setTimeout(() => {
      const layout: LayoutRectangle | undefined = layoutMap.current[highlight!.commentId || highlight!.activityId];
      if (layout) {
        scrollToActivity(layout);
      }
    }, 100);
  }, [highlight, scrollToActivity]);

  const getCommentFromActivityGroup = (activityGroup: ActivityGroup): IssueComment | null => (
    firstActivityChange(activityGroup.comment) as IssueComment
  );

  const onShowCommentActions = (
    activityGroup: ActivityGroup,
    comment: IssueComment,
  ): void => {
    if (props.commentActions?.onShowCommentActions) {
      props.commentActions.onShowCommentActions(
        comment,
        activityGroup?.comment?.id as string,
      );
    }
  };

  const renderCommentActions = (activityGroup: ActivityGroup) => {
    const comment: ActivityItem | null = getCommentFromActivityGroup(activityGroup);

    if (!comment) {
      return null;
    }

    const commentActions = props.commentActions;
    const isAuthor =
      commentActions &&
      commentActions.isAuthor &&
      commentActions.isAuthor(comment);
    const canComment: boolean = !!commentActions?.canCommentOn;
    const canUpdate: boolean =
      !!commentActions &&
      !!commentActions.canUpdateComment &&
      commentActions.canUpdateComment(comment);
    const reactionSupportVersion: string = hasType.articleComment(comment)
      ? FEATURE_VERSION.articleReactions
      : FEATURE_VERSION.reactions;

    if (!comment.deleted) {
      const reactionAddIcon: React.ReactNode = <ReactionAddIcon style={styles.activityCommentActionsAddReaction}/>;
      return (
        <View style={styles.activityCommentActions}>
          <View style={styles.activityCommentActionsMain}>
            {canComment && !isAuthor && (
              <TouchableOpacity
                hitSlop={HIT_SLOP}
                onPress={() => {
                  if (commentActions && commentActions.onReply) {
                    commentActions.onReply(comment);
                  }
                }}
              >
                <Text style={styles.link}>Reply</Text>
              </TouchableOpacity>
            )}
            {canUpdate && isAuthor && (
              <TouchableOpacity
                hitSlop={HIT_SLOP}
                onPress={() => {
                  if (commentActions && commentActions.onStartEditing) {
                    commentActions.onStartEditing(comment);
                  }
                }}
              >
                <Text style={styles.link}>{i18n('Edit')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {typeof props.onReactionPanelOpen === 'function' && (
            <Feature version={reactionSupportVersion}>
              <TouchableOpacity
                hitSlop={HIT_SLOP}
                onPress={() => {
                  props?.onReactionPanelOpen?.(comment);
                }}
              >
                {reactionAddIcon}
              </TouchableOpacity>
            </Feature>
          )}

          {Boolean(commentActions && commentActions.onShowCommentActions) && (
            <TouchableOpacity
              hitSlop={HIT_SLOP}
              onPress={() => onShowCommentActions(activityGroup, comment)}
            >
              {isIOSPlatform() ? (
                <IconMoreOptions
                  size={18}
                  color={styles.activityCommentActionsOther.color}
                />
              ) : (
                <IconDrag
                  size={18}
                  color={styles.activityCommentActionsOther.color}
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      );
    }
  };

  const renderCommentActivityReactions = (activityGroup: ActivityGroup): React.ReactNode => {
    const comment: IssueComment | null = getCommentFromActivityGroup(activityGroup);
    return comment && !comment.deleted ? (
      <CommentReactions
        style={styles.commentReactions}
        comment={comment}
        currentUser={props.currentUser}
        onReactionSelect={props.onSelectReaction}
      />
    ) : null;
  };

  const renderCommentActivity = (activityGroup: ActivityGroup) => {
    const activity: Activity = activityGroup.comment as Activity;

    const _attachments: Attachment[] =
      props.attachments || (firstActivityChange(activity) as IssueComment)?.attachments || [];

    const attachments: Attachment[] = ApiHelper.convertAttachmentRelativeToAbsURLs(
      _attachments,
      props.youtrackWiki.backendUrl,
    );
    return (
      <>
        {activityGroup.merged ? (
          <StreamTimestamp
            timestamp={activityGroup.timestamp}
            style={styles.activityCommentDate}
          />
        ) : (
          <StreamUserInfo activityGroup={activityGroup}/>
        )}
        <StreamComment
          activity={activity}
          attachments={attachments}
          commentActions={props.commentActions}
          onShowCommentActions={(comment: IssueComment) => {
            if (props.commentActions?.onShowCommentActions) {
              props.commentActions.onShowCommentActions(comment, activity.id as string);
            }
          }}
          youtrackWiki={props.youtrackWiki}
        />
      </>
    );
  };

  const getActivityGroupEvents = (activityGroup: ActivityGroup) => activityGroup?.events || [];

  const getActivityGroupId = (activityGroup: ActivityGroup) => (
    activityGroup?.comment?.id ||
    activityGroup?.work?.id ||
    activityGroup?.vcs?.id ||
    getActivityGroupEvents(activityGroup)[0]?.id
  );

  const doRenderActivity = (activityGroup: ActivityGroup) => {
    const isRelatedChange: boolean = Boolean(
      activityGroup?.comment || activityGroup?.work || activityGroup?.vcs,
    );
    let renderedItem: any = null;

    switch (true) {
      case !!activityGroup.comment:
        renderedItem = renderCommentActivity(activityGroup);
        break;

      case !!activityGroup.work:
        renderedItem = (
          <StreamWork
            activityGroup={activityGroup}
            onDelete={props.onWorkDelete}
            onUpdate={props.onWorkUpdate}
            onEdit={props.onWorkEdit}
          />
        );
        break;

      case !!activityGroup.vcs:
        renderedItem = <StreamVCS activityGroup={activityGroup}/>;
    }

    const targetActivityId: string | null | undefined = highlight?.commentId || highlight?.activityId;

    const _comment:
      | IssueComment
      | null
      | undefined = getCommentFromActivityGroup(activityGroup);

    const activityGroupEvents: Activity[] = getActivityGroupEvents(activityGroup);
    const hasHighlightedActivity: boolean = (
      !!targetActivityId && (getActivityGroupId(activityGroup) === targetActivityId ||
        activityGroupEvents.some(it => it.id === targetActivityId) ||
        (!!_comment && _comment.id === highlight?.commentId))
    );

    const Component = hasHighlightedActivity ? Animated.View : View;
    return (
      <View
        style={[
          styles.activity,
          activityGroup.merged && !activityGroup.comment
            ? styles.activityMerged
            : null,
        ]}
      >
        <ActivityUserAvatar
          activityGroup={activityGroup}
          showAvatar={!!activityGroup.comment}
        />

        <Component
          style={[
            styles.activityItem,
            hasHighlightedActivity && {
              backgroundColor: color.current,
            },
          ]}
        >
          {renderedItem}
          {activityGroupEvents.length > 0 && (
            <View
              style={
                isRelatedChange
                  ? styles.activityRelatedChanges
                  : styles.activityHistoryChanges
              }
            >
              {Boolean(!activityGroup.merged && !isRelatedChange) && (
                <StreamUserInfo activityGroup={activityGroup}/>
              )}
              {activityGroup.merged && (
                <StreamTimestamp
                  isAbs={true}
                  timestamp={activityGroup.timestamp}
                />
              )}

              {activityGroupEvents.map(event => (
                <StreamHistoryChange
                  key={event.id}
                  activity={event}
                  workTimeSettings={props.workTimeSettings}
                />
              ))}
            </View>
          )}

          {!!activityGroup.comment && (
            <>
              {!!props.onSelectReaction && renderCommentActivityReactions(activityGroup)}
              {renderCommentActions(activityGroup)}
            </>
          )}
        </Component>
      </View>
    );
  };

  const renderActivityGroup = (activityGroup: ActivityGroup, index: number) => {
    if (activityGroup.hidden) {
      return null;
    }
    const _comment: | IssueComment | null | undefined = getCommentFromActivityGroup(activityGroup);
    return (
      <View
        key={`${index}-${activityGroup.id}`}
        onLayout={event => {
          if (activities?.length) {
            layoutMap.current[getActivityGroupId(activityGroup)] = event.nativeEvent.layout;

            if (_comment?.id) {
              layoutMap.current[_comment.id] = event.nativeEvent.layout;
            }

            getActivityGroupEvents(activityGroup).forEach(
              (it: Activity) =>
                (layoutMap.current[it.id] = event.nativeEvent.layout),
            );
          }
        }}
      >
        {index > 0 && !activityGroup.merged && (
          <View style={styles.activitySeparator}/>
        )}
        {doRenderActivity(activityGroup)}
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.activityStream}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      refreshControl={props.refreshControl()}
      ref={instance => instance != null && (scrollRef.current = instance)}
      onScroll={onScroll}
    >
      {renderHeader()}
      {(activities || []).map(renderActivityGroup)}
      {activities?.length === 0 && (
        <Text style={styles.activityNoActivity}>{i18n('No activity yet')}</Text>
      )}
    </ScrollView>
  );
};