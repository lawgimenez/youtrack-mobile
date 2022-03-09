/* @flow */

import React from 'react';

import Markdown from 'react-native-markdown-display';

import MarkdownItInstance from './markdown-instance';
import markdownStyles from './markdown-view-styles';

import type {MarkdownNode} from 'flow/Markdown';
import type {TextStyle} from 'react-native';
import type {UITheme} from 'flow/Theme';


type Props = {
  ast: Array<MarkdownNode>,
  rules: Object,
  uiTheme: UITheme,
  textStyle?: TextStyle,
};

const MarkdownAST = (props: Props) => {
  const {ast, rules, uiTheme} = props;
  return (
    <Markdown
      style={markdownStyles(uiTheme, props.textStyle)}
      markdownit={MarkdownItInstance}
      rules={rules}
    >
      {ast}
    </Markdown>
  );
};

export default (React.memo<Props>(
  MarkdownAST,
  (prevProps: Props, nextProps: Props) => prevProps.ast === nextProps.ast
): React$AbstractComponent<Props, mixed>);
