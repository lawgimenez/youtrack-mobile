import EStyleSheet from 'react-native-extended-stylesheet';

import {UNIT} from 'components/variables/variables';
import {headerTitle, MAIN_FONT_SIZE, monospace} from 'components/common-styles/typography';


export default EStyleSheet.create({
  headerTitle: headerTitle,
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingLeft: UNIT,
  },
  plainText: {
    color: '$text',
    fontSize: MAIN_FONT_SIZE,
    ...monospace,
  },
  icon: {
    color: '$iconAccent',
  },
});
