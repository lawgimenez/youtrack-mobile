import {StyleSheet} from 'react-native';
import {
  COLOR_FONT_GRAY,
  COLOR_PINK,
  COLOR_FONT_ON_BLACK,
  UNIT,
} from '../variables/variables';
import {mainText, secondaryText} from '../common-styles/issue';

const SELECTED_ALPHA_HEX = 20;

const sidePadding = {
  paddingLeft: UNIT,
  paddingRight: UNIT,
};

const font = {
  fontFamily: 'System'
};

export default StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingTop: UNIT * 2,
    flexDirection: 'column'
  },
  wrapperActive: {
    backgroundColor: `${COLOR_PINK}${SELECTED_ALPHA_HEX}`
  },
  valuesWrapper: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    ...sidePadding
  },
  keyWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    ...sidePadding
  },
  keyLockedIcon: {
    width: 9,
    height: 12,
    marginRight: UNIT / 2,
    marginTop: -1,
    resizeMode: 'contain',
    tintColor: '#66757e'
  },
  keyText: {
    marginBottom: UNIT / 2,
    ...secondaryText,
    ...font
  },
  valueText: {
    marginRight: 0,
    ...mainText,
    ...font,
    color: COLOR_PINK
  },
  valueTextActive: {
    color: COLOR_FONT_ON_BLACK,
  },
  valueTextDisabled: {
    color: COLOR_FONT_GRAY
  },
  colorMarker: {
    marginRight: UNIT
  }
});
