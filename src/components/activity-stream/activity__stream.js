/* @flow */

import React, {useCallback, useRef} from 'react';
import {Animated, Text, TouchableOpacity, ScrollView, View, useWindowDimensions} from 'react-native';

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
import {isIOSPlatform} from 'util/util';
import {HIT_SLOP} from 'components/common-styles/button';
import {i18n} from 'components/i18n/i18n';
import {IconDrag, IconMoreOptions} from 'components/icon/icon';

import styles from './activity__stream.styles';

import type {
  ActivityGroup,
  ActivityItem,
  ActivityStreamCommentActions,
} from 'flow/Activity';
import type {Attachment, IssueComment} from 'flow/CustomFields';
import type {CustomError} from 'flow/Error';
import type {Node} from 'react';
import type {Reaction} from 'flow/Reaction';
import type {UITheme} from 'flow/Theme';
import type {User} from 'flow/User';
import type {WorkItem, WorkTimeSettings} from 'flow/Work';
import type {YouTrackWiki} from 'flow/Wiki';
import {menuHeight} from '../common-styles/header';


type Props = {
  activities: Array<ActivityGroup> | null,
  attachments: Array<Attachment>,
  commentActions?: ActivityStreamCommentActions,
  currentUser: User,
  issueFields?: Array<Object>,
  onReactionSelect: (
    issueId: string,
    comment: IssueComment,
    reaction: Reaction,
    activities: Array<ActivityItem>,
    onReactionUpdate: (activities: Array<ActivityItem>, error?: CustomError) => void
  ) => any,
  uiTheme: UITheme,
  workTimeSettings: ?WorkTimeSettings,
  youtrackWiki: YouTrackWiki,
  onWorkDelete?: (workItem: WorkItem) => any,
  onWorkUpdate?: (workItem?: WorkItem) => void,
  onWorkEdit?: (workItem: WorkItem) => void,
  onCheckboxUpdate?: (checked: boolean, position: number, comment: IssueComment) => Function,
  renderHeader?: () => any,
  refreshControl: () => any,
  highlight?: { activityId: string, commentId?: string },
};

export type ActivityStreamPropsReaction = {
  onReactionPanelOpen?: (comment: IssueComment) => void,
  onSelectReaction?: (comment: IssueComment, reaction: Reaction) => void
}

export type ActivityStreamProps = {
  ...Props,
  ...ActivityStreamPropsReaction,
}

