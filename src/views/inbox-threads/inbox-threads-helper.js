/* @flow */

import InboxThreadItemSubscription from './inbox-threads__subscription';
import InboxThreadMention from './inbox-threads__mention';
import InboxThreadReaction from './inbox-threads__reactions';
import {isActivityCategory} from 'components/activity/activity__category';

import type {Activity} from 'flow/Activity';
import type {InboxThread, InboxThreadMessage, ThreadData} from 'flow/Inbox';

function getTypes(activity: Activity): { [string]: boolean } {
  return {
    attach: isActivityCategory.attachment(activity),
    comment: isActivityCategory.comment(activity),
    commentText: isActivityCategory.commentText(activity),
    link: isActivityCategory.link(activity),
    tag: isActivityCategory.tag(activity),
    summary: isActivityCategory.summary(activity),
    description: isActivityCategory.description(activity),
    sprint: isActivityCategory.sprint(activity),
    date: isActivityCategory.date(activity),
    project: isActivityCategory.project(activity),
    customField: isActivityCategory.customField(activity),
    work: isActivityCategory.work(activity),
    visibility: isActivityCategory.visibility(activity),
    voter: isActivityCategory.voters(activity),
    totalVotes: isActivityCategory.totalVotes(activity),
    issueCreated: isActivityCategory.issueCreated(activity),
    articleCreated: isActivityCategory.articleCreated(activity),
    star: isActivityCategory.star(activity),
  };
}


function createMessagesMap(messages: InboxThreadMessage[] = []): ?{ [string]: Activity } {
  if (!messages.length) {
    return null;
  }
  const map: { [string]: Object } = {};
  messages.forEach(message => {
    message.activities && message.activities.forEach(activity => {
      map[activity.id] = message;
    });
  });
  return map;
}

function sortEvents(events: Activity[]): Activity[] {
  let projectEvent: ?Activity;
  let i;
  for (i = 0; i < events.length; i++) {
    if (getTypes(events[i]).project) {
      projectEvent = events[i];
      break;
    }
  }

  if (!projectEvent) {
    return events;
  }

  const sortedEvents = [events[i]];
  return sortedEvents.concat(events.slice(0, i)).concat(events.slice(i + 1, events.length));
}

function getThreadData(thread: InboxThread): ThreadData {
  let threadData: ThreadData = {entity: null, component: null};
  const activity: Activity = thread.messages[0].activities[0];
  if (thread.id) {
    const target = thread.subject.target;
    switch (thread.id[0]) {
    case 'R':
      threadData = {
        entity: target?.issue || target?.article,
        component: InboxThreadReaction,
      };
      break;
    case 'M':
      if (isActivityCategory.commentMention(activity)) {
        threadData.entity = activity?.comment?.issue;
      } else if (isActivityCategory.issueMention(activity)) {
        threadData.entity = activity?.issue;
      } else if (isActivityCategory.articleCommentMention(activity)) {
        threadData.entity = activity?.comment?.article;
      } else if (isActivityCategory.articleMention(activity)) {
        threadData.entity = activity?.article;
      }
      threadData.component = InboxThreadMention;
      break;
    case 'S':
      threadData = {
        entity: target,
        component: InboxThreadItemSubscription,
      };
    }
  }
  return threadData;
}

export {
  createMessagesMap,
  getThreadData,
  getTypes,
  sortEvents,
};