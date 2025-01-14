import {Platform} from 'react-native';
import EStyleSheet from 'react-native-extended-stylesheet';
import {UNIT} from 'components/variables';
import {
  MAIN_FONT_SIZE,
  mainText,
  monospace,
  SECONDARY_FONT_SIZE,
} from 'components/common-styles/typography';

const showMoreLink = {
  color: '$link',
};
export default EStyleSheet.create({
  codeToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: UNIT,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: '$boxBackground',
    borderTopLeftRadius: UNIT,
    borderTopRightRadius: UNIT,
  },
  codeToolbarButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeToolbarButton: {
    marginLeft: UNIT,
    padding: UNIT,
  },
  codeToolbarIcon: {
    color: '$iconAccent',
  },
  codeToolbarText: {
    color: '$text',
  },
  htmlView: {
    color: '$text',
    textAlign: 'left',
    writingDirection: 'ltr',
    ...Platform.select({
      android: {
        borderBottomWidth: UNIT,
        borderColor: 'transparent',
      },
      ios: {
        fontSize: MAIN_FONT_SIZE,
      },
    }),
  },
  lineSpace: {
    lineHeight: 30,
  },
  monospace,
  deleted: {
    textDecorationLine: 'line-through',
  },
  unspaced: {
    margin: 0,
  },
  link: {
    color: '$link',
  },
  text: {
    color: '$link',
  },
  showMoreLink: {
    ...showMoreLink,
    lineHeight: SECONDARY_FONT_SIZE * 2,

  },
  exceptionLink: showMoreLink,
  codeContainer: {
    marginVertical: UNIT,
  },
  codeScrollContainer: {
    padding: UNIT,
    paddingRight: 0,
    backgroundColor: '$boxBackground',
    borderBottomLeftRadius: UNIT,
    borderBottomRightRadius: UNIT,
    minHeight: UNIT * 7,
  },
  codeScrollContent: {
    paddingLeft: UNIT / 2,
    paddingRight: UNIT * 1.5,
    alignItems: 'center',
  },
  code: {...monospace, fontWeight: '500'},
  codeLanguage: {
    color: '$textSecondary',
  },
  inlineCode: {
    ...monospace,
    backgroundColor: '$boxBackground',
    color: '$text',
  },
  exception: {
    ...monospace,
    padding: 0,
    color: '$text',
    lineHeight: mainText.lineHeight,
  },
  checkboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  checkboxIconContainer: {
    position: 'absolute',
    left: -28,
    backgroundColor: '$background',
  },
  checkboxIcon: {
    color: '$link',
  },
  checkboxIconBlank: {
    color: '$icon',
  },
  checkboxTextGroup: {
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '80%',
  },
  video: {
    width: 315,
    height: 240,
    alignSelf: 'stretch',
  },
});
export const htmlViewStyles = EStyleSheet.create({
  a: {
    color: '$link',
    textDecorationLine: 'underline',
  },
});