export const ActivityStream = (props: ActivityStreamProps): Node => {
  const window = useWindowDimensions();

  const {headerRenderer: renderHeader = () => null, activities, highlight} = props;

  const scrollRef = useRef(null);
  const bgColor = useRef(new Animated.Value(0));
  const color = useRef(bgColor.current.interpolate({
    inputRange: [0, 300],
    outputRange: [styles.activityHighlighted.backgroundColor, 'transparent'],
  }));

  const getTargetActivityId = useCallback(() => {
    return typeof highlight === 'object' ? highlight.activityId : highlight;
  }, [highlight]);

  const getTargetActivityCommentId = useCallback(() => {
    return typeof highlight === 'object' ? highlight?.commentId : null;
  }, [highlight]);

  const navigateToActivity = useCallback((id: string, layout: { y: number, height: number}, commentId?: string) => {
    const _activityId = getTargetActivityId();
    if ((_activityId && id && id === _activityId || (commentId && commentId === getTargetActivityCommentId())) && activities?.length && scrollRef?.current?.scrollTo) {
      if ((layout.y + layout.height) > (window.height - menuHeight * 5)) {
        scrollRef.current.scrollTo({y: layout.y, animated: true});
      }
      Animated.timing(bgColor.current, {
        toValue: 300,
        duration: 3000,
        useNativeDriver: false,
      }).start();
    }
  }, [activities?.length, getTargetActivityCommentId, getTargetActivityId, window.height]);

  const getCommentFromActivityGroup = (activityGroup: ActivityGroup): IssueComment | null => (
    firstActivityChange(activityGroup.comment)
  );

  const onShowCommentActions = (activityGroup: ActivityGroup, comment: IssueComment): void => {
    if (props.commentActions?.onShowCommentActions) {
      props.commentActions.onShowCommentActions(comment, activityGroup.comment?.id);
    }
  };

  const renderCommentActions = (activityGroup: ActivityGroup) => {
    const comment: IssueComment | null = getCommentFromActivityGroup(activityGroup);
    if (!comment) {
      return null;
    }

    const commentActions = props.commentActions;
    const isAuthor = commentActions && commentActions.isAuthor && commentActions.isAuthor(comment);

    const canComment: boolean = !!commentActions?.canCommentOn;
    const canUpdate: boolean = !!commentActions && !!commentActions.canUpdateComment && commentActions.canUpdateComment(
      comment);

    if (!comment.deleted) {
      // $FlowFixMe
      const reactionAddIcon: string = <ReactionAddIcon style={styles.activityCommentActionsAddReaction}/>;
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
                }}>
                <Text style={styles.link}>
                  Reply
                </Text>
              </TouchableOpacity>
            )}
            {canUpdate && isAuthor && (
              <TouchableOpacity
                hitSlop={HIT_SLOP}
                onPress={() => {
                  if (commentActions && commentActions.onStartEditing) {
                    commentActions.onStartEditing(comment);
                  }
                }}>
                <Text style={styles.link}>
                  {i18n('Edit')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!!props.onReactionPanelOpen && <Feature version={FEATURE_VERSION.reactions}>
            <TouchableOpacity
              hitSlop={HIT_SLOP}
              onPress={() => {if (props.onReactionPanelOpen) {props.onReactionPanelOpen(comment);}}}
            >
              {reactionAddIcon}
            </TouchableOpacity>
          </Feature>}

          {Boolean(commentActions && commentActions.onShowCommentActions) && <TouchableOpacity
            hitSlop={HIT_SLOP}
            onPress={() => onShowCommentActions(activityGroup, comment)}>
            {isIOSPlatform()
              ? <IconMoreOptions size={18} color={styles.activityCommentActionsOther.color}/>
              : <IconDrag size={18} color={styles.activityCommentActionsOther.color}/>}
          </TouchableOpacity>}
        </View>
      );
    }
  };

  const renderCommentActivityReactions = (activityGroup: Object) => {
    const comment: IssueComment | null = getCommentFromActivityGroup(activityGroup);
    if (!comment || comment.deleted) {
      return null;
    }
    return <CommentReactions
      style={styles.commentReactions}
      comment={comment}
      currentUser={props.currentUser}
      onReactionSelect={props.onSelectReaction}
    />;
  };

  const renderCommentActivity = (activityGroup: Object) => {
    const activity: ?Activity = activityGroup.comment;
    const commentAttachments = (firstActivityChange(activity) || {}).attachmets || [];
    const allAttachments: Array<Attachment> = ApiHelper.convertAttachmentRelativeToAbsURLs(
      commentAttachments,
      props.youtrackWiki.backendUrl
    ).concat(props.attachments || []);

    return <>
      {activityGroup.merged
        ? <StreamTimestamp timestamp={activityGroup.timestamp} style={styles.activityCommentDate}/>
        : <StreamUserInfo activityGroup={activityGroup}/>}
      <StreamComment
        activity={activity}
        attachments={allAttachments}
        commentActions={props.commentActions}
        onShowCommentActions={(comment: IssueComment) => {
          if (props.commentActions?.onShowCommentActions) {
            props.commentActions.onShowCommentActions(comment, activity.id);
          }
        }}
        youtrackWiki={props.youtrackWiki}
      />
    </>;

  };

  const renderActivity = (activityGroup: ActivityGroup, index: number) => {
    if (activityGroup.hidden) {
      return null;
    }

    const isRelatedChange: boolean = Boolean(activityGroup?.comment || activityGroup?.work || activityGroup?.vcs);
    let renderedItem: any = null;
    switch (true) {
    case !!activityGroup.comment:
      renderedItem = renderCommentActivity(activityGroup);
      break;
    case !!activityGroup.work:
      renderedItem = <StreamWork
        activityGroup={activityGroup}
        onDelete={props.onWorkDelete}
        onUpdate={props.onWorkUpdate}
        onEdit={props.onWorkEdit}
      />;
      break;
    case !!activityGroup.vcs:
      renderedItem = <StreamVCS activityGroup={activityGroup}/>;
    }

    const id: string = activityGroup?.comment?.id || activityGroup?.work?.id || activityGroup?.vcs?.id;
    const comment: ?IssueComment = getCommentFromActivityGroup(activityGroup);
    const commentId = getTargetActivityCommentId();
    const activityChange = firstActivityChange(activityGroup.comment);

    const targetActivityId = getTargetActivityId();
    const hasHighlightedActivity: boolean = (
      targetActivityId && id && id === targetActivityId ||
      targetActivityId && (activityGroup?.events || []).some(it => it.id === targetActivityId) ||
      commentId && activityChange && commentId === activityChange.id
    );
    const Component = hasHighlightedActivity ? Animated.View : View;

    return (
      <View
        key={`${index}-${activityGroup.id}`}
        onLayout={(event) => navigateToActivity(id, event.nativeEvent.layout, comment?.id)}
      >
        {index > 0 && !activityGroup.merged && <View style={styles.activitySeparator}/>}

        <Component style={[
          styles.activity,
          activityGroup.merged && !activityGroup.comment ? styles.activityMerged : null,
          hasHighlightedActivity && {backgroundColor: color.current},
        ]}>

          <ActivityUserAvatar
            activityGroup={activityGroup}
            showAvatar={!!activityGroup.comment}
          />

          <View style={styles.activityItem}>
            {renderedItem}
            {activityGroup?.events?.length > 0 && (
              <View style={isRelatedChange ? styles.activityRelatedChanges : styles.activityHistoryChanges}>
                {Boolean(!activityGroup.merged && !isRelatedChange) && <StreamUserInfo activityGroup={activityGroup}/>}
                {activityGroup.merged && <StreamTimestamp timestamp={activityGroup.timestamp}/>}

                {activityGroup.events.map(
                  (event) => (
                    <StreamHistoryChange
                      key={event.id}
                      activity={event}
                      workTimeSettings={props.workTimeSettings}/>
                  )
                )}
              </View>
            )}

            {!!activityGroup.comment && <>
              {!!props.onSelectReaction && renderCommentActivityReactions(activityGroup)}
              {renderCommentActions(activityGroup)}
            </>}
          </View>
        </Component>
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
    >
      {renderHeader()}
      {(props.activities || []).map(renderActivity)}
      {props.activities?.length === 0 && <Text style={styles.activityNoActivity}>{i18n('No activity yet')}</Text>
      }
    </ScrollView>
  );
};
