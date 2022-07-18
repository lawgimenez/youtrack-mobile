/* @flow */

import React from 'react';
import {View} from 'react-native';

import ReactionIcon from 'components/reactions/reaction-icon';
import StreamComment from 'components/activity-stream/activity__stream-comment';
import ThreadCommentReactions from './inbox-threads__item-comment-reactions';
import ThreadItem from './inbox-threads__item';
import {i18n} from 'components/i18n/i18n';

import stylesInbox from '../inbox/inbox.styles';

import type {Activity} from 'flow/Activity';
import type {InboxThread, ThreadEntity} from 'flow/Inbox';
import type {IssueComment} from 'flow/CustomFields';
import type {Reaction} from 'flow/Reaction';
import type {User} from 'flow/User';

interface Props {
  currentUser: User;
  onPress?: (entity: ThreadEntity, navigateToActivity?: boolean) => any;
  thread: InboxThread;
}

const InboxThreadReaction = ({thread, currentUser, onPress}: Props) => {
  const activity: Activity = thread.messages[0].activities[0];
  const reaction: Reaction = activity.added[0] || activity.removed[0];
  const comment: ?IssueComment = activity?.comment;
  const isRemoved: boolean = !!activity?.removed[0]?.reaction;
  const isAdded: boolean = !!activity?.added[0]?.reaction;

  return (
    <ThreadItem
      author={activity.author}
      avatar={
        <>
          <ReactionIcon name={reaction.reaction} size={24}/>
          {isRemoved && <View style={stylesInbox.reactionIconRemoved}/>}
        </>
      }
      change={!!comment && (
        <>
          <StreamComment
            activity={{
              ...activity,
              added: [comment],
            }}
          />
          <ThreadCommentReactions activity={activity} currentUser={currentUser}/>
        </>
      )}
      onPress={onPress}
      reason={isAdded && comment?.reactions?.length > 1
        ? comment?.reactions?.length === 1 ? i18n('added a reaction') : i18n('added reactions')
        : i18n('removed a reaction')}
      timestamp={thread.notified}
    />
  );
};

export default React.memo(InboxThreadReaction, (prev: Props, next: Props) => {
  return prev.thread === next.thread;
});
