/* @flow */

import React from 'react';

import YoutrackWiki from '../../components/wiki/youtrack-wiki';
import MarkdownView from '../../components/wiki/markdown-view';

import type {Attachment} from '../../flow/CustomFields';
import type {YouTrackWiki} from '../../flow/Wiki';
import type {UITheme} from '../../flow/Theme';

type Props = {
  youtrackWiki: YouTrackWiki,
  markdown?: string,
  attachments: Array<Attachment>,
  uiTheme: UITheme,
  onCheckboxUpdate: (checked: boolean, position: number) => void,
}

function IssueDescription(props: Props) {
  const {youtrackWiki, attachments, markdown, uiTheme, onCheckboxUpdate} = props;

  if (!youtrackWiki?.description && !markdown) {
    return null;
  }

  if (markdown) {
    return (
      <MarkdownView
        attachments={attachments}
        uiTheme={uiTheme}
        onCheckboxUpdate={(checked: boolean, position: number) => onCheckboxUpdate(checked, position)}
      >
        {markdown}
      </MarkdownView>
    );
  }

  return (
    <YoutrackWiki {
      ...Object.assign({uiTheme: uiTheme}, youtrackWiki, attachments)
    }>
      {youtrackWiki.description}
    </YoutrackWiki>
  );
}

export default React.memo<Props>(IssueDescription);
