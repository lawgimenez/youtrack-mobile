import React from 'react';
import {Text} from 'react-native';

import {View as AnimatedView} from 'react-native-animatable';

import styles from './issues.styles';

import {i18nPlural} from 'components/i18n/i18n';
import {Skeleton} from 'components/skeleton/skeleton';


const IssuesCount = ({issuesCount}: { issuesCount: number | null }) => {
  return typeof issuesCount === 'number' ? (
    <AnimatedView
      testID="test:id/issuesCount"
      accessibilityLabel="issuesCount"
      accessible={true}
      useNativeDriver
      duration={500}
      animation="fadeIn"
      style={styles.toolbarAction}
    >
      <Text numberOfLines={2} style={styles.toolbarText}>
        {i18nPlural(
          issuesCount,
          'Matches {{issuesCount}} issue',
          'Matches {{issuesCount}} issues',
          {
            issuesCount,
          },
        )}
      </Text>
    </AnimatedView>
  ) : <Skeleton width={40} height={12} speed={3000} shimmerWidth={150}/>;
};


export default IssuesCount;
