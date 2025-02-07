import EStyleSheet from 'react-native-extended-stylesheet';
import {UNIT} from 'components/variables';
import {HEADER_FONT_SIZE, MAIN_FONT_SIZE, secondaryText} from 'components/common-styles/typography';
import {title} from '../common-styles/issue';
export const styles = EStyleSheet.create({
  errorContainer: {
    padding: UNIT * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    marginTop: UNIT * 1.5,
    ...title,
    color: '$text',
  },
  errorDescription: {
    padding: UNIT * 4,
    paddingTop: UNIT * 2,
    ...secondaryText,
    color: '$icon',
    lineHeight: HEADER_FONT_SIZE,
    textAlign: 'center',
  },
  tryAgainButton: {
    alignSelf: 'center',
    paddingTop: UNIT * 2,
  },
  tryAgainText: {
    fontSize: MAIN_FONT_SIZE + 2,
    color: '$link',
  },
});
